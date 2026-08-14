"""Phase 3: generation tables (resumes, resume_versions, outreach) + re-rank cols

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-14
"""
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as pg
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Phase 3.1: Stage 2 re-rank columns on match_scores -----------------
    op.add_column("match_scores", sa.Column("explanation", pg.JSONB(), nullable=True))
    op.add_column("match_scores", sa.Column("computed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("match_scores", sa.Column("feedback", sa.String(length=20), nullable=True))

    # --- Phase 3.2: Resume Studio + outreach ---------------------------------
    op.create_table(
        "resumes",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", pg.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(length=255), nullable=False, server_default="My Resume"),
        sa.Column("is_base", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("content", pg.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "resume_versions",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("resume_id", pg.UUID(as_uuid=True), sa.ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("application_id", pg.UUID(as_uuid=True), sa.ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("content", pg.JSONB(), nullable=True),
        sa.Column("file_key", sa.String(length=2048), nullable=True),
        sa.Column("generated_by_model", sa.String(length=100), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "outreach",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("application_id", pg.UUID(as_uuid=True), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("channel", sa.String(length=20), nullable=False, server_default="email"),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("outreach")
    op.drop_table("resume_versions")
    op.drop_table("resumes")
    op.drop_column("match_scores", "feedback")
    op.drop_column("match_scores", "computed_at")
    op.drop_column("match_scores", "explanation")