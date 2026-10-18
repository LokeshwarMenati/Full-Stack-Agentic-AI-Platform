from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationResponse, ConversationSummary, MessageDTO


class ConversationService:
    @classmethod
    async def list_conversations(cls, session: AsyncSession) -> List[ConversationSummary]:
        query = (
            select(
                Conversation,
                func.count(Message.id).label("message_count")
            )
            .outerjoin(Message, Conversation.thread_id == Message.thread_id)
            .group_by(Conversation.thread_id)
            .order_by(Conversation.updated_at.desc())
        )
        result = await session.execute(query)
        rows = result.all()

        summaries = []
        for conv, count in rows:
            summaries.append(
                ConversationSummary(
                    thread_id=conv.thread_id,
                    title=conv.title,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    message_count=count
                )
            )
        return summaries

    @classmethod
    async def get_conversation(cls, session: AsyncSession, thread_id: str) -> Optional[ConversationResponse]:
        query = (
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.thread_id == thread_id)
        )
        result = await session.execute(query)
        conv = result.scalar_one_or_none()
        if not conv:
            return None

        message_dtos = [
            MessageDTO(
                id=m.id,
                thread_id=m.thread_id,
                role=m.role,
                content=m.content,
                citations=m.citations,
                execution_events=m.execution_events,
                created_at=m.created_at
            )
            for m in conv.messages
        ]

        return ConversationResponse(
            thread_id=conv.thread_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=message_dtos
        )

    @classmethod
    async def create_conversation(cls, session: AsyncSession, thread_id: str, title: str = "New Conversation") -> ConversationResponse:
        conv = Conversation(
            thread_id=thread_id,
            title=title,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        session.add(conv)
        await session.commit()
        await session.refresh(conv)

        return ConversationResponse(
            thread_id=conv.thread_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=[]
        )
