import type {
  ConversationSummary,
  ConversationDetail,
  Slot,
  Booking,
  KnowledgeStatus,
  ActivityTraceEvent,
  Citation,
  ExecutionEvent,
  VoiceSession,
  VoiceMode,
  StructuredTask,
  ApprovalGate,
  StateDiffEntry,
  WorkflowReplayResponse
} from '../types';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '') : '';
const API_BASE = RAW_BASE ? `${RAW_BASE}/api` : '/api';
const HEALTH_BASE = RAW_BASE ? `${RAW_BASE}/health` : '/health';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errData: any = {};
    try {
      errData = await response.json();
    } catch {
      errData = { error: response.statusText };
    }
    const message = errData.detail || errData.error || `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errData);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => fetch(HEALTH_BASE).then(r => r.json()),
  getReadiness: () => request<{ ready: boolean; database: string; vector_store: string; indexed_chunks: number; llm_provider: string }>('/health/ready'),

  // Chat
  sendMessage: (message: string, thread_id?: string, signal?: AbortSignal) =>
    request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, thread_id }),
      signal,
    }),

  // Conversations
  getConversations: () => request<ConversationSummary[]>('/conversations'),
  getConversation: (thread_id: string) => request<ConversationDetail>(`/conversations/${thread_id}`),
  createConversation: (title?: string) =>
    request<ConversationDetail>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  // Slots
  getSlots: (appointment_type?: string) => {
    const q = appointment_type ? `?appointment_type=${encodeURIComponent(appointment_type)}` : '';
    return request<Slot[]>(`/slots${q}`);
  },
  seedSlots: () => request<{ message: string; count: number }>('/slots/seed', { method: 'POST' }),

  // Bookings
  getBookings: (email?: string) => {
    const q = email ? `?email=${encodeURIComponent(email)}` : '';
    return request<Booking[]>(`/bookings${q}`);
  },
  getBooking: (id: string) => request<Booking>(`/bookings/${id}`),
  createBooking: (data: { full_name: string; email: string; appointment_type: string; slot_id: string; thread_id?: string }) =>
    request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancelBooking: (id: string) =>
    request<{ id: string; booking_reference: string; status: string; message: string }>(`/bookings/${id}/cancel`, {
      method: 'POST',
    }),

  // Knowledge
  getKnowledgeStatus: () => request<KnowledgeStatus>('/knowledge/status'),
  ingestKnowledge: () => request<{ success: boolean; message: string; total_pages_ingested: number; total_chunks_created: number }>('/knowledge/ingest', { method: 'POST' }),
  uploadKnowledgeDocument: async (file: File): Promise<{ success: boolean; filename: string; total_chunks_indexed: number; total_pages: number; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/knowledge/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },
  queryKnowledge: (query: string, top_k: number = 4) =>
    request<{ query: string; citations: Citation[]; total_found: number }>('/knowledge/query', {
      method: 'POST',
      body: JSON.stringify({ query, top_k }),
    }),

  // Activity Traces
  getActivity: (thread_id?: string, limit: number = 50) => {
    let q = `?limit=${limit}`;
    if (thread_id) q += `&thread_id=${encodeURIComponent(thread_id)}`;
    return request<ActivityTraceEvent[]>(`/activity${q}`);
  },

  // Voice Transcription & Sessions
  transcribeAudio: async (audioBlob: Blob): Promise<{ text: string }> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    const res = await fetch(`${API_BASE}/voice/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Transcription failed: ${res.statusText}`);
    return res.json();
  },

  createVoiceSession: (thread_id?: string, mode: VoiceMode = 'live_conversation', voice_preference?: string) =>
    request<VoiceSession>('/voice/sessions', {
      method: 'POST',
      body: JSON.stringify({ thread_id, mode, voice_preference }),
    }),

  getVoiceSession: (session_id: string) =>
    request<VoiceSession>(`/voice/sessions/${session_id}`),

  endVoiceSession: (session_id: string) =>
    request<{ session_id: string; duration_seconds: number; status: string }>(`/voice/sessions/${session_id}/end`, {
      method: 'POST',
    }),

  prepareVoiceSpeech: (text: string, voice?: string) =>
    request<{ clean_text: string; audio_url?: string; strategy: string }>('/voice/speak', {
      method: 'POST',
      body: JSON.stringify({ text, voice }),
    }),

  // Tasks, Workflow Execution & Safe Replay
  getTaskExecutionState: (thread_id: string) =>
    request<{
      thread_id: string;
      structured_task: StructuredTask;
      approval_gate?: ApprovalGate;
      state_diffs: StateDiffEntry[];
      pending_booking?: any;
      booking_confirmed?: any;
      execution_events: ExecutionEvent[];
    }>(`/tasks/${thread_id}`),

  editTaskInputs: (
    thread_id: string,
    inputs: { full_name?: string; email?: string; slot_id?: string; appointment_type?: string }
  ) =>
    request<{
      status: string;
      thread_id: string;
      pending_booking: any;
      structured_task: StructuredTask;
      approval_gate?: ApprovalGate;
      state_diffs: StateDiffEntry[];
    }>(`/tasks/${thread_id}/edit-inputs`, {
      method: 'POST',
      body: JSON.stringify(inputs),
    }),

  approveTaskAction: (thread_id: string, approved: boolean = true) =>
    request<any>(`/tasks/${thread_id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    }),

  runAutomationTask: (actionId: string) =>
    request<{ success: boolean; id: string; message: string; duration_ms: number }>('/tasks/automation/run', {
      method: 'POST',
      body: JSON.stringify({ id: actionId }),
    }),

  replayWorkflow: (thread_id: string, dry_run: boolean = true) =>
    request<WorkflowReplayResponse>(`/tasks/${thread_id}/replay`, {
      method: 'POST',
      body: JSON.stringify({ thread_id, dry_run }),
    }),

  // SSE Stream
  streamMessage: (
    message: string,
    thread_id: string,
    handlers: {
      onStatus?: (data: { message: string; node: string }) => void;
      onAgentEvent?: (event: ExecutionEvent) => void;
      onCitations?: (citations: Citation[]) => void;
      onToken?: (token: string) => void;
      onComplete?: (fullResponse: any) => void;
      onError?: (err: any) => void;
    }
  ): (() => void) => {
    const controller = new AbortController();

    fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, thread_id }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`SSE stream failed with status ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        const parseEventChunk = (chunkText: string) => {
          const trimmed = chunkText.trim();
          if (!trimmed) return;

          const lines = trimmed.split(/\r?\n/);
          let eventType = 'message';
          let dataStr = '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('event:')) {
              eventType = trimmedLine.slice(6).trim();
            } else if (trimmedLine.startsWith('data:')) {
              const dataContent = trimmedLine.slice(5).trim();
              dataStr = dataStr ? `${dataStr}\n${dataContent}` : dataContent;
            }
          }

          if (!dataStr) return;

          try {
            const parsed = JSON.parse(dataStr);
            if (eventType === 'status' && handlers.onStatus) handlers.onStatus(parsed);
            if (eventType === 'agent_event' && handlers.onAgentEvent) handlers.onAgentEvent(parsed);
            if (eventType === 'citations' && handlers.onCitations) handlers.onCitations(parsed);
            if (eventType === 'token' && handlers.onToken) handlers.onToken(parsed.token);
            if (eventType === 'complete' && handlers.onComplete) handlers.onComplete(parsed);
          } catch (err) {
            console.error('Error parsing SSE data:', err, dataStr);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              const remainingParts = buffer.split(/(?:\r?\n){2,}/);
              for (const part of remainingParts) {
                parseEventChunk(part);
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/(?:\r?\n){2,}/);
          buffer = parts.pop() || '';

          for (const part of parts) {
            parseEventChunk(part);
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && handlers.onError) {
          handlers.onError(err);
        }
      });

    return () => controller.abort();
  },
};
