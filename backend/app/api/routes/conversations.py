import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.database import get_db
from app.schemas.conversation import ConversationResponse, ConversationSummary, ConversationCreate
from app.services.conversation_service import ConversationService

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


@router.get("", response_model=List[ConversationSummary])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    return await ConversationService.list_conversations(db)


@router.post("", response_model=ConversationResponse)
async def create_conversation(data: ConversationCreate, db: AsyncSession = Depends(get_db)):
    thread_id = str(uuid.uuid4())
    return await ConversationService.create_conversation(db, thread_id=thread_id, title=data.title or "New Conversation")


@router.get("/{thread_id}", response_model=ConversationResponse)
async def get_conversation(thread_id: str, db: AsyncSession = Depends(get_db)):
    conv = await ConversationService.get_conversation(db, thread_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversation '{thread_id}' not found.")
    return conv
