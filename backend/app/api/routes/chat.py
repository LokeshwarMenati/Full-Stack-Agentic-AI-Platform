import uuid
from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.core.logging import logger

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    thread_id = request.thread_id or str(uuid.uuid4())
    try:
        response = await ChatService.execute_turn(
            session=db,
            thread_id=thread_id,
            user_message_text=request.message
        )
        return response
    except Exception as e:
        logger.error(f"Error executing chat turn: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def chat_stream_endpoint(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    thread_id = request.thread_id or str(uuid.uuid4())
    generator = ChatService.stream_turn(
        session=db,
        thread_id=thread_id,
        user_message_text=request.message
    )
    return EventSourceResponse(generator)
