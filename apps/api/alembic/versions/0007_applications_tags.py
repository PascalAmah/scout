"""Phase 6.3: applications.tags — bulk-tagging on pipeline cards

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-15
"""
import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("tags", sa.ARRAY(sa.String()), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "tags")
