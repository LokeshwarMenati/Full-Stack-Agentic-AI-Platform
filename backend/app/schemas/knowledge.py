from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentStats(BaseModel):
    filename: str
    total_pages: int
    total_chunks: int
    file_size_bytes: int
    last_ingested_at: Optional[datetime] = None


class KnowledgeStatusResponse(BaseModel):
    is_indexed: bool
    total_documents: int
    total_pages: int
    total_chunks: int
    documents: List[DocumentStats] = Field(default_factory=list)
    embedding_provider: str
    embedding_model: str
    vector_store_type: str = "Persistent Dense Vector Index"
    last_ingestion: Optional[datetime] = None
    errors: List[str] = Field(default_factory=list)


class IngestResponse(BaseModel):
    success: bool
    message: str
    total_pages_ingested: int
    total_chunks_created: int
    timestamp: datetime


class KnowledgeQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    top_k: int = Field(default=4, ge=1, le=10)


class CitationDTO(BaseModel):
    source: str
    page: int
    excerpt: str
    score: float


class KnowledgeQueryResponse(BaseModel):
    query: str
    citations: List[CitationDTO] = Field(default_factory=list)
    total_found: int
