from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List
import sys

from app.rag.loader import PDFLoader
from app.rag.chunker import TextChunker
from app.rag.vector_store import vector_store
from app.schemas.knowledge import DocumentStats
from app.core.config import settings
from app.core.logging import logger


def run_ingestion() -> int:
    logger.info("Starting PDF Ingestion Pipeline...")
    doc_dir = Path(settings.DOCUMENTS_DIR)
    docs_to_ingest = []
    
    # Collect all supported files in documents directory
    for f in doc_dir.iterdir():
        if f.is_file() and f.suffix.lower() in [".pdf", ".txt", ".md"]:
            docs_to_ingest.append(f)

    if not docs_to_ingest:
        primary_doc = Path(settings.PRIMARY_DOCUMENT_PATH)
        secondary_doc = Path(settings.SECONDARY_DOCUMENT_PATH)
        if primary_doc.exists():
            docs_to_ingest.append(primary_doc)
        if secondary_doc.exists():
            docs_to_ingest.append(secondary_doc)

    if not docs_to_ingest:
        logger.error("No documents found for ingestion in ./data/documents/")
        return 0

    loader = PDFLoader()
    chunker = TextChunker(chunk_size=800, chunk_overlap=150)

    all_chunks = []
    doc_stats: Dict[str, DocumentStats] = {}

    for doc_path in docs_to_ingest:
        try:
            logger.info(f"Extracting: {doc_path.name}")
            pages = loader.load_document(doc_path)
            chunks = chunker.chunk_pages(pages)
            all_chunks.extend(chunks)

            file_size = doc_path.stat().st_size
            doc_stats[doc_path.name] = DocumentStats(
                filename=doc_path.name,
                total_pages=len(pages),
                total_chunks=len(chunks),
                file_size_bytes=file_size,
                last_ingested_at=datetime.now(timezone.utc)
            )
            logger.info(f"Successfully processed {doc_path.name}: {len(pages)} pages, {len(chunks)} chunks.")
        except Exception as e:
            logger.error(f"Error processing {doc_path.name}: {e}")

    if not all_chunks:
        logger.error("No chunks were generated from the documents.")
        return 0

    logger.info(f"Building vector index for {len(all_chunks)} chunks...")
    vector_store.build_index(all_chunks, doc_stats)
    logger.info(f"Vector index successfully built and saved! Total indexed chunks: {len(all_chunks)}")
    return len(all_chunks)


if __name__ == "__main__":
    count = run_ingestion()
    print(f"Ingestion completed. Total chunks indexed: {count}")
    sys.exit(0 if count > 0 else 1)
