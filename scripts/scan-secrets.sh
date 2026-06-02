#!/usr/bin/env bash
#
# scan-secrets.sh — block secrets / confidential content from entering git.
#
# Runs as the pre-commit, commit-msg and pre-push hooks (see scripts/githooks/),
# and can be run by hand. It scans content against two pattern sets:
#
#   1. Generic, public-safe secret patterns defined below (API keys, tokens,
#      private keys, JWTs, secret-looking assignments).
#   2. A PRIVATE denylist read at runtime from a file OUTSIDE this repo, so the
#      confidential strings it matches (names, internal domains, figures) never
#      live in this public repository. Default location:
#        $HOME/.config/nimbalyst-docx-viewer/secrets-denylist.txt
#      Override with $DOCX_SCAN_DENYLIST. One extended-regex per line; '#'
#      starts a comment; matched case-insensitively. If the file is missing the
#      scan still runs with the generic patterns and prints a warning.
#
# Findings are reported REDACTED: only the location, line number and which rule
# fired are printed, never the matched text, so the scanner cannot itself leak.
#
# Modes:
#   --staged            scan the staged index (pre-commit). Default.
#   --commit-msg FILE   scan a commit message file (commit-msg).
#   --pre-push          scan commits being pushed, read refs on stdin (pre-push).
#   --history           scan every commit message and every blob in all history.
#   --all-files         scan every tracked file in the working tree.
#   --files F...        scan the given files.
#   --stdin             scan stdin (for testing).
#
# Exit status: 0 clean, 1 if anything matched (blocks the git operation).

set -uo pipefail

DENYLIST="${DOCX_SCAN_DENYLIST:-$HOME/.config/nimbalyst-docx-viewer/secrets-denylist.txt}"

# --- pattern table: NAME, FLAGS (i = case-insensitive), REGEX (POSIX ERE) -----
PAT_NAME=(); PAT_FLAG=(); PAT_RE=()
add_pat() { PAT_NAME+=("$1"); PAT_FLAG+=("$2"); PAT_RE+=("$3"); }

add_pat private-key       ""  '-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----'
add_pat aws-access-key    ""  '(A3T[A-Z0-9]|AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[A-Z0-9]{16}'
add_pat github-token      ""  'gh[pousr]_[A-Za-z0-9]{36,}'
add_pat github-pat        ""  'github_pat_[0-9a-zA-Z_]{22,}'
add_pat slack-token       ""  'xox[abprs]-[0-9A-Za-z-]{10,}'
add_pat google-api-key    ""  'AIza[0-9A-Za-z_-]{35}'
add_pat openai-key        ""  'sk-(proj-)?[A-Za-z0-9]{20,}'
add_pat anthropic-key     ""  'sk-ant-[A-Za-z0-9_-]{20,}'
add_pat jwt               ""  'eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.'
add_pat secret-assignment "i" '(api[_-]?key|secret|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd)[[:space:]]*[=:][[:space:]]*['"'"'"]?[A-Za-z0-9/+_.-]{12,}'

load_denylist() {
  if [[ -f "$DENYLIST" ]]; then
    local line
    while IFS= read -r line; do
      line="${line%%#*}"
      line="${line#"${line%%[![:space:]]*}"}"
      line="${line%"${line##*[![:space:]]}"}"
      [[ -z "$line" ]] && continue
      add_pat "denylist" "i" "$line"
    done < "$DENYLIST"
  else
    printf '  warning: private denylist not found at %s — running generic patterns only.\n' "$DENYLIST" >&2
  fi
}

REPORT="$(mktemp)"
trap 'rm -f "$REPORT"' EXIT

# scan_stream LABEL  — reads content on stdin, appends redacted findings to REPORT
scan_stream() {
  local label="$1" input i re name fl opt hits
  input="$(cat)"
  [[ -z "$input" ]] && return 0
  for i in "${!PAT_RE[@]}"; do
    re="${PAT_RE[$i]}"; name="${PAT_NAME[$i]}"; fl="${PAT_FLAG[$i]}"
    opt="-nE"; [[ "$fl" == *i* ]] && opt="-niE"
    hits="$(grep $opt -- "$re" <<<"$input" 2>/dev/null | cut -d: -f1 | tr '\n' ' ')"
    if [[ -n "${hits// /}" ]]; then
      printf '  ✖ %-22s rule=%-18s line(s): %s\n' "$label" "$name" "$hits" | tee -a "$REPORT" >&2
    fi
  done
}

scan_staged() {
  local f
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    git show ":$f" 2>/dev/null | scan_stream "$f"
  done < <(git diff --cached --name-only --diff-filter=ACM)
}

scan_files() {
  local f
  for f in "$@"; do
    [[ -f "$f" ]] || continue
    scan_stream "$f" < "$f"
  done
}

scan_all_files() {
  local f
  while IFS= read -r f; do
    scan_stream "$f" < "$f"
  done < <(git ls-files)
}

scan_history() {
  git log --all --format='commit %H%n%B' | scan_stream "commit-message"
  git rev-list --all --objects \
    | awk 'NF>=2 {print $1, substr($0, index($0,$2))}' \
    | sort -u -k1,1 \
    | while read -r sha path; do
        [[ "$(git cat-file -t "$sha" 2>/dev/null)" == "blob" ]] || continue
        git cat-file -p "$sha" 2>/dev/null | scan_stream "blob:$path"
      done
}

scan_pre_push() {
  local local_ref local_sha remote_ref remote_sha range
  local zero="0000000000000000000000000000000000000000"
  while read -r local_ref local_sha remote_ref remote_sha; do
    [[ "$local_sha" == "$zero" ]] && continue   # deleting a ref
    if [[ "$remote_sha" == "$zero" ]]; then
      range="$local_sha --not --remotes"
    else
      range="$remote_sha..$local_sha"
    fi
    local sha
    while IFS= read -r sha; do
      [[ -z "$sha" ]] && continue
      git show --format='commit %H%n%B' "$sha" 2>/dev/null | scan_stream "push:$sha"
    done < <(git rev-list $range 2>/dev/null)
  done
}

# --- main --------------------------------------------------------------------
load_denylist

mode="${1:---staged}"
case "$mode" in
  --staged)     scan_staged ;;
  --commit-msg) scan_stream "commit-msg" < "${2:?commit message file required}" ;;
  --pre-push)   scan_pre_push ;;
  --history)    scan_history ;;
  --all-files)  scan_all_files ;;
  --files)      shift; scan_files "$@" ;;
  --stdin)      scan_stream "stdin" ;;
  *) printf 'unknown mode: %s\n' "$mode" >&2; exit 2 ;;
esac

if [[ -s "$REPORT" ]]; then
  printf '\n  BLOCKED: potential secret/confidential content found (%s match line(s)).\n' "$(wc -l < "$REPORT" | tr -d ' ')" >&2
  printf '  Review the redacted hits above. If a true secret reached git, scrub it; do not --no-verify past this.\n' >&2
  exit 1
fi
exit 0
