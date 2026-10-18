import React, { useState } from 'react';
import {
  Zap,
  Play,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';

interface AutomationItem {
  id: string;
  name: string;
  trigger: string;
  status: string;
  lastRun: string;
  target: string;
  description: string;
}

export const AutomationHubPage: React.FC = () => {
  const [automations, setAutomations] = useState<AutomationItem[]>([
    {
      id: 'auto_sync_kb',
      name: 'Handbook Knowledge Ingestion Sync',
      trigger: 'On Document Upload / Periodic',
      status: 'ACTIVE',
      lastRun: '10 mins ago',
      target: 'KnowledgeRetriever.ingest()',
      description: 'Parses PDF documents, segments into chunks with metadata and re-indexes vector representations.',
    },
    {
      id: 'auto_checkpoint_clean',
      name: 'StateGraph SQLite Checkpoint Retention',
      trigger: 'Every 24 Hours',
      status: 'ACTIVE',
      lastRun: '3 hours ago',
      target: 'AsyncSqliteSaver.prune()',
      description: 'Preserves active threads while safely archiving resolved turns and compaction of SQLite WAL journals.',
    },
    {
      id: 'auto_slot_sync',
      name: 'Appointment Slot Calendar Sync',
      trigger: 'Every 15 Minutes',
      status: 'ACTIVE',
      lastRun: '5 mins ago',
      target: 'SlotService.sync_availability()',
      description: 'Re-validates appointment slot locks, preventing double booking and releasing unconfirmed tentative holds.',
    },
    {
      id: 'auto_policy_eval',
      name: 'RAG Grounding & Policy Compliance Audit',
      trigger: 'Post-Execution Hook',
      status: 'ACTIVE',
      lastRun: 'Just now',
      target: 'Evaluator.verify_citations()',
      description: 'Audits that every response claiming policy facts includes verifiable page citations.',
    },
  ]);

  const [runningId, setRunningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    setFeedback(null);
    try {
      const res = await api.runAutomationTask(id);
      setFeedback(res.message);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, lastRun: 'Just now' } : a))
      );
    } catch (err: any) {
      setFeedback(`Failed to execute: ${err.message || 'Unknown error'}`);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#030817] text-[#F4F7FF]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#176BFF]/20 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#F4F7FF] flex items-center gap-2">
            <Zap className="h-6 w-6 text-[#00E5FF]" />
            <span>Automation Hub</span>
          </h1>
          <p className="text-xs text-[#94A9C8] mt-1">
            Automated background services, scheduled synchronization pipelines, and LangGraph lifecycle workers.
          </p>
        </div>

        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00E6A0]/10 border border-[#00E6A0]/30 text-xs font-mono text-[#00E6A0]">
          <span className="h-2 w-2 rounded-full bg-[#00E6A0] animate-pulse" />
          4 Workers Active
        </span>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#00E6A0]/10 border border-[#00E6A0]/30 text-xs text-[#00E6A0]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Automations List */}
      <div className="space-y-3.5">
        {automations.map((a) => (
          <div
            key={a.id}
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#071329] border border-[#176BFF]/25 shadow-lg backdrop-blur-md hover:border-[#176BFF]/50 transition-all"
          >
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-[#F4F7FF]">{a.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00E6A0]/15 text-[#00E6A0] border border-[#00E6A0]/30 text-[10px] font-mono font-semibold">
                  {a.status}
                </span>
                <span className="text-[10px] font-mono text-[#5A7199]">{a.trigger}</span>
              </div>
              <p className="text-xs text-[#94A9C8]">{a.description}</p>
              <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-[#5A7199]">
                <span>Target: <code className="text-[#00E5FF]">{a.target}</code></span>
                <span>•</span>
                <span>Last executed: {a.lastRun}</span>
              </div>
            </div>

            <button
              onClick={() => handleRunNow(a.id)}
              disabled={runningId === a.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#176BFF]/20 hover:bg-[#176BFF]/35 text-[#00E5FF] border border-[#176BFF]/35 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              {runningId === a.id ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Run Now</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
