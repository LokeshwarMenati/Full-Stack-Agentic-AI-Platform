from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, UploadFile, File
import shutil
from pathlib import Path
from app.core.config import settings
from app.schemas.knowledge import (
    KnowledgeStatusResponse,
    IngestResponse,
    KnowledgeQueryRequest,
    KnowledgeQueryResponse,
    CitationDTO
)
from app.rag.vector_store import vector_store
from app.rag.retriever import KnowledgeRetriever
from app.rag.ingest import run_ingestion
from app.core.logging import logger

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge"])
retriever = KnowledgeRetriever()


@router.get("/status", response_model=KnowledgeStatusResponse)
async def get_knowledge_status():
    return vector_store.get_status()


@router.post("/ingest", response_model=IngestResponse)
async def trigger_ingestion():
    try:
        count = run_ingestion()
        status = vector_store.get_status()
        return IngestResponse(
            success=True,
            message=f"Successfully ingested and indexed {count} document chunks across {status.total_pages} pages.",
            total_pages_ingested=status.total_pages,
            total_chunks_created=count,
            timestamp=datetime.now(timezone.utc)
        )
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_knowledge_document(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_document.pdf"
    ext = Path(filename).suffix.lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported document format '{ext}'. Allowed: .pdf, .txt, .md"
        )

    target_path = Path(settings.DOCUMENTS_DIR) / filename
    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Saved uploaded document: {target_path}")

        # Run ingestion pipeline
        count = run_ingestion()
        status = vector_store.get_status()
        return {
            "success": True,
            "filename": filename,
            "total_chunks_indexed": count,
            "total_pages": status.total_pages,
            "message": f"Successfully uploaded '{filename}' and re-indexed {count} knowledge chunks."
        }
    except Exception as e:
        logger.error(f"Failed to process uploaded file '{filename}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@router.post("/query", response_model=KnowledgeQueryResponse)
async def test_retrieval_query(request: KnowledgeQueryRequest):
    citations = retriever.retrieve(query=request.query, top_k=request.top_k)
    dtos = [
        CitationDTO(
            source=c.source,
            page=c.page,
            excerpt=c.excerpt,
            score=c.score or 0.0
        )
        for c in citations
    ]
    return KnowledgeQueryResponse(
        query=request.query,
        citations=dtos,
        total_found=len(dtos)
    )
