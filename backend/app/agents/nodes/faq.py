import time
from typing import Dict, Any, List
from langchain_core.messages import AIMessage

from app.agents.state import AgentState
from app.agents.llm import llm_client
from app.rag.retriever import KnowledgeRetriever
from app.core.logging import logger

retriever = KnowledgeRetriever()


def faq_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    messages = state.get("messages", [])
    last_msg = messages[-1].content if messages else ""
    events = list(state.get("execution_events") or [])

    # Extract query
    query = last_msg
    # If the user included both name/email and question, extract the question portion
    if "before continuing" in query.lower():
        parts = query.lower().split("before continuing", 1)
        query = parts[1].strip(", :")
    elif "?" in query:
        # focus on question
        pass

    citations = retriever.retrieve(query=query, top_k=4)
    citation_dicts = [c.model_dump() for c in citations]

    # Synthesize answer using retrieved evidence
    context_text = "\n\n".join([
        f"[Source: {c.source}, Page: {c.page}]\n{c.excerpt}" for c in citations
    ])

    system_prompt = (
        "You are NEXUS AI, an enterprise intelligent assistant. Answer the user's question based strictly "
        "on the retrieved document context. Always cite the exact source document and page number. "
        "Do not invent facts not present in the sources. If the sources do not provide an answer, state that clearly."
    )
    user_prompt = f"Question: {query}\n\nRetrieved Passages:\n{context_text}"

    answer = llm_client.generate(system_prompt=system_prompt, user_prompt=user_prompt)

    duration = int((time.time() - start_time) * 1000)
    events.append({
        "event_id": f"evt_faq_{int(time.time() * 1000)}",
        "node_name": "faq_node",
        "event_type": "rag_retrieval",
        "status": "SUCCESS",
        "summary": f"Retrieved {len(citations)} citations from handbook and generated grounded response.",
        "duration_ms": duration,
        "timestamp": time.time()
    })

    return {
        "retrieved_citations": citation_dicts,
        "rag_answer": answer,
        "current_node": "faq_node",
        "execution_events": events
    }
