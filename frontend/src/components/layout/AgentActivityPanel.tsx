import React, { useState } from 'react';
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Database,
  Layers,
  Code,
  Check,
} from 'lucide-react';
import type { ExecutionEvent, PendingBooking } from '../../types';

interface AgentActivityPanelProps {
  events: ExecutionEvent[];
  pendingBooking?: PendingBooking;
  currentNode?: string;
  isOpen: boolean;
  onClose: () => void;
  intent?: string;
  missingFields?: string[];
  workflowStatus?: string;
  threadId?: string;
}

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({
  events,
  pendingBooking,
  currentNode = 'idle',
  isOpen,
  onClose,
  intent,
  missingFields = [],
  workflowStatus = 'IDLE',
  threadId,
}) => {
  const [showRawStateModal, setShowRawStateModal] = useState(false);

  if (!isOpen) return null;

  // Real Graph Node sequence representing the actual LangGraph topology
  const graphNodes = [
    { id: 'START', label: 'User Input', sub: 'Input Event & Dispatch' },
    { id: 'router_node', label: 'Intent Router', sub: 'Intent Classifier' },
    { id: 'faq_node', label: 'RAG Retrieval', sub: 'PDF Grounded Passages' },
    { id: 'booking_node', label: 'Booking Workflow', sub: 'Slot Validation & Gate' },
    { id: 'response_node', label: 'Response Composer', sub: 'Evidence Synthesis' },
    { id: 'END', label: 'Final Output', sub: 'Delivered to Turn' },
  ];

  // Map of visited node names based on real backend events
  const visitedNodeSet = new Set(
    events.map((e) => e.node_name.toLowerCase().replace('_node', ''))
  );
  if (events.length > 0) {
    visitedNodeSet.add('start');
  }

  // Normalized current node
  const activeNodeClean = (currentNode || 'idle').toLowerCase().replace('_node', '');

  // Determine overall execution status badge
  const displayStatus =
    activeNodeClean !== 'idle'
      ? 'EXECUTING'
      : events.length > 0
      ? 'READY'
      : 'STANDBY';

  const statusBadgeColor =
    displayStatus === 'EXECUTING'
      ? 'bg-[#176BFF]/20 text-[#00E5FF] border-[#00E5FF]/40'
      : displayStatus === 'READY'
      ? 'bg-[#00E6A0]/15 text-[#00E6A0] border-[#00E6A0]/40'
      : 'bg-[#0A1830] text-[#5A7199] border-[#176BFF]/20';

  return (
    <>
      <aside
        aria-label="Live Agent Execution Panel"
        className="flex h-full w-[350px] shrink-0 flex-col border-l border-[#176BFF]/20 bg-[#050B19]/95 backdrop-blur-2xl transition-all duration-300 z-20 select-none"
      >
        {/* 1. Header with Live Agent Execution Title & Status */}
        <div className="flex items-center justify-between border-b border-[#176BFF]/20 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#00E5FF]" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FF]">
                Live Agent Execution
              </span>
              <p className="text-[10px] text-[#5A7199] font-mono">LangGraph StateGraph</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-semibold border ${statusBadgeColor}`}
            >
              {displayStatus}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#5A7199] hover:bg-[#0A1830] hover:text-[#F4F7FF] transition-colors"
              title="Collapse panel"
              aria-label="Collapse live agent execution panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* 2. Graph Node Sequence Visualizer */}
          <div className="rounded-xl border border-[#176BFF]/20 bg-[#071329]/80 p-3 shadow-inner">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#94A9C8] mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#00E5FF]" />
                <span>GRAPH NODE SEQUENCE</span>
              </div>
              <span className="text-[9px] text-[#5A7199] font-mono">
                {activeNodeClean !== 'idle' ? `Node: ${activeNodeClean}` : 'Idle'}
              </span>
            </div>

            <div className="space-y-1.5 relative">
              {graphNodes.map((gn, idx) => {
                const nodeKey = gn.id.toLowerCase().replace('_node', '');
                const isCurrent =
                  activeNodeClean.includes(nodeKey) ||
                  (nodeKey === 'start' && activeNodeClean === 'router');
                const isVisited =
                  visitedNodeSet.has(nodeKey) ||
                  (nodeKey === 'start' && events.length > 0) ||
                  (nodeKey === 'end' &&
                    events.some((e) => e.node_name.includes('response')));

                return (
                  <div
                    key={gn.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                      isCurrent
                        ? 'bg-[#176BFF]/20 border-[#00E5FF]/60 text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                        : isVisited
                        ? 'bg-[#0A1830] border-[#176BFF]/30 text-[#F4F7FF]'
                        : 'bg-[#030817]/40 border-[#176BFF]/10 text-[#5A7199]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-mono ${
                          isCurrent
                            ? 'bg-[#00E5FF] text-[#030817] font-bold animate-pulse'
                            : isVisited
                            ? 'bg-[#00E6A0]/20 text-[#00E6A0] border border-[#00E6A0]/40'
                            : 'bg-[#0A1830] text-[#5A7199] border border-[#176BFF]/20'
                        }`}
                      >
                        {isVisited && !isCurrent ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                      </span>
                      <span className="font-medium text-xs truncate">{gn.label}</span>
                    </div>

                    <span className="text-[9px] font-mono text-[#5A7199] truncate max-w-[110px]">
                      {gn.sub}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Current State Inspector (Structured Backend State) */}
          <div className="rounded-xl border border-[#176BFF]/20 bg-[#071329]/80 p-3 shadow-inner space-y-2">
            <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#94A9C8] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-[#00E5FF]" />
                <span>STATE INSPECTOR</span>
              </div>
              <span className="text-[9px] font-mono text-[#00E6A0]">VALIDATED</span>
            </div>

            <div className="space-y-1.5 text-xs">
              {/* Intent */}
              <div className="flex items-center justify-between py-1 border-b border-[#176BFF]/15">
                <span className="text-[#5A7199] text-[11px]">Intent:</span>
                <span className="font-mono text-[11px] font-medium text-[#00E5FF] truncate max-w-[180px]">
                  {intent || (pendingBooking ? 'booking_workflow' : 'general_inquiry')}
                </span>
              </div>

              {/* Attendee Name */}
              <div className="flex items-center justify-between py-1 border-b border-[#176BFF]/15">
                <span className="text-[#5A7199] text-[11px]">Name:</span>
                <span
                  className={`text-[11px] font-medium truncate max-w-[180px] ${
                    pendingBooking?.full_name ? 'text-[#F4F7FF]' : 'text-[#5A7199] italic'
                  }`}
                >
                  {pendingBooking?.full_name || 'Not provided'}
                </span>
              </div>

              {/* Attendee Email */}
              <div className="flex items-center justify-between py-1 border-b border-[#176BFF]/15">
                <span className="text-[#5A7199] text-[11px]">Email:</span>
                <span
                  className={`text-[11px] font-medium truncate max-w-[180px] ${
                    pendingBooking?.email ? 'text-[#00E5FF] font-mono' : 'text-[#5A7199] italic'
                  }`}
                >
                  {pendingBooking?.email || 'Not provided'}
                </span>
              </div>

              {/* Booking Type */}
              <div className="flex items-center justify-between py-1 border-b border-[#176BFF]/15">
                <span className="text-[#5A7199] text-[11px]">Booking Type:</span>
                <span className="text-[11px] text-[#94A9C8] font-medium truncate max-w-[180px]">
                  {pendingBooking?.appointment_type || 'Performance Review'}
                </span>
              </div>

              {/* Selected Slot */}
              <div className="flex items-center justify-between py-1 border-b border-[#176BFF]/15">
                <span className="text-[#5A7199] text-[11px]">Selected Slot:</span>
                <span
                  className={`text-[11px] font-mono ${
                    pendingBooking?.slot_id ? 'text-[#00E6A0] font-semibold' : 'text-[#5A7199] italic'
                  }`}
                >
                  {pendingBooking?.slot_id || 'Pending selection'}
                </span>
              </div>

              {/* Missing Fields */}
              <div className="flex items-center justify-between py-1 border-b border-[#176BFF]/15">
                <span className="text-[#5A7199] text-[11px]">Missing Fields:</span>
                <span className="text-[11px] font-mono text-[#FFB020]">
                  {missingFields.length > 0 ? missingFields.join(', ') : 'None (Complete)'}
                </span>
              </div>

              {/* Task Status */}
              <div className="flex items-center justify-between py-1">
                <span className="text-[#5A7199] text-[11px]">Task Status:</span>
                <span className="text-[11px] font-mono font-semibold text-[#00E6A0]">
                  {pendingBooking?.status || workflowStatus || 'STANDBY'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Turn Event History (Real LangGraph Events) */}
          <div>
            <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#94A9C8] mb-2 flex items-center justify-between">
              <span>TURN EVENT HISTORY ({events.length})</span>
              <span className="text-[9px] font-mono text-[#5A7199]">Live Stream</span>
            </div>

            {events.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#176BFF]/20 bg-[#071329]/40 p-4 text-center text-xs text-[#5A7199] leading-relaxed">
                No events recorded yet. Send a message to start graph execution.
              </div>
            ) : (
              <div className="space-y-2">
                {events
                  .slice()
                  .reverse()
                  .map((evt) => {
                    const isSuccess = evt.status === 'SUCCESS';
                    const isError = evt.status === 'ERROR';

                    return (
                      <div
                        key={evt.event_id}
                        className="rounded-xl border border-[#176BFF]/20 bg-[#071329]/90 p-2.5 text-xs shadow-sm hover:border-[#00E5FF]/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[11px] font-bold text-[#00E5FF]">
                            {evt.node_name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {evt.duration_ms !== undefined && (
                              <span className="flex items-center gap-0.5 font-mono text-[9px] text-[#5A7199]">
                                <Clock className="h-2.5 w-2.5" />
                                {evt.duration_ms}ms
                              </span>
                            )}
                            {isSuccess ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#00E6A0]" />
                            ) : isError ? (
                              <AlertCircle className="h-3.5 w-3.5 text-[#FF3B5C]" />
                            ) : (
                              <Info className="h-3.5 w-3.5 text-[#176BFF]" />
                            )}
                          </div>
                        </div>
                        <p className="text-[#94A9C8] text-[11px] leading-snug">{evt.summary}</p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* 5. Full State Inspection Action at bottom */}
        <div className="p-3 border-t border-[#176BFF]/20 shrink-0 bg-[#050B19]">
          <button
            onClick={() => setShowRawStateModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0A1830] hover:bg-[#176BFF]/20 text-[#00E5FF] border border-[#176BFF]/30 text-xs font-medium transition-all"
          >
            <Code className="h-3.5 w-3.5" />
            <span>Full State Inspection</span>
          </button>
        </div>
      </aside>

      {/* Raw State Inspection Modal */}
      {showRawStateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl bg-[#071329] border border-[#176BFF]/40 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#176BFF]/20">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-[#00E5FF]" />
                <span className="font-bold text-sm text-[#F4F7FF]">StateGraph Raw State Inspector</span>
              </div>
              <button
                onClick={() => setShowRawStateModal(false)}
                className="p-1 text-[#5A7199] hover:text-[#F4F7FF]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs text-[#00E5FF] bg-[#030817]/90">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    thread_id: threadId || 'active_session',
                    current_node: currentNode,
                    intent: intent || 'general_inquiry',
                    pending_booking: pendingBooking || null,
                    missing_fields: missingFields,
                    execution_events_count: events.length,
                    execution_events: events,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="p-3 border-t border-[#176BFF]/20 flex justify-end bg-[#050B19]">
              <button
                onClick={() => setShowRawStateModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#176BFF] text-white text-xs font-semibold hover:brightness-110"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
