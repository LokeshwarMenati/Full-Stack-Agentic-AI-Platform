import asyncio
from datetime import datetime, timezone
import json
import time
from typing import AsyncGenerator, Dict, Any, List, Optional
from langchain_core.messages import HumanMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import execute_agent_graph, astream_agent_graph
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.activity import ActivityEvent
from app.schemas.chat import ChatResponse, Citation, ExecutionEventDTO
from app.core.logging import logger


class ChatService:
    @classmethod
    async def get_or_create_conversation(cls, session: AsyncSession, thread_id: str, first_message: Optional[str] = None) -> Conversation:
        query = select(Conversation).where(Conversation.thread_id == thread_id)
        result = await session.execute(query)
        conversation = result.scalar_one_or_none()

        if not conversation:
            title = "New Conversation"
            if first_message:
                clean = first_message.strip()
                title = (clean[:35] + "...") if len(clean) > 35 else clean
            conversation = Conversation(
                thread_id=thread_id,
                title=title,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            session.add(conversation)
            await session.commit()
            await session.refresh(conversation)

        return conversation

    @classmethod
    async def execute_turn(
        cls,
        session: AsyncSession,
        thread_id: str,
        user_message_text: str
    ) -> ChatResponse:
        await cls.get_or_create_conversation(session, thread_id, user_message_text)

        # 1. Save User Message to Database
        user_msg = Message(
            thread_id=thread_id,
            role="user",
            content=user_message_text,
            created_at=datetime.now(timezone.utc)
        )
        session.add(user_msg)
        await session.commit()

        # 2. Invoke LangGraph with Persistent Thread Configuration
        config = {"configurable": {"thread_id": thread_id}}
        inputs = {
            "messages": [HumanMessage(content=user_message_text)],
            "thread_id": thread_id
        }

        # Run state graph
        final_state = await execute_agent_graph(inputs, config=config)

        # Extract output from graph
        messages = final_state.get("messages", [])
        assistant_content = messages[-1].content if messages else "No response generated."
        raw_citations = final_state.get("retrieved_citations") or []
        citations = [Citation(**c) for c in raw_citations]
        raw_events = final_state.get("execution_events") or []

        event_dtos: List[ExecutionEventDTO] = []
        for e in raw_events:
            ts = datetime.fromtimestamp(e.get("timestamp", time.time()), tz=timezone.utc)
            event_dtos.append(
                ExecutionEventDTO(
                    event_id=e.get("event_id", "evt"),
                    node_name=e.get("node_name", "agent"),
                    event_type=e.get("event_type", "action"),
                    status=e.get("status", "SUCCESS"),
                    summary=e.get("summary", ""),
                    duration_ms=e.get("duration_ms"),
                    timestamp=ts
                )
            )
            # Record to persistent ActivityEvents table
            db_event = ActivityEvent(
                thread_id=thread_id,
                event_type=e.get("event_type", "action"),
                node_name=e.get("node_name", "agent"),
                status=e.get("status", "SUCCESS"),
                summary=e.get("summary", ""),
                duration_ms=e.get("duration_ms"),
                metadata_json=e
            )
            session.add(db_event)

        # 3. Save Assistant Message to Database
        asst_msg = Message(
            thread_id=thread_id,
            role="assistant",
            content=assistant_content,
            citations=[c.model_dump() for c in citations],
            execution_events=[e.model_dump(mode="json") for e in event_dtos],
            created_at=datetime.now(timezone.utc)
        )
        session.add(asst_msg)

        # Update Conversation timestamp
        conv_query = select(Conversation).where(Conversation.thread_id == thread_id)
        conv = (await session.execute(conv_query)).scalar_one_or_none()
        if conv:
            conv.updated_at = datetime.now(timezone.utc)

        await session.commit()

        # Generate contextual suggested follow-ups
        suggested = []
        if final_state.get("pending_booking"):
            suggested.append("Friday at 10:30 AM works for me")
            suggested.append("Show other available slots")
            suggested.append("Cancel booking")
        elif final_state.get("booking_confirmed") and final_state["booking_confirmed"].get("status") == "CONFIRMED":
            suggested.append("Cancel booking")
            suggested.append("What does the handbook say about PTO?")
            suggested.append("Schedule another meeting")
        else:
            suggested.append("How often are performance reviews conducted?")
            suggested.append("Help me schedule a performance review")
            suggested.append("What does the handbook say about workplace safety?")

        return ChatResponse(
            thread_id=thread_id,
            role="assistant",
            content=assistant_content,
            citations=citations,
            execution_events=event_dtos,
            pending_booking=final_state.get("pending_booking"),
            booking_confirmed=final_state.get("booking_confirmed"),
            structured_task=final_state.get("structured_task"),
            approval_gate=final_state.get("approval_gate"),
            state_diffs=final_state.get("state_diffs"),
            suggested_actions=suggested
        )

    @classmethod
    async def stream_turn(
        cls,
        session: AsyncSession,
        thread_id: str,
        user_message_text: str
    ):
        """Server-Sent Events generator streaming live agent node events, citations, tokens, and final payload."""
        from sse_starlette.sse import ServerSentEvent

        # 1. Initialize conversation & save user message
        await cls.get_or_create_conversation(session, thread_id, user_message_text)
        user_msg = Message(
            thread_id=thread_id,
            role="user",
            content=user_message_text,
            created_at=datetime.now(timezone.utc)
        )
        session.add(user_msg)
        await session.commit()

        # 2. Initial routing status event
        yield ServerSentEvent(
            event="status",
            data=json.dumps({"message": "Analyzing query intent & routing...", "node": "router"})
        )

        # 3. Stream through LangGraph node execution
        config = {"configurable": {"thread_id": thread_id}}
        inputs = {
            "messages": [HumanMessage(content=user_message_text)],
            "thread_id": thread_id
        }

        final_state: Dict[str, Any] = {}
        all_events_recorded: List[ExecutionEventDTO] = []

        async for node_name, state_update in astream_agent_graph(inputs, config=config):
            final_state.update(state_update)

            # Node transition update
            node_labels = {
                "router": "Classified intent and determining execution path...",
                "faq": "Retrieved handbook policy passages and grounding context...",
                "booking": "Processing appointment slot selection...",
                "confirmation": "Validating reservation and committing booking...",
                "response": "Compiling grounded response and action metadata..."
            }
            yield ServerSentEvent(
                event="status",
                data=json.dumps({
                    "message": node_labels.get(node_name, f"Executing node '{node_name}'..."),
                    "node": node_name
                })
            )

            # Check if this node produced new execution events
            raw_node_events = state_update.get("execution_events") or []
            if raw_node_events:
                latest_event = raw_node_events[-1]
                ts = datetime.fromtimestamp(latest_event.get("timestamp", time.time()), tz=timezone.utc)
                evt_dto = ExecutionEventDTO(
                    event_id=latest_event.get("event_id", f"evt_{int(time.time()*1000)}"),
                    node_name=latest_event.get("node_name", node_name),
                    event_type=latest_event.get("event_type", "action"),
                    status=latest_event.get("status", "SUCCESS"),
                    summary=latest_event.get("summary", ""),
                    duration_ms=latest_event.get("duration_ms"),
                    timestamp=ts
                )
                all_events_recorded.append(evt_dto)

                # Stream live agent event to frontend immediately
                yield ServerSentEvent(
                    event="agent_event",
                    data=json.dumps(evt_dto.model_dump(mode="json"))
                )

                # Persist to ActivityEvent table
                db_event = ActivityEvent(
                    thread_id=thread_id,
                    event_type=latest_event.get("event_type", "action"),
                    node_name=latest_event.get("node_name", node_name),
                    status=latest_event.get("status", "SUCCESS"),
                    summary=latest_event.get("summary", ""),
                    duration_ms=latest_event.get("duration_ms"),
                    metadata_json=latest_event
                )
                session.add(db_event)

            # Check if citations were retrieved by FAQ node
            if "retrieved_citations" in state_update and state_update["retrieved_citations"]:
                citations_list = [Citation(**c) for c in state_update["retrieved_citations"]]
                yield ServerSentEvent(
                    event="citations",
                    data=json.dumps([c.model_dump() for c in citations_list])
                )

        # 4. Extract final state results
        messages = final_state.get("messages", [])
        assistant_content = messages[-1].content if messages else "No response generated."
        raw_citations = final_state.get("retrieved_citations") or []
        citations = [Citation(**c) for c in raw_citations]

        # 5. Save Assistant Message to Database
        asst_msg = Message(
            thread_id=thread_id,
            role="assistant",
            content=assistant_content,
            citations=[c.model_dump() for c in citations],
            execution_events=[e.model_dump(mode="json") for e in all_events_recorded],
            created_at=datetime.now(timezone.utc)
        )
        session.add(asst_msg)

        conv_query = select(Conversation).where(Conversation.thread_id == thread_id)
        conv = (await session.execute(conv_query)).scalar_one_or_none()
        if conv:
            conv.updated_at = datetime.now(timezone.utc)
        await session.commit()

        # 6. Stream tokens smoothly
        words = assistant_content.split(" ")
        for i in range(0, len(words), 2):
            chunk = " ".join(words[i:i+2]) + " "
            yield ServerSentEvent(
                event="token",
                data=json.dumps({"token": chunk})
            )
            await asyncio.sleep(0.01)

        # 7. Generate contextual suggestions
        suggested = []
        if final_state.get("pending_booking"):
            suggested.append("Friday at 10:30 AM works for me")
            suggested.append("Show other available slots")
            suggested.append("Cancel booking")
        elif final_state.get("booking_confirmed") and final_state["booking_confirmed"].get("status") == "CONFIRMED":
            suggested.append("Cancel booking")
            suggested.append("What does the handbook say about PTO?")
            suggested.append("Schedule another meeting")
        else:
            suggested.append("How often are performance reviews conducted?")
            suggested.append("Help me schedule a performance review")
            suggested.append("What does the handbook say about workplace safety?")

        final_response = ChatResponse(
            thread_id=thread_id,
            role="assistant",
            content=assistant_content,
            citations=citations,
            execution_events=all_events_recorded,
            pending_booking=final_state.get("pending_booking"),
            booking_confirmed=final_state.get("booking_confirmed"),
            structured_task=final_state.get("structured_task"),
            approval_gate=final_state.get("approval_gate"),
            state_diffs=final_state.get("state_diffs"),
            suggested_actions=suggested
        )

        # 8. Send final complete payload
        yield ServerSentEvent(
            event="complete",
            data=json.dumps(final_response.model_dump(mode="json"))
        )
