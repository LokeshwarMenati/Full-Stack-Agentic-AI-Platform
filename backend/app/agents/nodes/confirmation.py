import time
import uuid
from typing import Dict, Any
from app.agents.state import AgentState
from app.services.booking_service import BookingService
from app.schemas.booking import BookingCreate, BookingResponse
from app.persistence.database import AsyncSessionLocal
from app.core.exceptions import SlotUnavailableError
from app.core.logging import logger


async def confirmation_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    pending = dict(state.get("pending_booking") or {})
    events = list(state.get("execution_events") or [])
    thread_id = state.get("thread_id")
    structured_task = dict(state.get("structured_task") or {})
    state_diffs = list(state.get("state_diffs") or [])
    is_simulation = bool(state.get("simulation_mode", False))

    slot_id = pending.get("slot_id")
    full_name = pending.get("full_name")
    email = pending.get("email")
    appt_type = pending.get("appointment_type", "Performance Review")

    if not (slot_id and full_name and email):
        logger.warning("Confirmation node invoked but missing required booking fields.")
        return {"current_node": "confirmation_node"}

    # Handle Simulation / Replay Mode: Validate without side effects
    if is_simulation:
        sim_ref = f"SIM-{uuid.uuid4().hex[:6].upper()}"
        duration = int((time.time() - start_time) * 1000)
        events.append({
            "event_id": f"evt_sim_{int(time.time() * 1000)}",
            "node_name": "confirmation_node",
            "event_type": "simulation_validated",
            "status": "SUCCESS",
            "summary": f"[SIMULATION] Booking validation passed. Side-effects prevented. Dry-run ref: {sim_ref}",
            "duration_ms": duration,
            "timestamp": time.time()
        })

        if structured_task:
            structured_task["approval_status"] = "approved"
            structured_task["execution_status"] = "completed"
            structured_task["final_result"] = f"[SIMULATION] Appointment validated for {full_name} ({sim_ref})"

        sim_booking = {
            "id": f"sim_{uuid.uuid4().hex[:8]}",
            "booking_reference": sim_ref,
            "slot_id": slot_id,
            "full_name": full_name,
            "email": email,
            "appointment_type": appt_type,
            "status": "confirmed",
            "formatted_time": "Friday, Oct 16 at 10:30 AM"
        }

        return {
            "booking_confirmed": sim_booking,
            "pending_booking": None,
            "pending_workflow": None,
            "missing_fields": [],
            "selected_slot": None,
            "available_slots": [],
            "structured_task": structured_task,
            "approval_gate": None,
            "current_node": "confirmation_node",
            "execution_events": events,
            "error": None
        }

    # Production Execution Mode: Commit ACID Transaction
    async with AsyncSessionLocal() as session:
        try:
            booking_in = BookingCreate(
                full_name=full_name,
                email=email,
                appointment_type=appt_type,
                slot_id=slot_id,
                thread_id=thread_id
            )
            booking_resp = await BookingService.create_booking(session, booking_in)
            duration = int((time.time() - start_time) * 1000)

            events.append({
                "event_id": f"evt_commit_{int(time.time() * 1000)}",
                "node_name": "confirmation_node",
                "event_type": "booking_transaction_committed",
                "status": "SUCCESS",
                "summary": f"Transaction committed. Booking Reference: {booking_resp.booking_reference}",
                "duration_ms": duration,
                "timestamp": time.time()
            })

            if structured_task:
                structured_task["approval_status"] = "approved"
                structured_task["execution_status"] = "completed"
                structured_task["final_result"] = f"Booking confirmed with reference {booking_resp.booking_reference}"

            diff_entry = {
                "timestamp": time.time(),
                "from_node": "booking_node",
                "to_node": "confirmation_node",
                "added_keys": ["booking_confirmed"],
                "updated_keys": {"pending_booking": None, "pending_workflow": None},
                "summary": f"Committed booking transaction: {booking_resp.booking_reference} for {full_name}."
            }
            state_diffs.append(diff_entry)

            return {
                "booking_confirmed": booking_resp.model_dump(),
                "pending_booking": None,
                "pending_workflow": None,
                "missing_fields": [],
                "selected_slot": None,
                "available_slots": [],
                "structured_task": structured_task,
                "approval_gate": None,
                "state_diffs": state_diffs,
                "current_node": "confirmation_node",
                "execution_events": events,
                "error": None
            }

        except SlotUnavailableError as e:
            duration = int((time.time() - start_time) * 1000)
            events.append({
                "event_id": f"evt_err_{int(time.time() * 1000)}",
                "node_name": "confirmation_node",
                "event_type": "booking_transaction_failed",
                "status": "ERROR",
                "summary": f"Slot {slot_id} unavailable: {str(e)}",
                "duration_ms": duration,
                "timestamp": time.time()
            })
            pending["slot_id"] = None
            if structured_task:
                structured_task["execution_status"] = "waiting_input"
                structured_task["missing_inputs"] = ["slot_id"]

            return {
                "pending_booking": pending,
                "structured_task": structured_task,
                "error": "The selected slot was just reserved or is no longer available. Please select another slot.",
                "current_node": "confirmation_node",
                "execution_events": events
            }
