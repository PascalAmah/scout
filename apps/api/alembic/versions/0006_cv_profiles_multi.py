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


def _drop_user_uniqueness() -> None:
    """Drop the old one-profile-per-user uniqueness however it was created.

    ``0002`` declared ``user_id unique=True, index=True``: on Postgres that
    yields a single UNIQUE INDEX ``ix_cv_profiles_user_id``, while other
    paths (e.g. sqlite ``create_all`` with ``unique=True`` alone) produce a
    UNIQUE CONSTRAINT ``cv_profiles_user_id_key``. Drop whichever exists so
    the migration is safe on both.
    """
    inspector = sa.inspect(op.get_bind())
    constraint_names = {c["name"] for c in inspector.get_unique_constraints("cv_profiles")}
    if "cv_profiles_user_id_key" in constraint_names:
        op.drop_constraint("cv_profiles_user_id_key", "cv_profiles", type_="unique")
    index_names = {i["name"] for i in inspector.get_indexes("cv_profiles")}
    if "ix_cv_profiles_user_id" in index_names:
        op.drop_index("ix_cv_profiles_user_id", table_name="cv_profiles")


def upgrade() -> None:
    _drop_user_uniqueness()

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
