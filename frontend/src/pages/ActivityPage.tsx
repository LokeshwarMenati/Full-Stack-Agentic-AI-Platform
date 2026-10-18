import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ActivityTraceEvent } from '../types';
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const [events, setEvents] = useState<ActivityTraceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await api.getActivity(undefined, 100);
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch activity traces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const eventTypes = ['ALL', 'intent_classified', 'rag_retrieval', 'slot_validation', 'booking_transaction_committed', 'response_generated'];

  const filtered = events.filter((e) => {
    const matchesType = filterType === 'ALL' || e.event_type === filterType;
    const matchesSearch =
      e.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.node_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.thread_id && e.thread_id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#080c14] p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Activity className="h-6 w-6 text-cyan-400" />
              <span>Agent Observability & Traces</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live audit trail of LangGraph node executions, intent classifications, and transactional events.
            </p>
          </div>

          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Traces</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search traces by summary, node, or thread..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <div className="flex gap-1">
              {eventTypes.slice(0, 4).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterType === t
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t === 'ALL' ? 'All Types' : t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Feed */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-xs text-slate-500">
            No trace events matching current filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((evt) => {
              const isSuccess = evt.status === 'SUCCESS';
              const isError = evt.status === 'ERROR';

              return (
                <div
                  key={evt.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 transition-all hover:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {evt.node_name}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                        {evt.event_type}
                      </span>
                      {evt.thread_id && (
                        <span className="hidden sm:inline text-[10px] text-slate-500 font-mono">
                          thread: {evt.thread_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {evt.duration_ms !== undefined && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                          <Clock className="h-3 w-3 text-slate-500" />
                          {evt.duration_ms}ms
                        </span>
                      )}
                      {isSuccess ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : isError ? (
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">{evt.summary}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
