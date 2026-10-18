from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class CreateVoiceSessionRequest(BaseModel):
    thread_id: Optional[str] = None
    mode: Literal["push_to_talk", "live_conversation"] = "live_conversation"
    voice_preference: Optional[str] = None


class VoiceSessionResponse(BaseModel):
    session_id: str
    thread_id: str
    mode: str
    status: str
    voice_preference: Optional[str] = None
    turns_count: int = 0
    created_at: datetime
    ended_at: Optional[datetime] = None


class EndVoiceSessionResponse(BaseModel):
    session_id: str
    thread_id: str
    status: str
    turns_count: int
    duration_seconds: int
    ended_at: datetime


class TranscribeResponse(BaseModel):
    text: str
    engine: str
    status: str = "success"
    duration_ms: Optional[int] = None


class VoiceSpeakRequest(BaseModel):
    text: str
    voice: Optional[str] = None


class VoiceSpeakResponse(BaseModel):
    clean_text: str
    audio_url: Optional[str] = None
    strategy: str = "browser_synthesis"
