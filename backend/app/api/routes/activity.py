from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.database import get_db
from app.models.activity import ActivityEvent
from app.schemas.activity import ActivityEventResponse

router = APIRouter(prefix="/api/activity", tags=["Activity"])


@router.get("", response_model=List[ActivityEventResponse])
async def get_recent_activity(
    thread_id: Optional[str] = Query(None, description="Filter by thread ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    query = select(ActivityEvent).order_by(ActivityEvent.created_at.desc())
    if thread_id:
        query = query.where(ActivityEvent.thread_id == thread_id)
    if event_type:
        query = query.where(ActivityEvent.event_type == event_type)
    query = query.limit(limit)

    result = await db.execute(query)
    events = result.scalars().all()

    return [
        ActivityEventResponse(
            id=e.id,
            thread_id=e.thread_id,
            event_type=e.event_type,
            node_name=e.node_name,
            status=e.status,
            summary=e.summary,
            duration_ms=e.duration_ms,
            metadata=e.metadata_json,
            created_at=e.created_at
        )
        for e in events
    ]
