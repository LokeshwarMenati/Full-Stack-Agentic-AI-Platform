from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.persistence.database import Base
import app.models.conversation  # noqa: F401


class VoiceSession(Base):
    __tablename__ = "voice_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String(128), ForeignKey("conversations.thread_id", ondelete="CASCADE"), nullable=False, index=True)
    mode = Column(String(32), default="live_conversation", nullable=False)  # push_to_talk | live_conversation
    status = Column(String(24), default="active", nullable=False, index=True)  # active | paused | ended
    voice_preference = Column(String(64), nullable=True)
    turns_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    ended_at = Column(DateTime, nullable=True)

    conversation = relationship("Conversation")
