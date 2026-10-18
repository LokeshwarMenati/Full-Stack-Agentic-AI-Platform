from typing import Optional, Dict, Any
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from app.agents.state import AgentState
from app.agents.nodes.router import router_node
from app.agents.nodes.faq import faq_node
from app.agents.nodes.booking import booking_node
from app.agents.nodes.confirmation import confirmation_node
from app.agents.nodes.response import response_node
from app.core.config import settings
from app.core.logging import logger


def route_from_router(state: AgentState) -> str:
    intent = state.get("intent")
    if intent in ["knowledge_inquiry", "knowledge_with_pending_booking"]:
        return "faq"
    elif intent == "booking_confirmation":
        return "confirmation"
    elif intent in ["booking_initiation", "booking_field_collection", "slot_selection", "booking_cancellation"]:
        return "booking"
    return "response"


def route_from_faq(state: AgentState) -> str:
    intent = state.get("intent")
    if intent == "knowledge_with_pending_booking":
        return "booking"
    return "response"


def build_nexus_graph(checkpointer: Optional[Any] = None):
    workflow = StateGraph(AgentState)

    # 1. Add All Nodes
    workflow.add_node("router", router_node)
    workflow.add_node("faq", faq_node)
    workflow.add_node("booking", booking_node)
    workflow.add_node("confirmation", confirmation_node)
    workflow.add_node("response", response_node)

    # 2. Add Conditional and Direct Edges
    workflow.add_edge(START, "router")

    workflow.add_conditional_edges(
        "router",
        route_from_router,
        {
            "faq": "faq",
            "confirmation": "confirmation",
            "booking": "booking",
            "response": "response"
        }
    )

    # Context Interleaving Edge: After FAQ, if booking is pending, proceed to booking node
    workflow.add_conditional_edges(
        "faq",
        route_from_faq,
        {
            "booking": "booking",
            "response": "response"
        }
    )

    workflow.add_edge("booking", "response")
    workflow.add_edge("confirmation", "response")
    workflow.add_edge("response", END)

    return workflow.compile(checkpointer=checkpointer)


# Reusable workflow builder for compile
_raw_graph = build_nexus_graph(checkpointer=None)


async def execute_agent_graph(inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """Executes the agent state graph with persistent AsyncSqliteSaver checkpointing."""
    async with AsyncSqliteSaver.from_conn_string(settings.CHECKPOINT_DATABASE_PATH) as checkpointer:
        compiled_app = build_nexus_graph(checkpointer=checkpointer)
        return await compiled_app.ainvoke(inputs, config=config)


async def astream_agent_graph(inputs: Dict[str, Any], config: Dict[str, Any]):
    """Streams node execution steps from LangGraph with persistent AsyncSqliteSaver checkpointing."""
    async with AsyncSqliteSaver.from_conn_string(settings.CHECKPOINT_DATABASE_PATH) as checkpointer:
        compiled_app = build_nexus_graph(checkpointer=checkpointer)
        async for chunk in compiled_app.astream(inputs, config=config, stream_mode="updates"):
            for node_name, state_update in chunk.items():
                yield node_name, state_update


logger.info(f"Configured Nexus LangGraph with AsyncSqliteSaver at {settings.CHECKPOINT_DATABASE_PATH}")
