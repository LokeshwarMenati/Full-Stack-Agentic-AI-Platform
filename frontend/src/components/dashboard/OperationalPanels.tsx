import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Layers,
  FileCheck,
  Mic,
  MicOff,
  ArrowRight,
  Volume2,
  Cpu,
  X,
  Sliders,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Booking, Citation, ExecutionEvent } from '../../types';

interface OperationalPanelsProps {
  threadId: string;
  onNavigateToBookings?: () => void;
  onNavigateToEvidence?: () => void;
  onStartVoice?: () => void;
  events?: ExecutionEvent[];
  currentNode?: string;
  isVoiceActive?: boolean;
  onToggleMuteVoice?: () => void;
  isVoiceMuted?: boolean;
}

export const OperationalPanels: React.FC<OperationalPanelsProps> = ({
  threadId,
  onNavigateToBookings,
  onNavigateToEvidence,
  onStartVoice,
  events = [],
  currentNode = 'idle',
  isVoiceActive = false,
  onToggleMuteVoice,
  isVoiceMuted = false,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // 1. Fetch real appointments from database
  useEffect(() => {
    api.getBookings()
      .then((data) => setBookings(data))
      .catch((err) => console.error('Failed to load operational bookings:', err));
  }, []);

  // 2. Fetch real citations for active thread
  useEffect(() => {
    if (threadId) {
      api.getConversation(threadId)
        .then((conv) => {
          const allCits: Citation[] = [];
          conv.messages.forEach((m) => {
            if (m.citations) {
              m.citations.forEach((c) => {
                if (!allCits.some((existing) => existing.excerpt === c.excerpt)) {
                  allCits.push(c);
                }
              });
            }
          });
          setCitations(allCits.slice(0, 4));
        })
        .catch(() => setCitations([]));
    }
  }, [threadId, events]);

  // Filter bookings based on active filter tab
  const filteredBookings = bookings.filter((b) => {
    if (appointmentFilter === 'all') return true;
    if (appointmentFilter === 'upcoming') return b.status === 'CONFIRMED' || b.status === 'PENDING';
    if (appointmentFilter === 'past') return b.status === 'CANCELLED';
    return true;
  });

  const graphNodes = [
    { id: 'START', label: 'User Input', sub: 'Input Event', type: 'entry' },
    { id: 'router', label: 'Intent Router', sub: 'Intent Classifier', type: 'decision' },
    { id: 'faq', label: 'RAG Retrieval', sub: 'PDF Citations', type: 'action' },
    { id: 'booking', label: 'Booking Engine', sub: 'Slot Validation', type: 'action' },
    { id: 'response', label: 'Response Composer', sub: 'Context Synthesis', type: 'output' },
    { id: 'END', label: 'Final Output', sub: 'Terminal Event', type: 'terminal' },
  ];

  const activeNodesSet = new Set(
    events.map((e) => e.node_name.toLowerCase().replace('_node', ''))
  );

  return (
    <div className="w-full mt-4 pt-4 border-t border-[#176BFF]/20 space-y-3.5 select-none">
      {/* Dashboard Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#00E5FF]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FF]">
            Operational Dashboard
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#5A7199]">Live Enterprise Telemetry</span>
      </div>

      {/* 4 Bottom Operational Dashboard Panels in 4-column responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 text-left">
        {/* Panel 1: Upcoming Appointments */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-[#071329]/80 border border-[#176BFF]/25 hover:border-[#176BFF]/50 transition-all shadow-lg backdrop-blur-md">
          <div>
            {/* Header + Filter Tabs */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#176BFF]/15">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F4F7FF]">
                <Calendar className="w-4 h-4 text-[#176BFF]" />
                <span>Appointments</span>
              </div>
              <div className="flex items-center bg-[#050B19] rounded-lg p-0.5 border border-[#176BFF]/20 text-[9px] font-mono">
                {(['upcoming', 'past', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAppointmentFilter(filter)}
                    className={`px-1.5 py-0.5 rounded capitalize transition-colors ${
                      appointmentFilter === filter
                        ? 'bg-[#176BFF] text-white font-bold'
                        : 'text-[#94A9C8] hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {filteredBookings.length === 0 ? (
              <div className="py-5 text-center text-xs text-[#5A7199]">
                No {appointmentFilter} appointments found.
              </div>
            ) : (
              <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
                {filteredBookings.slice(0, 3).map((b) => (
                  <div key={b.id} className="p-2 rounded-xl bg-[#0A1830] border border-[#176BFF]/15 text-xs">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-[#00E5FF] font-bold">{b.booking_reference}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#00E6A0]/15 text-[#00E6A0] border border-[#00E6A0]/30 font-semibold">
                        {b.status}
                      </span>
                    </div>
                    <div className="truncate font-semibold text-[#F4F7FF] mt-1">{b.full_name}</div>
                    <div className="text-[10px] text-[#94A9C8] truncate">{b.appointment_type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 mt-2 border-t border-[#176BFF]/15 flex items-center justify-between text-xs">
            {onNavigateToBookings && (
              <button
                onClick={onNavigateToBookings}
                className="flex items-center gap-1 text-[11px] text-[#00E5FF] hover:text-[#F4F7FF] font-medium transition-colors"
              >
                <span>View Calendar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <span className="text-[10px] font-mono text-[#5A7199]">{bookings.length} Total</span>
          </div>
        </div>

        {/* Panel 2: Workflow Execution Graph */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-[#071329]/80 border border-[#176BFF]/25 hover:border-[#176BFF]/50 transition-all shadow-lg backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#176BFF]/15">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F4F7FF]">
                <Layers className="w-4 h-4 text-[#00E5FF]" />
                <span>StateGraph Graph</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                Node: {currentNode}
              </span>
            </div>

            <div className="space-y-1 max-h-[145px] overflow-y-auto pr-1">
              {graphNodes.map((n) => {
                const isVisited =
                  activeNodesSet.has(n.id.toLowerCase()) || (n.id === 'START' && events.length > 0);
                const isCurrent =
                  currentNode.toLowerCase().includes(n.id.toLowerCase()) ||
                  currentNode.toLowerCase() === n.id.toLowerCase();

                return (
                  <div
                    key={n.id}
                    onClick={() =>
                      setSelectedNodeData({
                        id: n.id,
                        label: n.label,
                        sub: n.sub,
                        status: isCurrent ? 'EXECUTING' : isVisited ? 'COMPLETED' : 'PENDING',
                        events: events.filter((e) => e.node_name.toLowerCase().includes(n.id.toLowerCase())),
                      })
                    }
                    className={`flex items-center justify-between p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-[#176BFF]/20 border-[#00E5FF]/60 text-[#00E5FF]'
                        : isVisited
                        ? 'bg-[#0A1830] border-[#176BFF]/30 text-[#F4F7FF]'
                        : 'bg-[#030817]/40 border-[#176BFF]/10 text-[#5A7199]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCurrent ? 'bg-[#00E5FF] animate-ping' : isVisited ? 'bg-[#00E6A0]' : 'bg-[#5A7199]'
                        }`}
                      />
                      <span className="font-mono text-[11px] font-medium">{n.label}</span>
                    </div>
                    <span className="text-[9px] text-[#5A7199]">{n.sub}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-[#176BFF]/15 text-[10px] text-[#5A7199] flex items-center justify-between">
            <span>{events.length} Turn Events</span>
            <span className="text-[#00E5FF] font-mono">SQLite Checkpointed</span>
          </div>
        </div>

        {/* Panel 3: Evidence & Citations */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-[#071329]/80 border border-[#176BFF]/25 hover:border-[#176BFF]/50 transition-all shadow-lg backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#176BFF]/15">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F4F7FF]">
                <FileCheck className="w-4 h-4 text-[#00E6A0]" />
                <span>Evidence & Citations</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#00E6A0]/10 text-[#00E6A0] border border-[#00E6A0]/30">
                {citations.length} Grounded
              </span>
            </div>

            {citations.length === 0 ? (
              <div className="py-5 text-center text-xs text-[#5A7199]">
                No citations retrieved in active turn yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
                {citations.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedCitation(c)}
                    className="p-2 rounded-xl bg-[#0A1830] border border-[#176BFF]/15 hover:border-[#00E6A0]/40 text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#00E6A0]">
                      <span className="truncate max-w-[130px] font-semibold">{c.source}</span>
                      <span>Page {c.page}</span>
                    </div>
                    <p className="text-[10px] text-[#94A9C8] line-clamp-2 italic mt-1 leading-snug">
                      "{c.excerpt}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-[#176BFF]/15 flex items-center justify-between text-xs">
            {onNavigateToEvidence && (
              <button
                onClick={onNavigateToEvidence}
                className="flex items-center gap-1 text-[11px] text-[#00E6A0] hover:text-[#F4F7FF] font-medium transition-colors"
              >
                <span>Full Evidence Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <span className="text-[10px] font-mono text-[#5A7199]">PDF Grounded</span>
          </div>
        </div>

        {/* Panel 4: Voice Studio */}
        <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-[#071329]/80 border border-[#176BFF]/25 hover:border-[#176BFF]/50 transition-all shadow-lg backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#176BFF]/15">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F4F7FF]">
                <Volume2 className="w-4 h-4 text-[#873DFF]" />
                <span>Voice Studio</span>
              </div>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                  isVoiceActive
                    ? 'bg-[#00E6A0]/15 text-[#00E6A0] border-[#00E6A0]/30 animate-pulse'
                    : 'bg-[#050B19] text-[#5A7199] border-[#176BFF]/20'
                }`}
              >
                {isVoiceActive ? 'Live STT / TTS' : 'Standby'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0A1830] border border-[#176BFF]/15 text-center space-y-2">
              {/* Dynamic waveform visualization */}
              <div className="flex items-center justify-center gap-1 h-7">
                {[6, 14, 20, 10, 24, 16, 8, 18, 22, 10, 16, 8].map((h, idx) => (
                  <span
                    key={idx}
                    style={{ height: `${isVoiceActive ? Math.min(26, h * 1.2) : 6}px` }}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isVoiceActive
                        ? 'bg-gradient-to-t from-[#873DFF] to-[#00E5FF] animate-pulse'
                        : 'bg-[#5A7199]/40'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#94A9C8] leading-tight">
                {isVoiceActive
                  ? isVoiceMuted
                    ? 'Microphone muted. Click to resume speech.'
                    : 'Listening to your voice. Speak anytime.'
                  : 'Natural turn-taking with browser speech recognition & spoken synthesis.'}
              </p>
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-[#176BFF]/15 flex items-center justify-between gap-2 text-xs">
            {isVoiceActive && onToggleMuteVoice ? (
              <button
                onClick={onToggleMuteVoice}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-[#0A1830] hover:bg-[#176BFF]/20 text-[#94A9C8] hover:text-[#00E5FF] border border-[#176BFF]/20 text-[11px] font-medium"
              >
                {isVoiceMuted ? <MicOff className="w-3 h-3 text-[#FF3B5C]" /> : <Mic className="w-3 h-3" />}
                <span>{isVoiceMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            ) : null}

            {onStartVoice && (
              <button
                onClick={onStartVoice}
                className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-[#176BFF]/20 hover:bg-[#176BFF]/30 text-[#00E5FF] border border-[#176BFF]/30 text-[11px] font-medium transition-all"
              >
                <Sliders className="w-3 h-3" />
                <span>{isVoiceActive ? 'Voice Controls' : 'Open Voice Studio'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Node Inspection Modal */}
      {selectedNodeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#071329] border border-[#176BFF]/40 shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#176BFF]/20">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#00E5FF]" />
                <span className="font-bold text-sm text-[#F4F7FF]">{selectedNodeData.label}</span>
              </div>
              <button
                onClick={() => setSelectedNodeData(null)}
                className="text-[#5A7199] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="py-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5A7199]">Node Status:</span>
                <span className="font-mono text-[#00E6A0] font-semibold">{selectedNodeData.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5A7199]">Role:</span>
                <span className="text-[#94A9C8]">{selectedNodeData.sub}</span>
              </div>
              <div className="pt-2 border-t border-[#176BFF]/15">
                <span className="text-[#5A7199] block mb-1">Associated Turn Events:</span>
                {selectedNodeData.events.length === 0 ? (
                  <p className="text-[11px] text-[#5A7199] italic">No execution events recorded in current turn.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedNodeData.events.map((e: any) => (
                      <div key={e.event_id} className="p-2 rounded bg-[#0A1830] border border-[#176BFF]/20 text-[11px]">
                        <div className="flex justify-between text-[#00E5FF] font-mono text-[10px]">
                          <span>{e.event_type}</span>
                          <span>{e.duration_ms}ms</span>
                        </div>
                        <p className="text-[#94A9C8] mt-0.5">{e.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citation Inspection Modal */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-[#071329] border border-[#176BFF]/40 shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#176BFF]/20">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[#00E6A0]" />
                <span className="font-bold text-sm text-[#F4F7FF]">{selectedCitation.source}</span>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-[#5A7199] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="py-3 space-y-2 text-xs">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[#5A7199]">Page Number:</span>
                <span className="text-[#00E6A0] font-bold">Page {selectedCitation.page}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#030817] border border-[#176BFF]/20 text-[#F4F7FF] leading-relaxed">
                "{selectedCitation.excerpt}"
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-[#176BFF]/15">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-3 py-1 rounded-lg bg-[#176BFF] text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
