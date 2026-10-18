from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, Integer, JSON

from app.persistence.database import Base


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String(128), nullable=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # 'intent_classified', 'rag_retrieval', 'slot_checked', 'booking_committed', etc.
    node_name = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="SUCCESS")  # 'SUCCESS', 'INFO', 'WARNING', 'ERROR'
    summary = Column(String(255), nullable=False)
    duration_ms = Column(Integer, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
