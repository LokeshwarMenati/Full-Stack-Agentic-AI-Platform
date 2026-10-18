import os
import re
import tempfile
import time
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.persistence.database import get_db
from app.models.voice_session import VoiceSession
from app.services.chat_service import ChatService
from app.schemas.voice import (
    CreateVoiceSessionRequest,
    VoiceSessionResponse,
    EndVoiceSessionResponse,
    TranscribeResponse,
    VoiceSpeakRequest,
    VoiceSpeakResponse,
)

router = APIRouter(prefix="/api/voice", tags=["Voice"])

# Permitted audio MIME types for upload validation
ALLOWED_AUDIO_MIME_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "application/octet-stream",  # fallback for some webm blob recordings
}
MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB


@router.post("/sessions", response_model=VoiceSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_voice_session(
    request: CreateVoiceSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Initializes or links an active Voice Session to an existing LangGraph conversation thread."""
    thread_id = request.thread_id or str(uuid.uuid4())

    # Ensure conversation thread exists in persistent storage
    await ChatService.get_or_create_conversation(db, thread_id, first_message="Voice Session Started")

    session = VoiceSession(
        id=str(uuid.uuid4()),
        thread_id=thread_id,
        mode=request.mode,
        status="active",
        voice_preference=request.voice_preference,
        turns_count=0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"Created Voice Session {session.id} (mode={session.mode}) on thread {thread_id}")

    return VoiceSessionResponse(
        session_id=session.id,
        thread_id=session.thread_id,
        mode=session.mode,
        status=session.status,
        voice_preference=session.voice_preference,
        turns_count=session.turns_count,
        created_at=session.created_at,
        ended_at=session.ended_at
    )


@router.get("/sessions/{session_id}", response_model=VoiceSessionResponse)
async def get_voice_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves metadata and status for a voice session."""
    query = select(VoiceSession).where(VoiceSession.id == session_id)
    session = (await db.execute(query)).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Voice session not found")

    return VoiceSessionResponse(
        session_id=session.id,
        thread_id=session.thread_id,
        mode=session.mode,
        status=session.status,
        voice_preference=session.voice_preference,
        turns_count=session.turns_count,
        created_at=session.created_at,
        ended_at=session.ended_at
    )


@router.post("/sessions/{session_id}/end", response_model=EndVoiceSessionResponse)
async def end_voice_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Ends a voice session, calculates total duration, and records session closure."""
    query = select(VoiceSession).where(VoiceSession.id == session_id)
    session = (await db.execute(query)).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Voice session not found")

    ended_at = datetime.now(timezone.utc)
    session.status = "ended"
    session.ended_at = ended_at

    created_at = session.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    duration_secs = max(0, int((ended_at - created_at).total_seconds()))
    await db.commit()
    await db.refresh(session)

    logger.info(f"Ended Voice Session {session_id} (duration={duration_secs}s, turns={session.turns_count})")

    return EndVoiceSessionResponse(
        session_id=session.id,
        thread_id=session.thread_id,
        status=session.status,
        turns_count=session.turns_count,
        duration_seconds=duration_secs,
        ended_at=ended_at
    )


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribes user voice audio recordings using Whisper (Groq) or Gemini multimodal audio."""
    start_time = time.time()

    # Content type validation
    content_type = (file.content_type or "audio/webm").lower().split(";")[0].strip()
    if content_type not in ALLOWED_AUDIO_MIME_TYPES:
        logger.warning(f"Rejected unsupported audio format: {content_type}")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported audio format '{content_type}'. Supported: {', '.join(sorted(ALLOWED_AUDIO_MIME_TYPES))}"
        )

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file exceeds maximum limit of {MAX_AUDIO_SIZE_BYTES // (1024 * 1024)}MB."
        )

    if file_size < 300:
        return TranscribeResponse(
            text="",
            engine="none",
            status="empty",
            duration_ms=int((time.time() - start_time) * 1000)
        )

    # 1. Groq Whisper (lightning fast, ~200ms)
    if settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("gsk_your_"):
        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as audio_file:
                    transcription = client.audio.transcriptions.create(
                        model="whisper-large-v3",
                        file=audio_file,
                        response_format="json"
                    )
                clean_text = (transcription.text or "").strip()
                duration = int((time.time() - start_time) * 1000)
                logger.info(f"Groq Whisper transcribed audio ({duration}ms): '{clean_text}'")
                return TranscribeResponse(
                    text=clean_text,
                    engine="whisper-large-v3",
                    status="success",
                    duration_ms=duration
                )
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        except Exception as e:
            logger.warning(f"Groq Whisper transcription failed: {e}. Trying Gemini...")

    # 2. Google Gemini Multimodal Audio
    if settings.GOOGLE_API_KEY and not settings.GOOGLE_API_KEY.startswith("AIzaSy_your_"):
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content([
                "Transcribe the spoken audio query verbatim. Return only the transcription without punctuation commentary or preamble.",
                {"mime_type": content_type or "audio/webm", "data": content}
            ])
            clean_text = (response.text or "").strip()
            duration = int((time.time() - start_time) * 1000)
            logger.info(f"Gemini transcribed audio ({duration}ms): '{clean_text}'")
            return TranscribeResponse(
                text=clean_text,
                engine="gemini-audio",
                status="success",
                duration_ms=duration
            )
        except Exception as e:
            logger.warning(f"Gemini transcription failed: {e}")

    # 3. Dev deterministic transcription fallback for offline / mock testing
    if settings.LLM_PROVIDER == "mock" or settings.APP_ENV in ("development", "test"):
        duration = int((time.time() - start_time) * 1000)
        logger.info(f"Using dev audio transcription fallback ({duration}ms)")
        return TranscribeResponse(
            text="Hi",
            engine="nexus-dev-audio",
            status="success",
            duration_ms=duration
        )

    duration = int((time.time() - start_time) * 1000)
    logger.error("No configured audio transcription provider is available.")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Audio transcription is unavailable. Configure GROQ_API_KEY or GOOGLE_API_KEY, or use a browser with speech recognition support.",
    )


@router.post("/speak", response_model=VoiceSpeakResponse)
async def prepare_speech_text(request: VoiceSpeakRequest):
    """Prepares natural, cleaned text for browser speech synthesis, stripping markdown symbols and URLs."""
    raw = request.text or ""

    # Clean markdown formatting for natural speech synthesis
    clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', raw)  # markdown links -> text
    clean = re.sub(r'[`*_#~>-]', '', clean)                 # formatting symbols
    clean = re.sub(r'https?://\S+', '', clean)              # strip raw URLs
    clean = re.sub(r'\s+', ' ', clean).strip()              # normalize whitespace

    return VoiceSpeakResponse(
        clean_text=clean,
        audio_url=None,
        strategy="browser_synthesis"
    )


@router.websocket("/ws")
async def websocket_voice_endpoint(websocket: WebSocket):
    """Bidirectional WebSocket connection for streaming real-time audio and voice synthesis events."""
    await websocket.accept()
    logger.info("Voice WebSocket connection established.")
    audio_chunks = bytearray()
    thread_id = str(uuid.uuid4())

    try:
        # Send initial connection handshake
        await websocket.send_json({
            "type": "connected",
            "thread_id": thread_id,
            "message": "Voice studio connected. Stream audio chunks."
        })

        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                # Accumulate audio frames
                audio_chunks.extend(message["bytes"])
            elif "text" in message and message["text"]:
                import json
                try:
                    payload = json.loads(message["text"])
                    msg_type = payload.get("type")

                    if msg_type == "init":
                        if payload.get("thread_id"):
                            thread_id = payload["thread_id"]
                        await websocket.send_json({"type": "ready", "thread_id": thread_id})

                    elif msg_type == "audio_end":
                        # Process buffered audio
                        if len(audio_chunks) < 300:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Audio stream too short or empty."
                            })
                            audio_chunks.clear()
                            continue

                        await websocket.send_json({"type": "transcribing"})

                        # Transcribe via Groq Whisper or fallback
                        transcription_text = ""
                        if settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("gsk_your_"):
                            try:
                                from groq import Groq
                                client = Groq(api_key=settings.GROQ_API_KEY)
                                with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                                    tmp.write(audio_chunks)
                                    tmp_path = tmp.name

                                try:
                                    with open(tmp_path, "rb") as af:
                                        t_res = client.audio.transcriptions.create(
                                            model="whisper-large-v3",
                                            file=af,
                                            response_format="json"
                                        )
                                    transcription_text = (t_res.text or "").strip()
                                finally:
                                    if os.path.exists(tmp_path):
                                        os.remove(tmp_path)
                            except Exception as e:
                                logger.warning(f"WebSocket Groq transcription failed: {e}")

                        if not transcription_text:
                            transcription_text = payload.get("fallback_text", "Hi")

                        audio_chunks.clear()

                        await websocket.send_json({
                            "type": "transcription",
                            "text": transcription_text
                        })

                        # Run through LangGraph agent
                        await websocket.send_json({"type": "processing", "node": "router"})
                        from app.persistence.database import AsyncSessionLocal
                        async with AsyncSessionLocal() as db_session:
                            chat_res = await ChatService.execute_turn(
                                session=db_session,
                                thread_id=thread_id,
                                user_message_text=transcription_text
                            )

                        # Clean speech text
                        clean_speech = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', chat_res.content)
                        clean_speech = re.sub(r'[`*_#~>-]', '', clean_speech)
                        clean_speech = re.sub(r'https?://\S+', '', clean_speech)
                        clean_speech = re.sub(r'\s+', ' ', clean_speech).strip()

                        await websocket.send_json({
                            "type": "response",
                            "text": chat_res.content,
                            "speech_text": clean_speech,
                            "citations": [c.model_dump() for c in chat_res.citations],
                            "thread_id": thread_id
                        })

                except Exception as ex:
                    logger.error(f"Error handling WS message: {ex}")
                    await websocket.send_json({"type": "error", "message": str(ex)})

    except WebSocketDisconnect:
        logger.info(f"Voice WebSocket disconnected gracefully for thread {thread_id}")
    except RuntimeError as re:
        if "disconnect message has been received" in str(re):
            logger.info(f"Voice WebSocket closed for thread {thread_id}")
        else:
            logger.error(f"WebSocket runtime error: {re}")
    except Exception as e:
        logger.error(f"Unexpected WebSocket error: {e}")
