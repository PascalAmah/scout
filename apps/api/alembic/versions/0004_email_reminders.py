"""Phase 4: retention — users.email_reminders_enabled opt-in toggle

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-14
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "email_reminders_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "email_reminders_enabled")
