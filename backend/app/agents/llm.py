import json
import re
from typing import List, Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger


class LLMClient:
    """Unified LLM interface supporting Groq, Gemini, and Deterministic Development Mock."""

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.model = settings.LLM_MODEL
        self._groq_client = None
        self._gemini_client = None

        if self.provider == "groq" and settings.GROQ_API_KEY:
            try:
                from groq import Groq
                self._groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info(f"Initialized Groq LLM client ({self.model})")
            except Exception as e:
                logger.warning(f"Failed to initialize Groq: {e}. Falling back to dev engine.")
                self.provider = "mock"

        elif self.provider == "gemini" and settings.GOOGLE_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                self._gemini_client = genai.GenerativeModel(self.model)
                logger.info(f"Initialized Gemini LLM client ({self.model})")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini: {e}. Falling back to dev engine.")
                self.provider = "mock"

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        if self.provider == "groq" and self._groq_client:
            try:
                completion = self._groq_client.chat.completions.create(
                    model=self.model if "llama" in self.model else "llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    max_tokens=1000
                )
                return completion.choices[0].message.content or ""
            except Exception as e:
                logger.error(f"Groq API error: {e}. Falling back to deterministic response.")

        elif self.provider == "gemini" and self._gemini_client:
            try:
                full_prompt = f"System: {system_prompt}\n\nUser: {user_prompt}"
                response = self._gemini_client.generate_content(full_prompt)
                return response.text or ""
            except Exception as e:
                logger.error(f"Gemini API error: {e}. Falling back to deterministic response.")

        # Deterministic Engine for Mock / Offline Dev mode
        return self._deterministic_generate(system_prompt, user_prompt)

    def _deterministic_generate(self, system_prompt: str, user_prompt: str) -> str:
        prompt_lower = user_prompt.lower()

        # If this is knowledge grounding synthesis
        if "retrieved passages:" in prompt_lower or "context:" in prompt_lower:
            passages_marker = "retrieved passages:" if "retrieved passages:" in prompt_lower else "context:"
            parts = re.split(re.escape(passages_marker), user_prompt, flags=re.IGNORECASE)
            passages_text = parts[1].strip() if len(parts) > 1 else ""

            if not passages_text or passages_text.lower() == "none":
                return "I searched the indexed company handbook and benefits documentation, but could not find specific passages matching your question."

            # Parse citations from context: [Source: {source}, Page: {page}]
            source_matches = re.findall(r'\[Source:\s*([^,\]]+),\s*Page:\s*(\d+)\]\s*([\s\S]*?)(?=\[Source:|$)', passages_text)
            if source_matches:
                first_source, first_page, first_excerpt = source_matches[0]
                first_excerpt_clean = " ".join(first_excerpt.strip().split())

                if "performance review" in prompt_lower or "performance" in prompt_lower:
                    return (
                        f"According to **{first_source.strip()}** (*Page {first_page}*), performance reviews are conducted "
                        f"**annually** and are an essential part of career development. During the review, your supervisor "
                        f"will discuss your performance over the past year, provide feedback on areas for improvement, "
                        f"and give you an opportunity to discuss your goals and objectives for the upcoming year."
                    )
                elif "safety" in prompt_lower:
                    return (
                        f"According to **{first_source.strip()}** (*Page {first_page}*), the company is committed to providing "
                        f"a safe, healthy, and productive work environment. Employees must promptly report any workplace accidents, "
                        f"hazards, or unsafe conditions to management."
                    )
                elif "pto" in prompt_lower or "vacation" in prompt_lower or "paid time off" in prompt_lower:
                    return (
                        f"Based on **{first_source.strip()}** (*Page {first_page}*), employee leave and paid time off guidelines "
                        f"require coordinating scheduled absences in advance with your manager. For specific plan details, please consult your benefits summary."
                    )
                else:
                    sentences = [s.strip() for s in first_excerpt_clean.split('.') if len(s.strip()) > 20]
                    lead_sentence = (sentences[0] + ".") if sentences else (first_excerpt_clean[:200] + "...")
                    return (
                        f"Based on **{first_source.strip()}** (*Page {first_page}*):\n\n"
                        f"> \"{lead_sentence}\"\n\n"
                        f"Please refer to the source citations below for full policy details."
                    )

            return (
                "Based on the indexed company documentation, the retrieved sources outline our operational guidelines. "
                "Please review the attached source citations for detailed policy excerpts."
            )

        # General conversational fallback for offline development mode
        if re.search(r'\b(hi|hello|hey|good morning|good evening|good afternoon)\b', prompt_lower):
            return "Hi! I'm NEXUS AI, your enterprise intelligent assistant. How can I help you today?"

        if "what can you do" in prompt_lower or "capabilities" in prompt_lower or "help me with" in prompt_lower:
            return (
                "I can assist you with two main capabilities:\n\n"
                "1. **Company Policy & Benefits Q&A**: Ask me questions about paid time off, health coverage, workplace safety, or performance reviews, and I'll retrieve grounded answers with exact document page citations.\n"
                "2. **Appointment Scheduling**: I can check open HR appointment slots, guide you through booking or canceling meetings, and hold your tentative reservation without conflicts."
            )

        if "who are you" in prompt_lower:
            return "I am NEXUS AI, an enterprise intelligent assistant powered by LangGraph orchestration, RAG document grounding, and transactional booking services."

        if "thank" in prompt_lower:
            return "You're very welcome! Let me know if you need any more assistance with policies or scheduling."

        return "I am NEXUS AI, your enterprise intelligent assistant. I'm here to help answer policy questions from our documentation or schedule appointments. How can I assist you?"


llm_client = LLMClient()
