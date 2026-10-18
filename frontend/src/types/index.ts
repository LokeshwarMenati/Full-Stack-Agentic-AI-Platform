export interface Citation {
  source: string;
  page: number;
  excerpt: string;
  score?: number;
}

export interface ExecutionEvent {
  event_id: string;
  node_name: string;
  event_type: string;
  status: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  summary: string;
  duration_ms?: number;
  timestamp: string;
}

export interface PendingBooking {
  full_name?: string;
  email?: string;
  appointment_type?: string;
  slot_id?: string;
  status?: string;
}

export interface ConfirmedBooking {
  id: string;
  booking_reference: string;
  full_name: string;
  email: string;
  appointment_type: string;
  slot_id: string;
  status: string;
  formatted_time?: string;
  created_at: string;
}

export type OperatingSurface = 'work' | 'execution' | 'evidence';

export interface LinkedObjective {
  id: string;
  description: string;
  target_node: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  result_summary?: string;
}

export interface PlannedOperation {
  operation_id: string;
  node_name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration_ms?: number;
  state_updates?: Record<string, any>;
}

export interface StructuredTask {
  task_id: string;
  thread_id: string;
  user_intent: string;
  linked_objectives: LinkedObjective[];
  required_inputs: string[];
  collected_inputs: Record<string, any>;
  missing_inputs: string[];
  planned_operations: PlannedOperation[];
  approval_required: boolean;
  approval_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  consequential_action_description?: string;
  execution_status: 'planned' | 'in_progress' | 'waiting_input' | 'waiting_approval' | 'completed' | 'cancelled' | 'failed';
  evidence_references?: Record<string, any>[];
  final_result?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalGate {
  required: boolean;
  status: 'pending_authorization' | 'authorized' | 'rejected';
  action: string;
  slot_id?: string;
  slot_time?: string;
  attendee_name?: string;
  attendee_email?: string;
  appointment_type?: string;
}

export interface StateDiffEntry {
  timestamp: number;
  from_node: string;
  to_node: string;
  added_keys: string[];
  updated_keys: Record<string, any>;
  summary: string;
}

export interface WorkflowReplayResponse {
  replay_id: string;
  original_thread_id: string;
  is_simulation: boolean;
  status: string;
  original_turns_count: number;
  replayed_turns_count: number;
  execution_path: string[];
  state_transitions: Array<{
    turn: number;
    input: string;
    node: string;
    intent: string;
    is_simulation: boolean;
  }>;
  side_effects_prevented: string[];
  comparison: {
    original_events_count: number;
    replayed_events_count: number;
    path_fidelity: string;
    side_effects_safeguard: string;
  };
  replay_summary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  execution_events?: ExecutionEvent[];
  pending_booking?: PendingBooking;
  booking_confirmed?: ConfirmedBooking;
  structured_task?: StructuredTask;
  approval_gate?: ApprovalGate;
  state_diffs?: StateDiffEntry[];
  suggested_actions?: string[];
  created_at: string;
}

export interface ConversationSummary {
  thread_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ConversationDetail {
  thread_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface Slot {
  id: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  booked_by_booking_id?: string;
  formatted_start?: string;
  formatted_end?: string;
  timezone: string;
}

export interface Booking {
  id: string;
  booking_reference: string;
  full_name: string;
  email: string;
  appointment_type: string;
  slot_id: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'PENDING';
  thread_id?: string;
  created_at: string;
  updated_at: string;
  start_time?: string;
  end_time?: string;
  formatted_time?: string;
}

export interface DocumentStats {
  filename: string;
  total_pages: number;
  total_chunks: number;
  file_size_bytes: number;
  last_ingested_at?: string;
}

export interface KnowledgeStatus {
  is_indexed: boolean;
  total_documents: number;
  total_pages: number;
  total_chunks: number;
  documents: DocumentStats[];
  embedding_provider: string;
  embedding_model: string;
  vector_store_type: string;
  last_ingestion?: string;
  errors: string[];
}

export interface ActivityTraceEvent {
  id: string;
  thread_id?: string;
  event_type: string;
  node_name: string;
  status: string;
  summary: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export type AgentOrbState = 'idle' | 'processing' | 'retrieving' | 'executing' | 'completed' | 'error';

export type VoiceMode = 'push_to_talk' | 'live_conversation';

export type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'speaking'
  | 'muted'
  | 'error'
  | 'ended';

export interface VoiceSession {
  session_id: string;
  thread_id: string;
  mode: VoiceMode;
  status: 'active' | 'paused' | 'ended';
  voice_preference?: string;
  turns_count: number;
  created_at: string;
  ended_at?: string;
}

export interface VoiceSettings {
  outputEnabled: boolean;
  selectedVoice: string;
  speechRate: number;
  mode: VoiceMode;
  autoListen: boolean;
  transcriptVisible: boolean;
}

