"""Resume PDF rendering — ReportLab Platypus layout for a clean one-page resume.

Pure Python, no system rendering dependencies (runs on Windows dev and the
Linux worker). Input is the structured ``resume_versions.content`` dict
(summary / skills / experience / education / projects). Nothing beyond that
content is ever rendered — the no-fabrication constraint carries through from
generation to print.
"""

from io import BytesIO
from typing import Any

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, Paragraph, SimpleDocTemplate, Spacer

_MARGIN = 0.9 * inch
_ACCENT = HexColor("#18A058")


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("resume-title", parent=base["Title"], fontSize=20, leading=24),
        "section": ParagraphStyle(
            "resume-section",
            parent=base["Heading2"],
            fontSize=12,
            leading=15,
            textColor=_ACCENT,
            spaceBefore=12,
            spaceAfter=4,
        ),
        "role": ParagraphStyle("resume-role", parent=base["Heading3"], fontSize=11, leading=14),
        "company": ParagraphStyle(
            "resume-company",
            parent=base["Heading3"],
            fontSize=11,
            leading=14,
            textColor=HexColor("#4B5563"),
        ),
        "dates": ParagraphStyle("resume-dates", parent=base["Normal"], fontSize=9, leading=12),
        "bullet": ParagraphStyle(
            "resume-bullet", parent=base["Normal"], fontSize=9.5, leading=13, leftIndent=8
        ),
        "meta": ParagraphStyle("resume-meta", parent=base["Normal"], fontSize=9.5, leading=13),
    }


def _section(title: str, story: list) -> None:
    story.append(Paragraph(title.upper(), _styles()["section"]))


def _bullets(items: list[str], story: list) -> None:
    if not items:
        return
    flow = ListFlowable(
        [Paragraph(item, _styles()["bullet"]) for item in items],
        bulletType="bullet",
        start="•",
        leftIndent=10,
    )
    story.append(flow)


def render_pdf(content: dict[str, Any] | None) -> bytes:
    content = content or {}
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=_MARGIN,
        rightMargin=_MARGIN,
        topMargin=0.8 * inch,
        bottomMargin=0.8 * inch,
        title="Resume",
        author="Scout",
    )
    s = _styles()
    story: list = []

    story.append(Paragraph("Resume", s["title"]))
    story.append(Spacer(1, 4))

    summary = (content.get("summary") or "").strip()
    if summary:
        story.append(Paragraph(summary, s["meta"]))

    skills = content.get("skills") or []
    if skills:
        _section("Skills", story)
        story.append(Paragraph(", ".join(str(x) for x in skills), s["meta"]))

    for exp in content.get("experience") or []:
        _section(str(exp.get("title") or "Experience"), story)
        company = exp.get("company") or ""
        dates = exp.get("dates") or ""
        if company:
            story.append(Paragraph(f"{company}", s["company"]))
        if dates:
            story.append(Paragraph(dates, s["dates"]))
        _bullets([str(b) for b in (exp.get("bullets") or [])], story)

    for edu in content.get("education") or []:
        if not edu:
            continue
        _section("Education", story)
        story.append(Paragraph(str(edu.get("school") or edu.get("degree") or edu), s["meta"]))

    projects = content.get("projects") or []
    if projects:
        _section("Projects", story)
        for project in projects:
            name = project.get("name") if isinstance(project, dict) else project
            story.append(Paragraph(str(name), s["company"]))
            _bullets(
                [str(b) for b in (project.get("bullets") or [])] if isinstance(project, dict) else [],
                story,
            )

    doc.build(story)
    return buf.getvalue()
