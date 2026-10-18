import re
import time
from typing import Dict, Any, List, Optional
from langchain_core.messages import HumanMessage

from app.agents.state import AgentState
from app.core.logging import logger


class IntentRouter:
    EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

    # Blacklist of question and policy tokens that must never appear in human names
    STOPWORDS = {
        "how", "often", "are", "is", "what", "why", "when", "where", "can", "does", "do",
        "conducted", "according", "handbook", "policy", "reviews", "performance", "review",
        "schedule", "appointment", "meeting", "before", "continuing", "question", "tell",
        "me", "about", "the", "a", "an", "this", "that", "there", "i", "my", "we", "our",
        "employee", "zava", "northwind", "benefits", "vacation", "pto", "leave", "insurance",
        "health", "safety", "standard", "details", "workplace", "annual", "annually",
        "yes", "no", "confirm", "cancel", "stop", "abort", "book", "reserve",
        "hello", "hi", "hey", "good", "morning", "evening", "afternoon", "thanks", "thank",
        "please", "help", "inquiry", "guidance", "rules", "rule", "procedure", "procedures"
    }

    EXPLICIT_NAME_PATTERNS = [
        re.compile(r"(?:my name is|i am|name is|name:?|i'm|for)\s+([A-Za-z\s'-]{2,40})", re.IGNORECASE),
    ]

    @classmethod
    def extract_email(cls, text: str) -> Optional[str]:
        match = cls.EMAIL_REGEX.search(text)
        return match.group(0) if match else None

    @classmethod
    def _is_valid_name(cls, candidate: str) -> bool:
        """Strict validation that a candidate string is genuinely a person's name."""
        candidate = candidate.strip()
        if not candidate or len(candidate) < 3 or len(candidate) > 40:
            return False

        # No question marks, digits, colons, or punctuation
        if any(char in candidate for char in "?!@#$%^&*()_+=[]{}|\\/<>0123456789"):
            return False

        tokens = candidate.split()
        if len(tokens) < 2 or len(tokens) > 4:
            return False

        # Check against blacklist
        for t in tokens:
            t_clean = re.sub(r'[^a-zA-Z]', '', t).lower()
            if t_clean in cls.STOPWORDS or len(t_clean) < 2:
                return False

        return True

    @classmethod
    def extract_name(cls, text: str) -> Optional[str]:
        # 1. First look for explicit phrases like "My name is Alex Chen"
        for pattern in cls.EXPLICIT_NAME_PATTERNS:
            match = pattern.search(text)
            if match:
                raw_candidate = match.group(1).strip()
                parts = re.split(r'[,.\n\r]|(?:\s+(?:and|before|email|with|at)\s+)', raw_candidate, flags=re.IGNORECASE)
                first_part = parts[0].strip()
                if cls._is_valid_name(first_part):
                    return first_part.title()

        # 2. Look for name pattern preceding an email (e.g., "Alex Chen, alex.chen@example.com")
        if "@" in text:
            parts = text.split("@")[0].split(",")
            if len(parts) >= 1:
                candidate = parts[0].strip()
                if cls._is_valid_name(candidate):
                    return candidate.title()

        # 3. Look for leading capitalized full name at the start of the message (e.g. "Alex Chen. Before continuing...")
        first_segment = re.split(r'[,.;\n\r]|(?:\s+before\s+)', text, flags=re.IGNORECASE)[0].strip()
        if cls._is_valid_name(first_segment):
            return first_segment.title()

        return None

    @classmethod
    def extract_appointment_type(cls, text: str) -> Optional[str]:
        t_low = text.lower()
        has_booking_verb = any(v in t_low for v in ["schedule", "book", "appointment", "reserve", "set up", "need a", "want a"])
        if "performance" in t_low and "review" in t_low:
            if has_booking_verb or "appointment" in t_low:
                return "Performance Review"
        if "pto" in t_low or "vacation" in t_low or "benefit" in t_low:
            if has_booking_verb:
                return "PTO & Benefits Discussion"
        if "general" in t_low or "consultation" in t_low:
            if has_booking_verb:
                return "General HR Inquiry"
        return None

    @classmethod
    def is_knowledge_question(cls, text: str) -> bool:
        t_low = text.lower()
        question_words = [
            "how often", "what is", "how do", "where is", "does the handbook",
            "according to", "tell me about", "policy", "handbook", "benefits details",
            "how many", "what are", "is there", "can i"
        ]
        has_q_word = any(q in t_low for q in question_words)
        has_q_mark = "?" in text
        has_knowledge_subject = any(s in t_low for s in [
            "performance review", "pto", "vacation", "sick leave", "safety",
            "conducted", "review process", "insurance", "allergy", "handbook"
        ])

        return (has_q_word or has_q_mark) and (has_knowledge_subject or "handbook" in t_low)

    @classmethod
    def is_confirmation_signal(cls, text: str) -> bool:
        t_low = text.lower().strip()
        confirm_phrases = ["yes", "confirm", "proceed", "yes, confirm", "yes confirm", "please confirm", "looks good", "book it", "sounds good", "confirm it", "approve"]
        return any(t_low == p or t_low.startswith(p) for p in confirm_phrases)

    @classmethod
    def is_cancellation_signal(cls, text: str) -> bool:
        t_low = text.lower().strip()
        if "don't cancel" in t_low or "do not cancel" in t_low:
            return False
        if re.search(r'\b(?:cancel|cancelling|canceling|cancellation|abort|nevermind)\b', t_low):
            return True
        cancel_phrases = ["stop", "don't book", "no", "never mind", "drop it", "discard"]
        return any(t_low == p or t_low.startswith(f"{p} ") for p in cancel_phrases)


def build_or_update_task(
    thread_id: str,
    last_msg: str,
    intent: str,
    pending_booking: Dict[str, Any],
    existing_task: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    task_id = (existing_task or {}).get("task_id") or f"task_{int(time.time() * 1000)}"

    objectives = []
    # 1. Knowledge objective
    if intent in ["knowledge_inquiry", "knowledge_with_pending_booking"]:
        objectives.append({
            "id": "obj_faq",
            "description": "Retrieve grounded handbook evidence & cite verified page excerpts",
            "target_node": "faq",
            "status": "in_progress",
            "result_summary": None
        })

    # 2. Transactional Booking objective
    if pending_booking or intent in ["booking_initiation", "booking_field_collection", "slot_selection", "booking_confirmation", "knowledge_with_pending_booking"]:
        appt = pending_booking.get("appointment_type", "Performance Review")
        booking_status = "in_progress"
        if pending_booking.get("status") == "CONFIRMED":
            booking_status = "completed"
        elif pending_booking.get("status") == "CANCELLED":
            booking_status = "cancelled"
        elif intent == "knowledge_with_pending_booking":
            booking_status = "pending"

        objectives.append({
            "id": "obj_booking",
            "description": f"Complete transactional scheduling for {appt}",
            "target_node": "booking",
            "status": booking_status,
            "result_summary": f"Slot: {pending_booking.get('slot_id', 'Pending selection')}" if pending_booking.get("slot_id") else None
        })

    if not objectives:
        objectives.append({
            "id": "obj_general",
            "description": "Address employee operational inquiry",
            "target_node": "general",
            "status": "completed",
            "result_summary": None
        })

    required_inputs = []
    collected_inputs = {}
    missing_inputs = []

    if pending_booking or any(o["target_node"] == "booking" for o in objectives):
        required_inputs = ["full_name", "email", "slot_id"]
        if pending_booking.get("full_name"):
            collected_inputs["full_name"] = pending_booking["full_name"]
        else:
            missing_inputs.append("full_name")

        if pending_booking.get("email"):
            collected_inputs["email"] = pending_booking["email"]
        else:
            missing_inputs.append("email")

        if pending_booking.get("slot_id"):
            collected_inputs["slot_id"] = pending_booking["slot_id"]
        else:
            missing_inputs.append("slot_id")

    approval_required = False
    approval_status = "not_required"
    consequential_action = None

    if pending_booking.get("slot_id") and pending_booking.get("full_name") and pending_booking.get("email"):
        approval_required = True
        approval_status = "pending" if pending_booking.get("status") != "CONFIRMED" else "approved"
        consequential_action = f"Commit database reservation for {pending_booking.get('slot_id')} on behalf of {pending_booking.get('full_name')}"

    execution_status = "in_progress"
    if intent == "booking_cancellation":
        execution_status = "cancelled"
    elif pending_booking.get("status") == "CONFIRMED":
        execution_status = "completed"
    elif approval_required and approval_status == "pending":
        execution_status = "waiting_approval"
    elif missing_inputs:
        execution_status = "waiting_input"

    planned_ops = list((existing_task or {}).get("planned_operations") or [])
    planned_ops.append({
        "operation_id": f"op_{int(time.time() * 1000)}",
        "node_name": "router",
        "description": f"Intent: {intent} ({len(objectives)} linked objectives)",
        "status": "completed",
        "duration_ms": 15,
        "state_updates": {
            "intent": intent,
            "missing_inputs": missing_inputs
        }
    })

    return {
        "task_id": task_id,
        "thread_id": thread_id,
        "user_intent": intent,
        "linked_objectives": objectives,
        "required_inputs": required_inputs,
        "collected_inputs": collected_inputs,
        "missing_inputs": missing_inputs,
        "planned_operations": planned_ops,
        "approval_required": approval_required,
        "approval_status": approval_status,
        "consequential_action_description": consequential_action,
        "execution_status": execution_status,
        "evidence_references": (existing_task or {}).get("evidence_references") or [],
        "final_result": (existing_task or {}).get("final_result")
    }


def router_node(state: AgentState) -> Dict[str, Any]:
    start_time = time.time()
    messages = state.get("messages", [])
    last_msg = messages[-1].content if messages else ""
    thread_id = state.get("thread_id", f"thread_{int(time.time())}")

    pending_booking = dict(state.get("pending_booking") or {})
    pending_workflow = state.get("pending_workflow")
    existing_task = state.get("structured_task")
    state_diffs = list(state.get("state_diffs") or [])
    events = list(state.get("execution_events") or [])

    is_q = IntentRouter.is_knowledge_question(last_msg)
    is_confirm = IntentRouter.is_confirmation_signal(last_msg)
    is_cancel = IntentRouter.is_cancellation_signal(last_msg)

    has_confirmed = bool(state.get("booking_confirmed"))
    has_ref = bool(re.search(r'\b(?:NX|NEX)-\w+', last_msg, re.IGNORECASE))
    has_booking_mention = any(w in last_msg.lower() for w in ["booking", "appointment", "meeting", "slot", "reservation", "schedule"])

    # 1. Cancellation (handles pending booking workflow OR cancellation of confirmed appointment)
    if is_cancel and (pending_workflow == "booking" or pending_booking or has_confirmed or has_ref or has_booking_mention or last_msg.strip().lower() in ["cancel", "stop", "abort"]):
        intent = "booking_cancellation"
        if pending_workflow == "booking" or pending_booking:
            summary = "User requested cancellation of pending booking."
        else:
            summary = "User requested cancellation of confirmed appointment."

    # 2. Interleaved Knowledge Inquiry:
    elif (pending_workflow == "booking" or pending_booking) and is_q:
        intent = "knowledge_with_pending_booking"
        summary = "User asked handbook question during pending booking. Preserving existing booking state and routing to RAG."

        extracted_email = IntentRouter.extract_email(last_msg)
        extracted_name = IntentRouter.extract_name(last_msg)

        if extracted_email and not pending_booking.get("email"):
            pending_booking["email"] = extracted_email
            logger.info(f"Captured attendee email during interleaved turn: {extracted_email}")

        if extracted_name and not pending_booking.get("full_name"):
            # Only assign name during interleaved turns if explicitly declared or paired with email
            if "@" in last_msg or any(p.search(last_msg) for p in IntentRouter.EXPLICIT_NAME_PATTERNS) or "before continuing" in last_msg.lower():
                pending_booking["full_name"] = extracted_name
                logger.info(f"Captured attendee name during interleaved turn: {extracted_name}")

    # 3. Confirmation of tentative slot
    elif (pending_workflow == "booking" or pending_booking) and is_confirm and pending_booking.get("slot_id"):
        intent = "booking_confirmation"
        summary = "User confirmed booking reservation."

    # 4. Slot Selection
    elif (pending_workflow == "booking" or pending_booking) and any(w in last_msg.lower() for w in ["friday", "monday", "tuesday", "10:30", "slot_", "option 1", "option 2", "works for me"]):
        intent = "slot_selection"
        summary = "User provided slot selection for appointment."

    # 5. Booking Initiation (uses word boundaries so 'handbook' does not match 'book')
    elif re.search(r'\b(?:schedule|book|booking|appointment|reserve|reservation|set up a meeting)\b', last_msg, re.IGNORECASE):
        intent = "booking_initiation"
        pending_workflow = "booking"
        extracted_type = IntentRouter.extract_appointment_type(last_msg)
        if not pending_booking.get("appointment_type"):
            pending_booking["appointment_type"] = extracted_type or "Performance Review"
        summary = f"Initiated appointment booking for {pending_booking.get('appointment_type', 'Performance Review')}."

        extracted_email = IntentRouter.extract_email(last_msg)
        extracted_name = IntentRouter.extract_name(last_msg)
        if extracted_email:
            pending_booking["email"] = extracted_email
        if extracted_name:
            pending_booking["full_name"] = extracted_name

    # 6. Providing details for existing booking
    elif pending_workflow == "booking" or pending_booking:
        intent = "booking_field_collection"
        summary = "Collected booking details from user."

        extracted_email = IntentRouter.extract_email(last_msg)
        extracted_name = IntentRouter.extract_name(last_msg)

        if extracted_email and not pending_booking.get("email"):
            pending_booking["email"] = extracted_email
        if extracted_name and not pending_booking.get("full_name"):
            pending_booking["full_name"] = extracted_name

    # 7. Standalone Knowledge Question
    elif is_q:
        intent = "knowledge_inquiry"
        summary = "User asked knowledge inquiry regarding employee handbook."

    else:
        intent = "general_inquiry"
        summary = "Routing standard conversation message."

    duration = int((time.time() - start_time) * 1000)
    events.append({
        "event_id": f"evt_route_{int(time.time() * 1000)}",
        "node_name": "router_node",
        "event_type": "intent_classified",
        "status": "SUCCESS",
        "summary": summary,
        "duration_ms": duration,
        "timestamp": time.time()
    })

    # Construct Intent-to-Outcome Task Model
    structured_task = build_or_update_task(
        thread_id=thread_id,
        last_msg=last_msg,
        intent=intent,
        pending_booking=pending_booking,
        existing_task=existing_task
    )

    # Record safe state diff
    diff_entry = {
        "timestamp": time.time(),
        "from_node": "START",
        "to_node": "router_node",
        "added_keys": ["intent", "structured_task"],
        "updated_keys": {"intent": intent},
        "summary": f"Classified intent as '{intent}' with {len(structured_task['linked_objectives'])} linked objectives."
    }
    state_diffs.append(diff_entry)

    return {
        "intent": intent,
        "pending_workflow": pending_workflow,
        "pending_booking": pending_booking if pending_booking else None,
        "structured_task": structured_task,
        "state_diffs": state_diffs,
        "current_node": "router_node",
        "execution_events": events
    }
