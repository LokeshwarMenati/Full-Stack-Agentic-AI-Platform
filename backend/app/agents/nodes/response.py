import re
import time
from typing import Dict, Any, List
from langchain_core.messages import AIMessage

from app.agents.state import AgentState
from app.core.logging import logger


def response_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    intent = state.get("intent")
    pending = state.get("pending_booking") or {}
    confirmed = state.get("booking_confirmed")
    rag_answer = state.get("rag_answer")
    missing = state.get("missing_fields") or []
    available = state.get("available_slots") or []
    selected = state.get("selected_slot")
    error = state.get("error")
    events = list(state.get("execution_events") or [])

    content_parts: List[str] = []

    # 1. Error condition
    if error:
        content_parts.append(f"⚠️ **Notice**: {error}")

    # 2. Cancellation
    if intent == "booking_cancellation":
        c_res = state.get("cancellation_result") or {}
        c_type = c_res.get("type")
        ref = c_res.get("booking_reference")
        full_name = c_res.get("full_name")

        if c_type == "confirmed_cancellation" and ref:
            name_str = f" for **{full_name}**" if full_name else ""
            content_parts.append(
                f"### ❌ Booking Cancelled\n\n"
                f"Your appointment{name_str} with reference **`{ref}`** has been successfully cancelled.\n\n"
                f"- **Status**: `CANCELLED`\n"
                f"- **Slot**: Released back into available inventory\n\n"
                f"Let me know if you would like to reschedule or if you have any questions!"
            )
        elif c_type == "not_found":
            content_parts.append(
                "I couldn't find an active confirmed appointment for this conversation to cancel. "
                "If you have your booking reference (e.g. `NEX-XXXXX`), please provide it and I will gladly cancel it for you."
            )
        elif c_type == "error":
            content_parts.append(f"⚠️ Unable to cancel booking: {c_res.get('error', 'Unknown error')}")
        else:
            content_parts.append("Your pending booking workflow has been cancelled. Let me know if you would like assistance with anything else!")

    # 3. Confirmed booking
    elif confirmed and confirmed.get("status") == "CONFIRMED":
        ref = confirmed.get("booking_reference")
        name = confirmed.get("full_name")
        email = confirmed.get("email")
        appt = confirmed.get("appointment_type")
        fmt_time = confirmed.get("formatted_time", "Confirmed Slot")

        content_parts.append(
            f"### 🎉 Booking Confirmed!\n\n"
            f"Your appointment has been successfully scheduled.\n\n"
            f"**Booking Reference**: `{ref}`\n"
            f"- **Full Name**: {name}\n"
            f"- **Email**: {email}\n"
            f"- **Appointment Type**: {appt}\n"
            f"- **Scheduled Time**: **{fmt_time}**\n"
            f"- **Status**: `CONFIRMED`\n\n"
            f"You can view or manage this appointment anytime in the **Bookings** tab."
        )

    # 3. Interleaved RAG + Pending Booking
    elif intent == "knowledge_with_pending_booking":
        if rag_answer:
            content_parts.append(rag_answer)

        # Smoothly resume the booking flow
        appt = pending.get("appointment_type", "appointment")
        name = pending.get("full_name")
        email = pending.get("email")

        resume_intro = f"\n\n---\n\n### 📅 Resuming your {appt} Booking"
        if name and email:
            resume_intro += f" for **{name}** (`{email}`)"
        elif name:
            resume_intro += f" for **{name}**"
        resume_intro += ":\n"
        content_parts.append(resume_intro)

        if "full_name" in missing or "email" in missing:
            needed = []
            if "full_name" in missing:
                needed.append("full name")
            if "email" in missing:
                needed.append("work email address")
            content_parts.append(f"To continue scheduling, please provide your **{' and '.join(needed)}**.")
        elif available:
            content_parts.append("Here are the currently available appointment slots:\n")
            for idx, s in enumerate(available[:4], 1):
                start_str = s.get("formatted_start") or s.get("id")
                content_parts.append(f"{idx}. **{start_str}** (`{s.get('id')}`)")
            content_parts.append("\nPlease let me know which date and time works best for you (e.g. *\"Friday at 10:30 AM\"*).")

    # 4. Standalone Knowledge Inquiry
    elif intent == "knowledge_inquiry":
        if rag_answer:
            content_parts.append(rag_answer)
        else:
            content_parts.append("I searched the company handbook and benefits documentation, but could not find specific passages matching your question.")

    # 5. Slot selected -> Prompt for confirmation
    elif selected and pending.get("slot_id") and pending.get("full_name") and pending.get("email"):
        fmt_slot = selected.get("formatted_start") or pending.get("slot_id")
        content_parts.append(
            f"I have tentatively reserved **{fmt_slot}** for your **{pending.get('appointment_type', 'Appointment')}**.\n\n"
            f"**Please confirm the appointment details:**\n"
            f"- **Full Name**: {pending.get('full_name')}\n"
            f"- **Email**: {pending.get('email')}\n"
            f"- **Appointment Type**: {pending.get('appointment_type')}\n"
            f"- **Selected Slot**: {fmt_slot}\n\n"
            f"Would you like me to confirm and commit this booking? (Reply **Yes** or **Confirm**)"
        )

    # 6. Booking in progress: Missing name / email
    elif ("full_name" in missing or "email" in missing) and pending:
        appt = pending.get("appointment_type", "appointment")
        needed = []
        if "full_name" in missing:
            needed.append("full name")
        if "email" in missing:
            needed.append("work email address")
        content_parts.append(
            f"I can certainly help you schedule a **{appt}**! "
            f"To get started, please provide your **{' and '.join(needed)}**."
        )

    # 7. Booking in progress: Presenting slots
    elif available and pending:
        appt = pending.get("appointment_type", "appointment")
        name = pending.get("full_name", "")
        greeting = f"Great, {name}! " if name else ""
        content_parts.append(
            f"{greeting}Here are the upcoming available appointment slots for your **{appt}**:\n"
        )
        for idx, s in enumerate(available[:4], 1):
            start_str = s.get("formatted_start") or s.get("id")
            content_parts.append(f"{idx}. **{start_str}** (`{s.get('id')}`)")
        content_parts.append("\nWhich slot would you prefer? You can reply with a time like *\"Friday at 10:30 AM\"* or slot code.")


    else:
        # Build natural conversational response using the LLM engine
        history_snippet = []
        for m in (state.get("messages", [])[-6:]):
            role_label = "User" if (getattr(m, 'type', None) == "human" or (isinstance(m, dict) and m.get("role") == "user")) else "Assistant"
            m_text = m.content if hasattr(m, 'content') else m.get("content", "")
            history_snippet.append(f"{role_label}: {m_text}")

        conv_context = "\n".join(history_snippet)
        system_prompt = (
            "You are NEXUS AI, a helpful, intelligent enterprise assistant. "
            "Respond naturally, concisely, and warmly to greetings, general inquiries, and questions about what you can do. "
            "You can answer policy questions from corporate documents and help schedule appointments. "
            "Keep simple conversational answers brief and friendly. Do not hallucinate policies."
        )
        user_prompt = f"Recent Conversation:\n{conv_context}\n\nRespond as NEXUS AI:"
        from app.agents.llm import llm_client
        answer = llm_client.generate(system_prompt=system_prompt, user_prompt=user_prompt)
        content_parts.append(answer)

    final_text = "".join(content_parts)

    duration = int((time.time() - start_time) * 1000)
    events.append({
        "event_id": f"evt_resp_{int(time.time() * 1000)}",
        "node_name": "response_node",
        "event_type": "response_generated",
        "status": "SUCCESS",
        "summary": "Generated final assistant response.",
        "duration_ms": duration,
        "timestamp": time.time()
    })

    return {
        "messages": [AIMessage(content=final_text)],
        "current_node": "response_node",
        "execution_events": events
    }
