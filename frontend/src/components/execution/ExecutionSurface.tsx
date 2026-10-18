import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
  Activity,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  StructuredTask,
  ApprovalGate,
  StateDiffEntry,
  ExecutionEvent
} from '../../types';

interface ExecutionSurfaceProps {
  threadId: string;
  onOpenReplay?: () => void;
  onWorkflowUpdated?: () => void;
}

export const ExecutionSurface: React.FC<ExecutionSurfaceProps> = ({
  threadId,
  onOpenReplay,
  onWorkflowUpdated
}) => {
  const [taskState, setTaskState] = useState<{
    structured_task?: StructuredTask;
    approval_gate?: ApprovalGate;
    state_diffs: StateDiffEntry[];
    pending_booking?: any;
    booking_confirmed?: any;
    execution_events: ExecutionEvent[];
  }>({
    state_diffs: [],
    execution_events: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isEditingInputs, setIsEditingInputs] = useState(false);
  const [inputForm, setInputForm] = useState({
    full_name: '',
    email: '',
    slot_id: ''
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const fetchTaskState = useCallback(async () => {
    if (!threadId) return;
    setIsLoading(true);
    try {
      const data = await api.getTaskExecutionState(threadId);
      setTaskState(data);
      if (data.pending_booking) {
        setInputForm({
          full_name: data.pending_booking.full_name || '',
          email: data.pending_booking.email || '',
          slot_id: data.pending_booking.slot_id || ''
        });
      }
    } catch (err) {
      console.error('Failed to load task state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchTaskState();
  }, [fetchTaskState]);

  const handleSaveInputs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadId) return;
    try {
      const res = await api.editTaskInputs(threadId, {
        full_name: inputForm.full_name.trim() || undefined,
        email: inputForm.email.trim() || undefined,
        slot_id: inputForm.slot_id.trim() || undefined
      });
      setTaskState(prev => ({
        ...prev,
        pending_booking: res.pending_booking,
        structured_task: res.structured_task,
        approval_gate: res.approval_gate,
        state_diffs: res.state_diffs
      }));
      setIsEditingInputs(false);
      setSaveSuccessMsg('Task inputs committed to LangGraph checkpointer');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      if (onWorkflowUpdated) onWorkflowUpdated();
    } catch (err) {
      console.error('Failed to update task inputs:', err);
    }
  };

  const handleAuthorizeAction = async (approved: boolean) => {
    if (!threadId) return;
    setIsApproving(true);
    try {
      await api.approveTaskAction(threadId, approved);
      await fetchTaskState();
      if (onWorkflowUpdated) onWorkflowUpdated();
    } catch (err) {
      console.error('Failed to authorize action:', err);
    } finally {
      setIsApproving(false);
    }
  };

  const task = taskState.structured_task;
  const approvalGate = taskState.approval_gate;
  const stateDiffs = taskState.state_diffs || [];

  // Graph nodes status determination
  const events = taskState.execution_events || [];
  const visitedNodes = new Set(events.map(e => e.node_name.toLowerCase()));
  const isBookingCompleted = taskState.booking_confirmed != null;

  const graphNodes = [
    {
      id: 'START',
      label: 'START',
      sublabel: 'User Outcome Expressed',
      status: 'completed'
    },
    {
      id: 'router',
      label: 'router_node',
      sublabel: 'Intent Classification & Decomposition',
      status: visitedNodes.has('router_node') || visitedNodes.has('router') ? 'completed' : 'pending'
    },
    {
      id: 'faq',
      label: 'faq_node',
      sublabel: 'RAG Retrieval & Citation Grounding',
      status: visitedNodes.has('faq_node') || visitedNodes.has('faq') ? 'completed' : 'skipped'
    },
    {
      id: 'booking',
      label: 'booking_node',
      sublabel: 'Transactional Slot Negotiation',
      status: visitedNodes.has('booking_node') || visitedNodes.has('booking')
        ? (approvalGate ? 'waiting_approval' : 'completed')
        : 'skipped'
    },
    {
      id: 'confirmation',
      label: 'confirmation_node',
      sublabel: 'ACID Transaction Commit',
      status: isBookingCompleted ? 'completed' : (approvalGate ? 'waiting_approval' : 'pending')
    },
    {
      id: 'response',
      label: 'response_node',
      sublabel: 'Synthesis & Context Serialization',
      status: events.length > 0 ? 'completed' : 'pending'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
      {/* Top Banner: Real Workflow Intelligence */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-nexus-surface-secondary via-nexus-surface-tertiary to-nexus-surface-secondary border border-nexus-border-primary shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-nexus-accent-cyan/10 border border-nexus-accent-cyan/30 flex items-center justify-center text-nexus-accent-cyan shadow-inner">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-nexus-text-primary tracking-tight">
                LangGraph Live Execution Surface
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-nexus-accent-cyan/15 text-nexus-accent-cyan border border-nexus-accent-cyan/30">
                ACTIVE ORCHESTRATION
              </span>
            </div>
            <p className="text-xs text-nexus-text-muted mt-0.5">
              Real-time state transitions, node input/output telemetry, and checkpointed task inputs for thread <code className="text-nexus-text-secondary font-mono">{threadId.slice(0, 16)}...</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTaskState}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-nexus-text-secondary hover:text-nexus-text-primary bg-nexus-surface-primary border border-nexus-border-subtle rounded-xl hover:border-nexus-border-primary transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {onOpenReplay && (
            <button
              onClick={onOpenReplay}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-nexus-accent-purple bg-nexus-accent-purple/10 border border-nexus-accent-purple/30 rounded-xl hover:bg-nexus-accent-purple/20 transition-all shadow-sm"
            >
              <Activity className="w-3.5 h-3.5" />
              Replay in Simulation
            </button>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. Live LangGraph Pipeline Visualizer */}
      <div className="p-5 rounded-2xl bg-nexus-surface-secondary border border-nexus-border-primary shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-nexus-accent-cyan" />
            <h3 className="text-sm font-semibold text-nexus-text-primary">
              StateGraph Execution Path
            </h3>
          </div>
          <span className="text-xs text-nexus-text-muted font-mono">
            {events.length} Recorded Node Events
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {graphNodes.map((node, i) => {
            const isCompleted = node.status === 'completed';
            const isWaiting = node.status === 'waiting_approval';
            const isSkipped = node.status === 'skipped';

            return (
              <div
                key={node.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isCompleted
                    ? 'bg-nexus-surface-primary border-emerald-500/30 text-emerald-400'
                    : isWaiting
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse'
                    : isSkipped
                    ? 'bg-nexus-surface-primary/40 border-nexus-border-subtle opacity-50 text-nexus-text-muted'
                    : 'bg-nexus-surface-primary border-nexus-border-subtle text-nexus-text-secondary'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono tracking-wider uppercase text-nexus-text-muted">
                      Step {i + 1}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isWaiting ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-nexus-text-muted" />
                    )}
                  </div>
                  <div className="font-mono text-xs font-semibold text-nexus-text-primary truncate">
                    {node.label}
                  </div>
                  <div className="text-[11px] text-nexus-text-muted mt-1 leading-snug">
                    {node.sublabel}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-nexus-border-subtle/50 flex items-center justify-between text-[10px]">
                  <span className="uppercase font-mono">
                    {node.status.replace('_', ' ')}
                  </span>
                  {i < graphNodes.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-nexus-text-muted" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Structured Task Plan & Approval Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Intent to Outcome Task Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Consequential Action Approval Gate Card (if pending) */}
          {approvalGate && approvalGate.required && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-lg space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-300">
                      Consequential Action Approval Required
                    </h3>
                    <p className="text-xs text-amber-200/80 mt-0.5">
                      The workflow has validated all inputs and is paused before committing a transactional booking reservation.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  GATE 1: PRE-COMMIT
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-nexus-surface-primary/80 border border-amber-500/20 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-nexus-text-muted block text-[10px] uppercase font-mono">Action</span>
                  <span className="font-medium text-nexus-text-primary">{approvalGate.action}</span>
                </div>
                <div>
                  <span className="text-nexus-text-muted block text-[10px] uppercase font-mono">Attendee</span>
                  <span className="font-medium text-nexus-text-primary">{approvalGate.attendee_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-nexus-text-muted block text-[10px] uppercase font-mono">Email</span>
                  <span className="font-medium text-nexus-text-primary font-mono">{approvalGate.attendee_email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-nexus-text-muted block text-[10px] uppercase font-mono">Slot</span>
                  <span className="font-medium text-nexus-accent-cyan font-mono">{approvalGate.slot_id}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={() => handleAuthorizeAction(false)}
                  disabled={isApproving}
                  className="px-4 py-2 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors"
                >
                  Cancel Booking Workflow
                </button>
                <button
                  onClick={() => handleAuthorizeAction(true)}
                  disabled={isApproving}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isApproving ? 'Committing...' : 'Authorize & Commit Booking'}
                </button>
              </div>
            </div>
          )}

          {/* Structured Task Breakdown */}
          <div className="p-5 rounded-2xl bg-nexus-surface-secondary border border-nexus-border-primary space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-nexus-accent-cyan" />
                <h3 className="text-sm font-semibold text-nexus-text-primary">
                  Structured Task Intent & Linked Objectives
                </h3>
              </div>
              <span className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                task?.execution_status === 'completed'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : task?.execution_status === 'waiting_approval'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-nexus-accent-cyan/10 border-nexus-accent-cyan/30 text-nexus-accent-cyan'
              }`}>
                Status: {task?.execution_status || 'In Progress'}
              </span>
            </div>

            {/* Linked Objectives */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-nexus-text-muted uppercase tracking-wider block">
                Decomposed Objectives ({task?.linked_objectives?.length || 0})
              </span>
              <div className="space-y-2">
                {task?.linked_objectives?.map(obj => (
                  <div
                    key={obj.id}
                    className="p-3 rounded-xl bg-nexus-surface-primary border border-nexus-border-subtle flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-nexus-surface-tertiary text-nexus-accent-cyan">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-nexus-text-primary">{obj.description}</p>
                        <span className="text-[10px] font-mono text-nexus-text-muted">Target Node: {obj.target_node}</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-nexus-surface-tertiary text-nexus-text-secondary border border-nexus-border-subtle">
                      {obj.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Inputs Inspector & Editor */}
            <div className="pt-2 border-t border-nexus-border-subtle/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-nexus-text-muted uppercase tracking-wider">
                  Workflow Inputs (Collected & Missing)
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingInputs(!isEditingInputs)}
                  className="flex items-center gap-1 text-xs text-nexus-accent-cyan hover:underline"
                >
                  <Edit3 className="w-3 h-3" />
                  {isEditingInputs ? 'Close Form' : 'Edit Inputs'}
                </button>
              </div>

              {isEditingInputs ? (
                <form onSubmit={handleSaveInputs} className="p-4 rounded-xl bg-nexus-surface-primary border border-nexus-accent-cyan/30 space-y-3 animate-fade-in">
                  <div className="text-xs text-nexus-text-muted">
                    Edit missing task fields directly. Changes update the checkpointer and re-evaluate slot validation.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-nexus-text-muted block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={inputForm.full_name}
                        onChange={(e) => setInputForm(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="e.g. Alex Morgan"
                        className="w-full px-3 py-1.5 text-xs bg-nexus-surface-secondary border border-nexus-border-subtle rounded-lg text-nexus-text-primary focus:border-nexus-accent-cyan focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-nexus-text-muted block mb-1">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={inputForm.email}
                        onChange={(e) => setInputForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. alex@example.com"
                        className="w-full px-3 py-1.5 text-xs bg-nexus-surface-secondary border border-nexus-border-subtle rounded-lg text-nexus-text-primary focus:border-nexus-accent-cyan focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-nexus-text-muted block mb-1">
                        Slot ID
                      </label>
                      <input
                        type="text"
                        value={inputForm.slot_id}
                        onChange={(e) => setInputForm(prev => ({ ...prev, slot_id: e.target.value }))}
                        placeholder="e.g. slot_fri_1030"
                        className="w-full px-3 py-1.5 text-xs bg-nexus-surface-secondary border border-nexus-border-subtle rounded-lg text-nexus-text-primary focus:border-nexus-accent-cyan focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-nexus-accent-cyan hover:bg-cyan-400 rounded-lg shadow-sm transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Commit to State
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-nexus-surface-primary border border-nexus-border-subtle">
                    <span className="text-[10px] font-mono uppercase text-nexus-text-muted block">Full Name</span>
                    <span className="text-xs font-medium text-nexus-text-primary mt-1 block">
                      {task?.collected_inputs?.full_name || <span className="text-amber-400 font-mono italic">Missing input</span>}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-nexus-surface-primary border border-nexus-border-subtle">
                    <span className="text-[10px] font-mono uppercase text-nexus-text-muted block">Attendee Email</span>
                    <span className="text-xs font-medium text-nexus-text-primary mt-1 block font-mono">
                      {task?.collected_inputs?.email || <span className="text-amber-400 italic">Missing input</span>}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-nexus-surface-primary border border-nexus-border-subtle">
                    <span className="text-[10px] font-mono uppercase text-nexus-text-muted block">Selected Slot ID</span>
                    <span className="text-xs font-medium text-nexus-accent-cyan mt-1 block font-mono">
                      {task?.collected_inputs?.slot_id || <span className="text-amber-400 italic">Pending selection</span>}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): State Diff Inspector */}
        <div className="p-5 rounded-2xl bg-nexus-surface-secondary border border-nexus-border-primary space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-nexus-accent-purple" />
              <h3 className="text-sm font-semibold text-nexus-text-primary">
                State-Diff Inspector
              </h3>
            </div>
            <span className="text-[11px] font-mono text-nexus-text-muted">
              {stateDiffs.length} Checkpoints
            </span>
          </div>

          <p className="text-xs text-nexus-text-muted">
            Auditable record of structured state modifications between safe node checkpoints with sensitive credentials redacted.
          </p>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {stateDiffs.length === 0 ? (
              <div className="p-6 text-center text-xs text-nexus-text-muted border border-dashed border-nexus-border-subtle rounded-xl">
                No state diffs recorded yet.
              </div>
            ) : (
              stateDiffs.map((diff, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-nexus-surface-primary border border-nexus-border-subtle space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-nexus-text-muted">
                    <span className="text-nexus-accent-cyan">
                      {diff.from_node} → {diff.to_node}
                    </span>
                    <span>
                      {new Date(diff.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-nexus-text-secondary leading-relaxed">
                    {diff.summary}
                  </p>
                  {diff.added_keys && diff.added_keys.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {diff.added_keys.map(k => (
                        <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-nexus-surface-tertiary text-nexus-text-muted border border-nexus-border-subtle">
                          +{k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
