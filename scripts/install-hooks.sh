#!/usr/bin/env bash
# Point git at the tracked hooks and make the scripts executable.
# Run once after cloning:  sh scripts/install-hooks.sh
# (also wired into package.json "prepare", so `npm install` does it for you.)
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
chmod +x "$root"/scripts/githooks/* "$root"/scripts/scan-secrets.sh
git -C "$root" config core.hooksPath scripts/githooks
echo "Secret-scanning hooks installed (core.hooksPath -> scripts/githooks)."
