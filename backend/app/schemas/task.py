from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class LinkedObjective(BaseModel):
    id: str
    description: str
    target_node: str  # "faq" | "booking" | "confirmation" | "general"
    status: str = "pending"  # "pending" | "in_progress" | "completed" | "skipped" | "failed"
    result_summary: Optional[str] = None


class PlannedOperation(BaseModel):
    operation_id: str
    node_name: str
    description: str
    status: str = "pending"  # "pending" | "running" | "completed" | "failed" | "skipped"
    duration_ms: Optional[int] = None
    state_updates: Dict[str, Any] = Field(default_factory=dict)


class StructuredTask(BaseModel):
    task_id: str
    thread_id: str
    user_intent: str
    linked_objectives: List[LinkedObjective] = Field(default_factory=list)
    required_inputs: List[str] = Field(default_factory=list)
    collected_inputs: Dict[str, Any] = Field(default_factory=dict)
    missing_inputs: List[str] = Field(default_factory=list)
    planned_operations: List[PlannedOperation] = Field(default_factory=list)
    approval_required: bool = False
    approval_status: str = "not_required"  # "not_required" | "pending" | "approved" | "rejected"
    consequential_action_description: Optional[str] = None
    execution_status: str = "planned"  # "planned" | "in_progress" | "waiting_input" | "waiting_approval" | "completed" | "cancelled" | "failed"
    evidence_references: List[Dict[str, Any]] = Field(default_factory=list)
    final_result: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class StateDiffEntry(BaseModel):
    timestamp: float
    from_node: str
    to_node: str
    added_keys: List[str] = Field(default_factory=list)
    updated_keys: Dict[str, Any] = Field(default_factory=dict)
    summary: str


class EditTaskInputsRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    slot_id: Optional[str] = None
    appointment_type: Optional[str] = None


class WorkflowReplayRequest(BaseModel):
    thread_id: str
    dry_run: bool = True  # Simulation mode prevents side-effects


class WorkflowReplayResponse(BaseModel):
    replay_id: str
    original_thread_id: str
    is_simulation: bool
    status: str  # "SUCCESS" | "FAILED"
    original_turns_count: int
    replayed_turns_count: int
    execution_path: List[str]
    state_transitions: List[Dict[str, Any]]
    side_effects_prevented: List[str]
    comparison: Dict[str, Any]
    replay_summary: str
