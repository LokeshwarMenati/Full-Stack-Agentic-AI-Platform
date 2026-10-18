from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel


class ActivityEventResponse(BaseModel):
    id: str
    thread_id: Optional[str] = None
    event_type: str
    node_name: str
    status: str
    summary: str
    duration_ms: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
