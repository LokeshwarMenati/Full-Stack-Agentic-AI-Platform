from datetime import datetime, timezone
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
import joblib
import numpy as np

from app.rag.chunker import DocumentChunk
from app.rag.embeddings import get_embedder, BaseEmbedder, DenseTFIDFEmbedder
from app.schemas.chat import Citation
from app.schemas.knowledge import KnowledgeStatusResponse, DocumentStats
from app.core.config import settings
from app.core.logging import logger


class VectorStore:
    def __init__(self, storage_dir: Optional[str | Path] = None):
        self.storage_dir = Path(storage_dir or settings.VECTOR_STORE_PATH)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.storage_dir / "index.joblib"
        self.metadata_file = self.storage_dir / "metadata.json"

        self.embedder: BaseEmbedder = get_embedder()
        self.chunks: List[DocumentChunk] = []
        self.embeddings: Optional[np.ndarray] = None
        self.last_ingested_at: Optional[datetime] = None
        self.doc_stats: Dict[str, DocumentStats] = {}
        self.errors: List[str] = []

        self.load_if_exists()

    def load_if_exists(self) -> bool:
        if self.index_file.exists() and self.metadata_file.exists():
            try:
                data = joblib.load(self.index_file)
                self.embedder = data["embedder"]
                self.embeddings = data["embeddings"]
                raw_chunks = data["chunks"]
                self.chunks = [DocumentChunk(**c) for c in raw_chunks]

                with open(self.metadata_file, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    self.last_ingested_at = datetime.fromisoformat(meta["last_ingested_at"]) if meta.get("last_ingested_at") else None
                    self.doc_stats = {
                        k: DocumentStats(**v) for k, v in meta.get("doc_stats", {}).items()
                    }
                    self.errors = meta.get("errors", [])
                logger.info(f"Loaded existing vector store with {len(self.chunks)} chunks from {self.storage_dir}")
                return True
            except Exception as e:
                logger.error(f"Failed to load vector store from {self.storage_dir}: {e}")
                return False
        return False

    def save(self) -> None:
        raw_chunks = [
            {
                "chunk_id": c.chunk_id,
                "source": c.source,
                "page_number": c.page_number,
                "text": c.text
            }
            for c in self.chunks
        ]
        data = {
            "embedder": self.embedder,
            "embeddings": self.embeddings,
            "chunks": raw_chunks
        }
        joblib.dump(data, self.index_file)

        meta = {
            "last_ingested_at": self.last_ingested_at.isoformat() if self.last_ingested_at else None,
            "total_chunks": len(self.chunks),
            "doc_stats": {k: v.model_dump(mode="json") for k, v in self.doc_stats.items()},
            "errors": self.errors
        }
        with open(self.metadata_file, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
        logger.info(f"Persisted vector store with {len(self.chunks)} chunks to {self.storage_dir}")

    def build_index(self, chunks: List[DocumentChunk], doc_stats: Dict[str, DocumentStats]) -> None:
        if not chunks:
            raise ValueError("No chunks provided to build index.")

        self.chunks = chunks
        self.doc_stats = doc_stats
        texts = [c.text for c in chunks]

        # Initialize new embedder
        self.embedder = get_embedder()
        self.embeddings = self.embedder.fit_and_transform(texts)
        self.last_ingested_at = datetime.now(timezone.utc)
        self.errors = []

        self.save()

    def similarity_search(
        self,
        query: str,
        top_k: int = 4,
        score_threshold: float = 0.05
    ) -> List[Citation]:
        if not self.chunks or self.embeddings is None:
            logger.warning("Vector store is empty. No documents indexed yet.")
            return []

        # Vectorize query
        try:
            query_vec = self.embedder.transform([query])
        except Exception as e:
            logger.error(f"Error embedding query: {e}")
            return []

        # Cosine similarity: (Q . D)
        scores = np.dot(self.embeddings, query_vec.T).flatten()
        top_indices = np.argsort(scores)[::-1]

        results: List[Citation] = []
        seen_excerpts = set()

        for idx in top_indices:
            score = float(scores[idx])
            if score < score_threshold:
                continue

            chunk = self.chunks[idx]
            
            # Clean excerpt for presentation
            clean_excerpt = chunk.text.replace("\n", " ").strip()
            # Deduplicate near identical snippets
            prefix = clean_excerpt[:100]
            if prefix in seen_excerpts:
                continue
            seen_excerpts.add(prefix)

            results.append(
                Citation(
                    source=chunk.source,
                    page=chunk.page_number,
                    excerpt=clean_excerpt,
                    score=round(score, 4)
                )
            )

            if len(results) >= top_k:
                break

        return results

    def get_status(self) -> KnowledgeStatusResponse:
        total_pages = sum(d.total_pages for d in self.doc_stats.values())
        return KnowledgeStatusResponse(
            is_indexed=len(self.chunks) > 0,
            total_documents=len(self.doc_stats),
            total_pages=total_pages,
            total_chunks=len(self.chunks),
            documents=list(self.doc_stats.values()),
            embedding_provider=settings.EMBEDDING_PROVIDER,
            embedding_model=settings.EMBEDDING_MODEL,
            vector_store_type="Persistent L2-Normalized Vector Index",
            last_ingestion=self.last_ingested_at,
            errors=self.errors
        )


# Global singleton instance
vector_store = VectorStore()
