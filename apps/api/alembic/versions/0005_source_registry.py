"""Phase 6: source_registry — compliance-tier config per source

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-15
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "source_registry",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_key", sa.String(length=40), nullable=False),
        sa.Column("compliance_tier", sa.String(length=20), nullable=False),
        sa.Column("source_status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("base_url", sa.String(length=2048), nullable=True),
        sa.Column("source_terms_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_key"),
    )
    op.create_index("ix_source_registry_source_key", "source_registry", ["source_key"])

    # Seed the tier table (ARCHITECTURE.md Data Sourcing & Compliance).
    # sync_company is hard-gated to direct_api/permitted_crawl; wellfound is
    # login-walled with anti-scraping terms, so it stays user_capture (no
    # server-side crawl) until a data agreement exists.
    registry = sa.table(
        "source_registry",
        sa.column("source_key", sa.String),
        sa.column("compliance_tier", sa.String),
        sa.column("source_status", sa.String),
        sa.column("base_url", sa.String),
        sa.column("source_terms_checked_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        registry,
        [
            {"source_key": "yc", "compliance_tier": "direct_api", "base_url": "https://www.ycombinator.com/"},
            {"source_key": "producthunt", "compliance_tier": "direct_api", "base_url": "https://www.producthunt.com/"},
            {"source_key": "greenhouse", "compliance_tier": "direct_api", "base_url": "https://boards.greenhouse.io/"},
            {"source_key": "lever", "compliance_tier": "direct_api", "base_url": "https://jobs.lever.co/"},
            {"source_key": "ashby", "compliance_tier": "direct_api", "base_url": "https://jobs.ashbyhq.com/"},
            {"source_key": "techstars", "compliance_tier": "permitted_crawl", "base_url": "https://www.techstars.com/"},
            {"source_key": "generic_careers", "compliance_tier": "permitted_crawl", "base_url": None},
            {"source_key": "wellfound", "compliance_tier": "user_capture", "base_url": "https://wellfound.com/"},
            {"source_key": "manual", "compliance_tier": "user_capture", "base_url": None},
            {"source_key": "linkedin", "compliance_tier": "restricted", "base_url": "https://www.linkedin.com/"},
        ],
    )


def downgrade() -> None:
    op.drop_table("source_registry")
