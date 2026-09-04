"""create cv/match/embedding tables for Phase 2 matching

Revision ID: 0002
Revises: 1e5deb2dec63
Create Date: 2026-08-13
"""
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as pg
from alembic import op
from pgvector.sqlalchemy import Vector  # type: ignore[import-not-found]

revision = "0002"
down_revision = "1e5deb2dec63"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "cv_profiles",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", pg.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("structured_data", pg.JSONB(), nullable=True),
        sa.Column("source_file_key", sa.String(length=2048), nullable=True),
        sa.Column("last_embedded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "cv_embeddings",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("cv_profile_id", pg.UUID(as_uuid=True), sa.ForeignKey("cv_profiles.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False, server_default="text-embedding-3-large"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_cv_embeddings_vector_hnsw",
        "cv_embeddings",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )

    op.create_table(
        "startup_embeddings",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("startup_id", pg.UUID(as_uuid=True), sa.ForeignKey("startups.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False, server_default="text-embedding-3-large"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_startup_embeddings_vector_hnsw",
        "startup_embeddings",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )

    op.create_table(
        "job_embeddings",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("job_id", pg.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, unique=True, index=True),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False, server_default="text-embedding-3-large"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_job_embeddings_vector_hnsw",
        "job_embeddings",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )

    op.create_table(
        "match_scores",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", pg.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("job_id", pg.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("startup_id", pg.UUID(as_uuid=True), sa.ForeignKey("startups.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("score", sa.Numeric(5, 2), nullable=False),
        sa.Column("model", sa.String(length=50), nullable=False, server_default="phase_2_embedding"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_match_scores_user_score", "match_scores", ["user_id", "score"])
    op.create_unique_constraint("uq_match_scores_user_job", "match_scores", ["user_id", "job_id"])


def downgrade() -> None:
    op.drop_constraint("uq_match_scores_user_job", "match_scores", type_="unique")
    op.drop_index("ix_match_scores_user_score", table_name="match_scores")
    op.drop_index("ix_job_embeddings_vector_hnsw", table_name="job_embeddings")
    op.drop_index("ix_startup_embeddings_vector_hnsw", table_name="startup_embeddings")
    op.drop_index("ix_cv_embeddings_vector_hnsw", table_name="cv_embeddings")
    op.drop_table("match_scores")
    op.drop_table("job_embeddings")
    op.drop_table("startup_embeddings")
    op.drop_table("cv_embeddings")
    op.drop_table("cv_profiles")
    op.execute("DROP EXTENSION IF EXISTS vector")