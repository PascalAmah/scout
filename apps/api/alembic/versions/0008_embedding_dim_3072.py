"""widen embedding columns to 3072 dims (gemini-embedding-001)

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-16
"""
from alembic import op
from pgvector.sqlalchemy import Vector  # type: ignore[import-not-found]

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

_TABLES = (
    ("cv_embeddings", "ix_cv_embeddings_vector_hnsw"),
    ("startup_embeddings", "ix_startup_embeddings_vector_hnsw"),
    ("job_embeddings", "ix_job_embeddings_vector_hnsw"),
)


def upgrade() -> None:
    for table, index in _TABLES:
        op.drop_index(index, table_name=table)
        # 1536-dim rows cannot be cast to vector(3072); embeddings are derived
        # data rebuilt by the worker (refresh_embeddings), so drop them.
        op.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY")
        op.alter_column(
            table,
            "embedding",
            existing_type=Vector(1536),
            type_=Vector(3072),
            existing_nullable=False,
        )
        # pgvector's HNSW (and ivfflat) indexes cap at 2000 dimensions, so a
        # 3072-dim vector column can't have a vector index. Sequential scans
        # are fine at personal-data scale; retrieval happens in the worker.
        # Re-introduce an index if a dim-capped provider is configured later.


def downgrade() -> None:
    for table, _index in _TABLES:
        op.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY")
        op.alter_column(
            table,
            "embedding",
            existing_type=Vector(3072),
            type_=Vector(1536),
            existing_nullable=False,
        )
        # Restore the HNSW index as it existed before (1536 dims).
        op.execute(
            f"CREATE INDEX ix_{table.split('_')[0]}_embeddings_vector_hnsw "
            f"ON {table} USING hnsw (embedding vector_cosine_ops)"
        )
