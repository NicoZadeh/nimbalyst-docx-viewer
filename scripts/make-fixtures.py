#!/usr/bin/env python3
"""Generate the .docx fixtures used by tests and manual smoke checks.

These are hand-crafted, minimal-but-valid OOXML packages. We build them
explicitly (rather than via python-docx) because v1 needs documents that
exercise specific surfaces: external hyperlinks with a dangerous scheme, a
comment, a tracked change, and a large embedded image. Regenerate with:

    python3 scripts/make-fixtures.py

Outputs (committed as binaries):
    test/fixtures/sample.docx   small doc with known sentinel text (unit tests)
    samples/demo.docx           friendly multi-paragraph doc (screenshots/manual)
    samples/demo-links.docx     https + javascript: links, a comment, a tracked change
    samples/demo-images.docx    one large embedded PNG (memory behavior check)
"""

import io
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

SECT_PR = (
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" '
    'w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'
)


def _esc(text):
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def para(text, style=None):
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return (
        f"<w:p>{ppr}<w:r><w:t xml:space=\"preserve\">{_esc(text)}</w:t></w:r></w:p>"
    )


def document_xml(body_inner):
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{W_NS}" xmlns:r="{R_NS}">'
        f"<w:body>{body_inner}{SECT_PR}</w:body></w:document>"
    )


def content_types(extra_overrides="", extra_defaults=""):
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        f"{extra_defaults}"
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        f"{extra_overrides}"
        "</Types>"
    )


ROOT_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    f'<Relationship Id="rId1" Type="{R_NS}/officeDocument" Target="word/document.xml"/>'
    "</Relationships>"
)


def doc_rels(inner=""):
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        f"{inner}</Relationships>"
    )


def write_docx(path, parts):
    abspath = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(abspath), exist_ok=True)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        # [Content_Types].xml first, by convention.
        for name in ["[Content_Types].xml"] + [k for k in parts if k != "[Content_Types].xml"]:
            data = parts[name]
            if isinstance(data, str):
                data = data.encode("utf-8")
            z.writestr(name, data)
    with open(abspath, "wb") as f:
        f.write(buf.getvalue())
    print(f"wrote {path} ({len(buf.getvalue())} bytes)")


# ---------------------------------------------------------------- sample.docx
SAMPLE_SENTINEL = "The quick brown fox jumps over the lazy dog."
sample_body = (
    para("Nimbalyst DOCX fixture", "Heading1")
    + para(SAMPLE_SENTINEL)
    + para("Second paragraph with extraction sentinel: PINEAPPLE-7281.")
)
write_docx(
    "test/fixtures/sample.docx",
    {
        "[Content_Types].xml": content_types(),
        "_rels/.rels": ROOT_RELS,
        "word/document.xml": document_xml(sample_body),
    },
)

# ------------------------------------------------------------------ demo.docx
demo_body = (
    para("Quarterly Update", "Heading1")
    + para(
        "This is a sample Word document rendered inside Nimbalyst by the DOCX "
        "Viewer extension. It demonstrates faithful rendering of headings, "
        "paragraphs, and inline formatting."
    )
    + para("Highlights", "Heading2")
    + para(
        "Continuous scrolling, zoom in and out, and fit-to-width are all "
        "supported. The document is read-only and never modified."
    )
    + para(
        "Ask the assistant to summarize this document to exercise the "
        "docx.get_text tool."
    )
)
write_docx(
    "samples/demo.docx",
    {
        "[Content_Types].xml": content_types(),
        "_rels/.rels": ROOT_RELS,
        "word/document.xml": document_xml(demo_body),
    },
)

# ------------------------------------------------------------ demo-links.docx
# https hyperlink (rId101), javascript: hyperlink (rId102), a comment on a
# run, and a tracked insertion + deletion.
HL = f"{R_NS}/hyperlink"
links_body = (
    para("Link & Review Safety Smoke Test", "Heading1")
    + (
        "<w:p><w:r><w:t xml:space=\"preserve\">Safe external link: </w:t></w:r>"
        '<w:hyperlink r:id="rId101">'
        '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>'
        "<w:t>Nimbalyst website (https)</w:t></w:r></w:hyperlink>"
        "<w:r><w:t xml:space=\"preserve\">.</w:t></w:r></w:p>"
    )
    + (
        "<w:p><w:r><w:t xml:space=\"preserve\">Dangerous link (must be neutralized): </w:t></w:r>"
        '<w:hyperlink r:id="rId102">'
        '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>'
        "<w:t>do not run this (javascript:)</w:t></w:r></w:hyperlink>"
        "<w:r><w:t xml:space=\"preserve\">.</w:t></w:r></w:p>"
    )
    + (
        "<w:p>"
        '<w:commentRangeStart w:id="0"/>'
        "<w:r><w:t xml:space=\"preserve\">This sentence has a reviewer comment attached.</w:t></w:r>"
        '<w:commentRangeEnd w:id="0"/>'
        '<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>'
        "</w:p>"
    )
    + (
        "<w:p><w:r><w:t xml:space=\"preserve\">Tracked changes: </w:t></w:r>"
        '<w:ins w:id="1" w:author="Reviewer" w:date="2024-01-01T00:00:00Z">'
        "<w:r><w:t xml:space=\"preserve\">this text was inserted</w:t></w:r></w:ins>"
        '<w:del w:id="2" w:author="Reviewer" w:date="2024-01-01T00:00:00Z">'
        "<w:r><w:delText xml:space=\"preserve\"> and this was deleted</w:delText></w:r></w:del>"
        "<w:r><w:t xml:space=\"preserve\">.</w:t></w:r></w:p>"
    )
)
comments_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<w:comments xmlns:w="{W_NS}">'
    '<w:comment w:id="0" w:author="Reviewer" w:date="2024-01-01T00:00:00Z" w:initials="R">'
    "<w:p><w:r><w:t>Reviewer comment: should NOT be rendered in v1.</w:t></w:r></w:p>"
    "</w:comment></w:comments>"
)
write_docx(
    "samples/demo-links.docx",
    {
        "[Content_Types].xml": content_types(
            extra_overrides=(
                '<Override PartName="/word/comments.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>'
            )
        ),
        "_rels/.rels": ROOT_RELS,
        "word/document.xml": document_xml(links_body),
        "word/comments.xml": comments_xml,
        "word/_rels/document.xml.rels": doc_rels(
            f'<Relationship Id="rId101" Type="{HL}" Target="https://nimbalyst.com/" TargetMode="External"/>'
            f'<Relationship Id="rId102" Type="{HL}" Target="javascript:alert(\'xss\')" TargetMode="External"/>'
            f'<Relationship Id="rId103" Type="{R_NS}/comments" Target="comments.xml"/>'
        ),
    },
)

# ----------------------------------------------------------- demo-images.docx
from PIL import Image  # noqa: E402

img = Image.effect_noise((1200, 1200), 64).convert("RGB")
img_io = io.BytesIO()
img.save(img_io, format="PNG")
png_bytes = img_io.getvalue()

A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
PIC_NS = "http://schemas.openxmlformats.org/drawingml/2006/picture"
WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
EMU = 5486400  # 6 inches

drawing = (
    "<w:p><w:r><w:drawing>"
    f'<wp:inline xmlns:wp="{WP_NS}" distT="0" distB="0" distL="0" distR="0">'
    f'<wp:extent cx="{EMU}" cy="{EMU}"/>'
    '<wp:docPr id="1" name="Picture 1"/>'
    f'<a:graphic xmlns:a="{A_NS}">'
    f'<a:graphicData uri="{PIC_NS}">'
    f'<pic:pic xmlns:pic="{PIC_NS}">'
    '<pic:nvPicPr><pic:cNvPr id="1" name="image1.png"/><pic:cNvPicPr/></pic:nvPicPr>'
    '<pic:blipFill><a:blip r:embed="rId200"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/>'
    f'<a:ext cx="{EMU}" cy="{EMU}"/></a:xfrm>'
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
    "</pic:pic></a:graphicData></a:graphic></wp:inline>"
    "</w:drawing></w:r></w:p>"
)
images_body = (
    para("Large Embedded Image", "Heading1")
    + para("This document embeds a large image to observe renderer memory behavior with useBase64URL.")
    + drawing
)
write_docx(
    "samples/demo-images.docx",
    {
        "[Content_Types].xml": content_types(
            extra_defaults='<Default Extension="png" ContentType="image/png"/>'
        ),
        "_rels/.rels": ROOT_RELS,
        "word/document.xml": document_xml(images_body),
        "word/media/image1.png": png_bytes,
        "word/_rels/document.xml.rels": doc_rels(
            f'<Relationship Id="rId200" Type="{R_NS}/image" Target="media/image1.png"/>'
        ),
    },
)

print("done")
