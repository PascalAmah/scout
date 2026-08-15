"""Phase 6.2: multiple CV profiles per user (name + is_default)

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-15
"""
import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Replace the one-profile-per-user unique constraint with (user_id, name).
    # Postgres names column-level UNIQUE constraints <table>_<column>_key.
    op.drop_constraint("cv_profiles_user_id_key", "cv_profiles", type_="unique")

    op.add_column(
        "cv_profiles",
        sa.Column("name", sa.String(length=60), nullable=False, server_default="Default"),
    )
    op.add_column(
        "cv_profiles",
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # Existing profiles become the user's default.
    op.execute("UPDATE cv_profiles SET is_default = true")

    op.create_unique_constraint("uq_cv_profiles_user_name", "cv_profiles", ["user_id", "name"])
    op.create_index(
        "ix_cv_profiles_one_default",
        "cv_profiles",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_default"),
    )


def downgrade() -> None:
    op.drop_index("ix_cv_profiles_one_default", table_name="cv_profiles")
    op.drop_constraint("uq_cv_profiles_user_name", "cv_profiles", type_="unique")
    op.drop_column("cv_profiles", "is_default")
    op.drop_column("cv_profiles", "name")
    op.create_unique_constraint("cv_profiles_user_id_key", "cv_profiles", ["user_id"])
