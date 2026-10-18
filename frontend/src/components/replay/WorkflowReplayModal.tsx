import React, { useState } from 'react';
import {
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  Play,
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import type { WorkflowReplayResponse } from '../../types';

interface WorkflowReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
}

export const WorkflowReplayModal: React.FC<WorkflowReplayModalProps> = ({
  isOpen,
  onClose,
  threadId
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [replayResult, setReplayResult] = useState<WorkflowReplayResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartReplay = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await api.replayWorkflow(threadId, true);
      setReplayResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute workflow simulation replay');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-3xl bg-nexus-surface-secondary border border-nexus-border-primary rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nexus-border-subtle bg-nexus-surface-primary/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-nexus-accent-purple/10 text-nexus-accent-purple border border-nexus-accent-purple/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-nexus-text-primary">
                  Workflow Replay & Deterministic Simulation
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-nexus-accent-purple/15 text-nexus-accent-purple border border-nexus-accent-purple/30">
                  SANDBOX
                </span>
              </div>
              <p className="text-xs text-nexus-text-muted mt-0.5">
                Re-executes recorded user turns in an isolated test environment with side-effects disabled.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-nexus-text-muted hover:text-nexus-text-primary rounded-lg hover:bg-nexus-surface-tertiary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Safeguard Notice */}
          <div className="p-4 rounded-xl bg-nexus-surface-primary border border-nexus-border-subtle flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-nexus-text-primary block">
                Side-Effect Suppression Engaged
              </span>
              <p className="text-nexus-text-muted leading-relaxed">
                Replaying will run the exact LangGraph StateGraph pipeline, but commits dry-run synthetic references (<code>SIM-XXXXXX</code>) and bypasses mutating production database records or sending real notification dispatches.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!replayResult ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-nexus-surface-tertiary mx-auto flex items-center justify-center text-nexus-accent-purple border border-nexus-border-subtle">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-nexus-text-primary">
                  Ready to Replay Thread
                </h4>
                <p className="text-xs text-nexus-text-muted max-w-md mx-auto mt-1">
                  Thread ID: <code className="text-nexus-text-secondary font-mono">{threadId}</code>
                </p>
              </div>
              <button
                onClick={handleStartReplay}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nexus-accent-purple hover:bg-purple-600 text-white font-medium text-xs shadow-lg transition-all"
              >
                <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'Replaying State Transitions...' : 'Run Simulation Replay'}
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 block font-mono">
                      REPLAY COMPLETED ({replayResult.status})
                    </span>
                    <span className="text-[11px] text-emerald-300/80">
                      Replay ID: {replayResult.replay_id}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                  {replayResult.replayed_turns_count} Turns Simulated
                </span>
              </div>

              {/* Side Effects Prevented */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-nexus-text-muted tracking-wider block">
                  Side-Effects Safely Prevented
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {replayResult.side_effects_prevented.map((side, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-nexus-surface-primary border border-nexus-border-subtle text-[11px] text-nexus-text-secondary flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{side}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution Path */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-nexus-text-muted tracking-wider block">
                  Simulated Graph Node Traversal
                </span>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-nexus-surface-primary border border-nexus-border-subtle">
                  <span className="px-2 py-1 rounded bg-nexus-surface-tertiary text-xs font-mono text-nexus-text-muted">START</span>
                  <ArrowRight className="w-3 h-3 text-nexus-text-muted" />
                  {replayResult.execution_path.map((node, i) => (
                    <React.Fragment key={i}>
                      <span className="px-2.5 py-1 rounded bg-nexus-accent-purple/10 text-nexus-accent-purple text-xs font-mono border border-nexus-accent-purple/30">
                        {node}
                      </span>
                      {i < replayResult.execution_path.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-nexus-text-muted" />
                      )}
                    </React.Fragment>
                  ))}
                  <ArrowRight className="w-3 h-3 text-nexus-text-muted" />
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/30">END</span>
                </div>
              </div>

              {/* Deterministic Comparison */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-nexus-text-muted tracking-wider block">
                  Run Comparison & Verification
                </span>
                <div className="p-3.5 rounded-xl bg-nexus-surface-primary border border-nexus-border-subtle grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-nexus-text-muted text-[10px] uppercase font-mono block">Original Turns</span>
                    <span className="font-semibold text-nexus-text-primary">{replayResult.original_turns_count}</span>
                  </div>
                  <div>
                    <span className="text-nexus-text-muted text-[10px] uppercase font-mono block">Replayed Turns</span>
                    <span className="font-semibold text-nexus-text-primary">{replayResult.replayed_turns_count}</span>
                  </div>
                  <div>
                    <span className="text-nexus-text-muted text-[10px] uppercase font-mono block">Path Fidelity</span>
                    <span className="font-semibold text-emerald-400">{replayResult.comparison.path_fidelity}</span>
                  </div>
                  <div>
                    <span className="text-nexus-text-muted text-[10px] uppercase font-mono block">Safeguard Status</span>
                    <span className="font-semibold text-nexus-accent-cyan">Active</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleStartReplay}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-nexus-text-secondary hover:text-nexus-text-primary bg-nexus-surface-primary border border-nexus-border-subtle rounded-xl hover:border-nexus-border-primary transition-colors"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                  Re-run Simulation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
