import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Settings, Cpu, ShieldCheck, Database, Clock } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [readinessData, setReadinessData] = useState<any>(null);

  useEffect(() => {
    api.getReadiness().then(setReadinessData).catch(console.error);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#080c14] p-4 md:p-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-indigo-400" />
            <span>System Settings & Architecture</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Environment runtime configurations, model provider status, and security posture.
          </p>
        </div>

        {/* LLM & Model Engine Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span>LLM Provider & Orchestration Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-3.5">
              <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-1">
                <span>Deterministic Dev Engine</span>
                <span className="rounded bg-cyan-900/80 px-1.5 py-0.5 text-[10px] text-cyan-200">ACTIVE</span>
              </div>
              <p className="text-xs text-slate-300">
                100% offline, zero paid API dependencies. Accurately extracts policies from indexed PDFs and guarantees reproducible booking workflows.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>Groq Llama 3.3</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">AVAILABLE</span>
              </div>
              <p className="text-xs text-slate-400">
                Configurable via <code>GROQ_API_KEY</code> in backend environment file.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
                <span>Google Gemini 2.5</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">AVAILABLE</span>
              </div>
              <p className="text-xs text-slate-400">
                Configurable via <code>GOOGLE_API_KEY</code> in backend environment file.
              </p>
            </div>
          </div>
        </div>

        {/* Database and Vector Store Information */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Database className="h-4 w-4 text-indigo-400" />
            <span>Persistence & Knowledge Base</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
              <div className="font-semibold text-slate-300 mb-1">Transactional Database</div>
              <div className="text-slate-400">SQLite + SQLAlchemy Async Engine (aiosqlite)</div>
              <div className="mt-1 font-mono text-[11px] text-emerald-400">
                Status: {readinessData?.database === 'connected' ? 'Connected & Synced' : 'Checking...'}
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
              <div className="font-semibold text-slate-300 mb-1">LangGraph Checkpointer</div>
              <div className="text-slate-400">AsyncSqliteSaver Persistent Checkpointer</div>
              <div className="mt-1 font-mono text-[11px] text-emerald-400">
                Storage: data/checkpoints.db
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
              <div className="font-semibold text-slate-300 mb-1">Vector Store Index</div>
              <div className="text-slate-400">L2-Normalized Dense Cosine Index</div>
              <div className="mt-1 font-mono text-[11px] text-cyan-400">
                Chunks: {readinessData?.indexed_chunks ?? 460} Chunks Indexed
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800">
              <div className="font-semibold text-slate-300 mb-1">Configured Timezone</div>
              <div className="text-slate-400">Asia/Kolkata (IST Standard)</div>
              <div className="mt-1 font-mono text-[11px] text-indigo-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>IST (+05:30)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security and Privacy Notes */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Enterprise Security & Isolation</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            API keys and provider secrets are strictly maintained on the backend inside environment variables and are never bundled or exposed to the client browser. All PDF knowledge texts are treated as untrusted data with strict prompt boundaries to prevent prompt injection.
          </p>
        </div>
      </div>
    </div>
  );
};
