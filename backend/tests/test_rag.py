import pytest
from app.rag.retriever import KnowledgeRetriever
from app.rag.vector_store import vector_store


def test_rag_retrieval_and_citations():
    retriever = KnowledgeRetriever()
    
    # Query performance reviews
    citations = retriever.retrieve("how often are performance reviews conducted according to the handbook?", top_k=4)
    assert len(citations) > 0

    # Ensure page 4 citation is present
    top_citation = citations[0]
    assert top_citation.source == "employee_handbook.pdf"
    assert top_citation.page == 4
    assert "performance" in top_citation.excerpt.lower()
    assert top_citation.score > 0.1

    # Status check
    status = vector_store.get_status()
    assert status.is_indexed is True
    assert status.total_chunks >= 400
    assert status.total_pages >= 100
