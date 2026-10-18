from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field


class MessageDTO(BaseModel):
    id: str
    thread_id: str
    role: str
    content: str
    citations: Optional[List[Any]] = None
    execution_events: Optional[List[Any]] = None
    created_at: datetime


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationResponse(BaseModel):
    thread_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageDTO] = Field(default_factory=list)


class ConversationSummary(BaseModel):
    thread_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None
