from typing import Annotated, List, Optional, Dict, Any
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    thread_id: str
    intent: Optional[str]  # "knowledge_inquiry", "booking_initiation", "booking_field_collection", "slot_selection", "booking_confirmation", "booking_cancellation", "knowledge_with_pending_booking", "general_inquiry"

    # Intent-to-Outcome Engine & Structured Task Tracking
    structured_task: Optional[Dict[str, Any]]
    state_diffs: List[Dict[str, Any]]
    approval_gate: Optional[Dict[str, Any]]  # {required: bool, status: str, action: str, slot_id: str}
    simulation_mode: bool  # True when replaying in isolated sandbox

    # Workflow tracking
    pending_workflow: Optional[str]  # "booking"
    pending_booking: Optional[Dict[str, Any]]  # {full_name, email, appointment_type, slot_id, status}
    missing_fields: List[str]

    # Slot and booking details
    available_slots: List[Dict[str, Any]]
    selected_slot: Optional[Dict[str, Any]]
    booking_confirmed: Optional[Dict[str, Any]]
    cancellation_result: Optional[Dict[str, Any]]

    # Knowledge RAG details
    retrieved_citations: List[Dict[str, Any]]
    rag_answer: Optional[str]

    # Observability and execution trace
    current_node: str
    execution_events: List[Dict[str, Any]]
    error: Optional[str]
