import sys
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))

from tasks.embedding import EMBEDDING_DIM, embed_text, pseudo_embedding  # noqa: E402


class TestEmbedding:
    def test_pseudo_embedding_is_deterministic_unit_vector(self) -> None:
        a = pseudo_embedding("python backend fastapi")
        b = pseudo_embedding("python backend fastapi")
        assert a == b
        norm = sum(v * v for v in a) ** 0.5
        assert abs(norm - 1.0) < 1e-6
        assert len(a) == EMBEDDING_DIM

    def test_pseudo_embedding_differs_for_different_text(self) -> None:
        a = pseudo_embedding("python backend")
        b = pseudo_embedding("figma design")
        assert a != b

    def test_embed_text_falls_back_without_api_key(self) -> None:
        with mock.patch.dict(
            "os.environ",
            {
                "AI_API_KEY": "",
                "AI_EMBEDDING_API_KEY": "",
                "OPENAI_API_KEY": "",
            },
            clear=False,
        ):
            vec, label = embed_text("hello world")
        assert len(vec) == EMBEDDING_DIM
        assert label.startswith("fallback:")

    def test_similar_texts_score_higher_than_unrelated(self) -> None:
        cv = "backend engineer python fastapi postgresql"
        job_backend = "backend engineer python fastapi postgresql"
        job_design = "brand designer figma illustrations"
        a = pseudo_embedding(cv)
        b = pseudo_embedding(job_backend)
        c = pseudo_embedding(job_design)

        def sim(x, y):
            return sum(i * j for i, j in zip(x, y, strict=False))

        assert sim(a, b) > sim(a, c)