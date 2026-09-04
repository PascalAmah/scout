"""Register the workatastartup source in source_registry

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-18
"""
import uuid

import sqlalchemy as sa

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def _registry() -> sa.sql.selectable.TableClause:
    return sa.table(
        "source_registry",
        sa.column("id", sa.Uuid),
        sa.column("source_key", sa.String),
        sa.column("compliance_tier", sa.String),
        sa.column("source_status", sa.String),
        sa.column("base_url", sa.String),
        sa.column("source_terms_checked_at", sa.DateTime(timezone=True)),
    )


def upgrade() -> None:
    registry = _registry()
    bind = op.get_bind()
    existing = bind.execute(
        sa.select(registry.c.source_key).where(registry.c.source_key == "workatastartup")
    ).first()
    if existing is not None:
        return
    op.bulk_insert(
        registry,
        [
            {
                "id": uuid.uuid4(),
                "source_key": "workatastartup",
                "compliance_tier": "direct_api",
                "source_status": "active",
                "base_url": "https://www.workatastartup.com/",
                "source_terms_checked_at": None,
            }
        ],
    )


def downgrade() -> None:
    registry = sa.table(
        "source_registry",
        sa.column("source_key", sa.String),
    )
    op.execute(registry.delete().where(registry.c.source_key == "workatastartup"))
