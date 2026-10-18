from abc import ABC, abstractmethod
from typing import List
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from app.core.config import settings
from app.core.logging import logger


class BaseEmbedder(ABC):
    @abstractmethod
    def fit_and_transform(self, texts: List[str]) -> np.ndarray:
        pass

    @abstractmethod
    def transform(self, texts: List[str]) -> np.ndarray:
        pass


class DenseTFIDFEmbedder(BaseEmbedder):
    """
    Deterministic sublinear TF-IDF embedder with character and word n-grams,
    L2-normalized for precise cosine similarity calculation.
    Zero external API key dependencies.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            sublinear_tf=True,
            max_features=25000,
            norm='l2',
            lowercase=True,
            stop_words='english'
        )
        self.is_fitted = False

    def fit_and_transform(self, texts: List[str]) -> np.ndarray:
        matrix = self.vectorizer.fit_transform(texts)
        self.is_fitted = True
        return matrix.toarray()

    def transform(self, texts: List[str]) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("Embedder has not been fitted on any document corpus yet.")
        matrix = self.vectorizer.transform(texts)
        return matrix.toarray()


class GeminiEmbedder(BaseEmbedder):
    """Embedder using Google Gemini text-embedding-004."""
    def __init__(self, api_key: str):
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self.model = "models/text-embedding-004"

    def fit_and_transform(self, texts: List[str]) -> np.ndarray:
        return self.transform(texts)

    def transform(self, texts: List[str]) -> np.ndarray:
        import google.generativeai as genai
        embeddings = []
        for text in texts:
            res = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document"
            )
            embeddings.append(res["embedding"])
        arr = np.array(embeddings, dtype=np.float32)
        # L2 normalize
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return arr / norms


def get_embedder() -> BaseEmbedder:
    if settings.EMBEDDING_PROVIDER == "gemini" and settings.GOOGLE_API_KEY:
        try:
            return GeminiEmbedder(api_key=settings.GOOGLE_API_KEY)
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini embedder: {e}. Falling back to DenseTFIDFEmbedder.")
    return DenseTFIDFEmbedder()
