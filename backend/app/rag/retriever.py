from typing import List, Optional
from app.rag.vector_store import vector_store, VectorStore
from app.schemas.chat import Citation
from app.core.logging import logger


class KnowledgeRetriever:
    def __init__(self, store: Optional[VectorStore] = None):
        self.store = store or vector_store

    def retrieve(self, query: str, top_k: int = 4) -> List[Citation]:
        logger.info(f"Retrieving knowledge passages for query: '{query}' (top_k={top_k})")
        citations = self.store.similarity_search(query=query, top_k=top_k)
        logger.info(f"Retrieved {len(citations)} citations")
        return citations
