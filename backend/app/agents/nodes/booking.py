import re
import time
from typing import Dict, Any, List
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.state import AgentState
from app.services.slot_service import SlotService
from app.services.booking_service import BookingService
from app.models.booking import Booking
from app.persistence.database import AsyncSessionLocal
from app.core.logging import logger


async def booking_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    pending_booking = dict(state.get("pending_booking") or {})
    intent = state.get("intent")
    messages = state.get("messages", [])
    last_msg = messages[-1].content if messages else ""
    events = list(state.get("execution_events") or [])
    structured_task = dict(state.get("structured_task") or {})
    state_diffs = list(state.get("state_diffs") or [])
    approval_gate = state.get("approval_gate")

    # Cancellation check
    if intent == "booking_cancellation":
        thread_id = state.get("thread_id")
        confirmed_in_state = state.get("booking_confirmed") or {}
        ref_match = re.search(r'\b((?:NX|NEX)-[A-Z0-9-]+)\b', last_msg, re.IGNORECASE)
        target_ref = ref_match.group(1).upper() if ref_match else None

        cancellation_result = None

        async with AsyncSessionLocal() as session:
            # Look for an active confirmed booking to cancel
            target_booking = None
            if target_ref:
                query = select(Booking).where(Booking.booking_reference == target_ref)
                target_booking = (await session.execute(query)).scalar_one_or_none()
            elif confirmed_in_state.get("id"):
                query = select(Booking).where(Booking.id == confirmed_in_state["id"])
                target_booking = (await session.execute(query)).scalar_one_or_none()
            elif confirmed_in_state.get("booking_reference"):
                query = select(Booking).where(Booking.booking_reference == confirmed_in_state["booking_reference"])
                target_booking = (await session.execute(query)).scalar_one_or_none()
            elif thread_id:
                query = select(Booking).where(
                    Booking.thread_id == thread_id,
                    Booking.status == "CONFIRMED"
                ).order_by(Booking.created_at.desc())
                target_booking = (await session.execute(query)).scalar_one_or_none()

            if target_booking:
                try:
                    cancel_resp = await BookingService.cancel_booking(session, target_booking.id)
                    duration = int((time.time() - start_time) * 1000)

                    events.append({
                        "event_id": f"evt_bk_{int(time.time() * 1000)}",
                        "node_name": "booking_node",
                        "event_type": "booking_cancelled",
                        "status": "SUCCESS",
                        "summary": f"Cancelled booking {cancel_resp.booking_reference} and freed slot {target_booking.slot_id}.",
                        "duration_ms": duration,
                        "timestamp": time.time()
                    })

                    if structured_task:
                        structured_task["execution_status"] = "cancelled"
                        structured_task["final_result"] = f"Booking {cancel_resp.booking_reference} has been successfully cancelled."

                    state_diffs.append({
                        "timestamp": time.time(),
                        "from_node": "router_node",
                        "to_node": "booking_node",
                        "added_keys": ["cancellation_result"],
                        "updated_keys": {"booking_confirmed": None},
                        "summary": f"Cancelled appointment {cancel_resp.booking_reference} and released slot {target_booking.slot_id}."
                    })

                    cancellation_result = {
                        "type": "confirmed_cancellation",
                        "booking_reference": cancel_resp.booking_reference,
                        "full_name": target_booking.full_name,
                        "email": target_booking.email,
                        "appointment_type": target_booking.appointment_type,
                        "slot_id": target_booking.slot_id,
                        "status": "CANCELLED"
                    }
                except Exception as e:
                    logger.error(f"Error cancelling booking {target_booking.id}: {e}", exc_info=True)
                    cancellation_result = {
                        "type": "error",
                        "error": str(e),
                        "status": "FAILED"
                    }
            elif pending_booking or state.get("pending_workflow") == "booking":
                events.append({
                    "event_id": f"evt_bk_{int(time.time() * 1000)}",
                    "node_name": "booking_node",
                    "event_type": "booking_cancelled",
                    "status": "INFO",
                    "summary": "Cancelled pending booking request as requested by user.",
                    "duration_ms": 10,
                    "timestamp": time.time()
                })
                if structured_task:
                    structured_task["execution_status"] = "cancelled"
                    structured_task["final_result"] = "Workflow cancelled by employee."

                cancellation_result = {
                    "type": "pending_cancellation",
                    "status": "CANCELLED"
                }
            else:
                events.append({
                    "event_id": f"evt_bk_{int(time.time() * 1000)}",
                    "node_name": "booking_node",
                    "event_type": "booking_cancelled",
                    "status": "WARNING",
                    "summary": "Cancellation requested but no active booking was found for this conversation.",
                    "duration_ms": 5,
                    "timestamp": time.time()
                })
                cancellation_result = {
                    "type": "not_found",
                    "status": "NOT_FOUND"
                }

        return {
            "pending_booking": None,
            "pending_workflow": None,
            "missing_fields": [],
            "available_slots": [],
            "selected_slot": None,
            "booking_confirmed": None,
            "cancellation_result": cancellation_result,
            "structured_task": structured_task,
            "approval_gate": None,
            "state_diffs": state_diffs,
            "current_node": "booking_node",
            "execution_events": events
        }

    # Identify missing fields
    missing = []
    if not pending_booking.get("full_name"):
        missing.append("full_name")
    if not pending_booking.get("email"):
        missing.append("email")

    available_slot_dtos: List[Dict[str, Any]] = []
    selected_slot: Dict[str, Any] | None = state.get("selected_slot")

    async with AsyncSessionLocal() as session:
        # If user is selecting a slot
        is_slot_text = any(w in last_msg.lower() for w in ["friday", "monday", "tuesday", "10:30", "14:00", "16:30", "slot_", "option 1", "option 2"])
        if (intent == "slot_selection" or (intent != "knowledge_with_pending_booking" and not selected_slot and is_slot_text)) and not missing:
            matched_slot = await SlotService.match_slot_by_text(
                session=session,
                user_text=last_msg,
                appointment_type=pending_booking.get("appointment_type")
            )
            if matched_slot:
                pending_booking["slot_id"] = matched_slot.id
                pending_booking["status"] = "PENDING_CONFIRMATION"
                slot_resp = SlotService._to_response(matched_slot)
                selected_slot = slot_resp.model_dump()
                logger.info(f"Resolved slot selection to: {matched_slot.id} ({slot_resp.formatted_start})")

        # If slot is still needed, retrieve available slots from DB
        if not selected_slot or not pending_booking.get("slot_id"):
            slots = await SlotService.get_available_slots(
                session=session,
                appointment_type=pending_booking.get("appointment_type")
            )
            available_slot_dtos = [s.model_dump() for s in slots]
            if "slot_id" not in missing:
                missing.append("slot_id")

    # Configure Approval Gate if all details are ready for confirmation
    if pending_booking.get("slot_id") and pending_booking.get("full_name") and pending_booking.get("email"):
        slot_label = (selected_slot or {}).get("formatted_start") or pending_booking.get("slot_id")
        approval_gate = {
            "required": True,
            "status": "pending_authorization",
            "action": "Commit Appointment Booking",
            "slot_id": pending_booking.get("slot_id"),
            "slot_time": slot_label,
            "attendee_name": pending_booking.get("full_name"),
            "attendee_email": pending_booking.get("email"),
            "appointment_type": pending_booking.get("appointment_type")
        }
        if structured_task:
            structured_task["approval_required"] = True
            structured_task["approval_status"] = "pending"
            structured_task["execution_status"] = "waiting_approval"
            structured_task["consequential_action_description"] = f"Commit database reservation for {slot_label} on behalf of {pending_booking.get('full_name')}"
    elif missing:
        if structured_task:
            structured_task["execution_status"] = "waiting_input"
            structured_task["missing_inputs"] = missing

    # Update structured task collected inputs
    if structured_task:
        collected = structured_task.get("collected_inputs") or {}
        if pending_booking.get("full_name"):
            collected["full_name"] = pending_booking["full_name"]
        if pending_booking.get("email"):
            collected["email"] = pending_booking["email"]
        if pending_booking.get("slot_id"):
            collected["slot_id"] = pending_booking["slot_id"]
        structured_task["collected_inputs"] = collected
        structured_task["missing_inputs"] = missing

    duration = int((time.time() - start_time) * 1000)
    events.append({
        "event_id": f"evt_bk_{int(time.time() * 1000)}",
        "node_name": "booking_node",
        "event_type": "slot_validation",
        "status": "SUCCESS",
        "summary": f"Booking state evaluated. Selected slot: {pending_booking.get('slot_id', 'None')}, Missing: {missing}",
        "duration_ms": duration,
        "timestamp": time.time()
    })

    # Record state diff
    diff_entry = {
        "timestamp": time.time(),
        "from_node": "router_node",
        "to_node": "booking_node",
        "added_keys": ["available_slots"] if available_slot_dtos else [],
        "updated_keys": {"missing_fields": missing, "selected_slot": selected_slot.get("id") if selected_slot else None},
        "summary": f"Evaluated slot availability: {len(available_slot_dtos)} available slots, {len(missing)} fields missing."
    }
    state_diffs.append(diff_entry)

    return {
        "pending_booking": pending_booking,
        "missing_fields": missing,
        "available_slots": available_slot_dtos,
        "selected_slot": selected_slot,
        "structured_task": structured_task,
        "approval_gate": approval_gate,
        "state_diffs": state_diffs,
        "current_node": "booking_node",
        "execution_events": events
    }
