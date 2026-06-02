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

# ----------------------------------------------------------- headings.docx
# Heading 1/2/3 styled paragraphs so mammoth's default style map yields h1-h3.
# Ships a styles.xml mapping styleId HeadingN -> name "heading n" (required).
headings_styles = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<w:styles xmlns:w="{W_NS}">'
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>'
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>'
    '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/></w:style>'
    "</w:styles>"
)
headings_body = (
    para("Introduction", "Heading1")
    + para("Some introductory text under the first heading.")
    + para("Background", "Heading2")
    + para("Background detail paragraph.")
    + para("Method", "Heading2")
    + para("Deep Dive", "Heading3")
    + para("Details under the deep dive subsection.")
)
write_docx(
    "test/fixtures/headings.docx",
    {
        "[Content_Types].xml": content_types(
            extra_overrides=(
                '<Override PartName="/word/styles.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            )
        ),
        "_rels/.rels": ROOT_RELS,
        "word/document.xml": document_xml(headings_body),
        "word/styles.xml": headings_styles,
        "word/_rels/document.xml.rels": doc_rels(
            f'<Relationship Id="rIdStyles" Type="{R_NS}/styles" Target="styles.xml"/>'
        ),
    },
)

# --------------------------------------------------------------- meta.docx
# Known docProps/core.xml + app.xml for the metadata extractor test.
CORE_NS = "http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
core_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<cp:coreProperties xmlns:cp="{CORE_NS}" '
    'xmlns:dc="http://purl.org/dc/elements/1.1/" '
    'xmlns:dcterms="http://purl.org/dc/terms/" '
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    "<dc:title>Quarterly Report</dc:title>"
    "<dc:creator>Nico Zadeh</dc:creator>"
    "<cp:lastModifiedBy>Nico Zadeh</cp:lastModifiedBy>"
    "<dc:subject>Finance</dc:subject>"
    "<cp:keywords>q3, finance, report</cp:keywords>"
    '<dcterms:created xsi:type="dcterms:W3CDTF">2024-01-15T10:00:00Z</dcterms:created>'
    '<dcterms:modified xsi:type="dcterms:W3CDTF">2024-02-20T14:30:00Z</dcterms:modified>'
    "</cp:coreProperties>"
)
app_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
    "<Application>Microsoft Office Word</Application>"
    "<Words>1234</Words><Characters>6789</Characters><Pages>5</Pages>"
    "</Properties>"
)
meta_rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    f'<Relationship Id="rId1" Type="{R_NS}/officeDocument" Target="word/document.xml"/>'
    f'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    f'<Relationship Id="rId3" Type="{R_NS}/extended-properties" Target="docProps/app.xml"/>'
    "</Relationships>"
)
write_docx(
    "test/fixtures/meta.docx",
    {
        "[Content_Types].xml": content_types(
            extra_overrides=(
                '<Override PartName="/docProps/core.xml" '
                'ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
                '<Override PartName="/docProps/app.xml" '
                'ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
            )
        ),
        "_rels/.rels": meta_rels,
        "word/document.xml": document_xml(
            para("Quarterly Report", "Heading1") + para("Body text for the metadata fixture.")
        ),
        "docProps/core.xml": core_xml,
        "docProps/app.xml": app_xml,
    },
)

print("done")
