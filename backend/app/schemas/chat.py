from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class Citation(BaseModel):
    source: str
    page: int
    excerpt: str
    score: Optional[float] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    thread_id: Optional[str] = Field(None, max_length=128)
    user_email: Optional[str] = None


class ExecutionEventDTO(BaseModel):
    event_id: str
    node_name: str
    event_type: str
    status: str
    summary: str
    duration_ms: Optional[int] = None
    timestamp: datetime


class ChatResponse(BaseModel):
    thread_id: str
    role: Literal["assistant"] = "assistant"
    content: str
    citations: List[Citation] = Field(default_factory=list)
    execution_events: List[ExecutionEventDTO] = Field(default_factory=list)
    pending_booking: Optional[Dict[str, Any]] = None
    booking_confirmed: Optional[Dict[str, Any]] = None
    structured_task: Optional[Dict[str, Any]] = None
    approval_gate: Optional[Dict[str, Any]] = None
    state_diffs: Optional[List[Dict[str, Any]]] = None
    suggested_actions: List[str] = Field(default_factory=list)
