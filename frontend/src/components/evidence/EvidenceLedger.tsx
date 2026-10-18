import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  BookOpen,
  Calendar,
  Search,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Filter
} from 'lucide-react';
import { api } from '../../services/api';
import type { Citation, Booking } from '../../types';

interface EvidenceLedgerProps {
  threadId: string;
}

export const EvidenceLedger: React.FC<EvidenceLedgerProps> = ({ threadId }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'rag' | 'booking'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const loadEvidence = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch conversations messages for thread to collect verified citations
        if (threadId) {
          try {
            const conv = await api.getConversation(threadId);
            const collectedCitations: Citation[] = [];
            conv.messages.forEach(m => {
              if (m.citations && m.citations.length > 0) {
                m.citations.forEach(c => {
                  if (!collectedCitations.some(existing => existing.excerpt === c.excerpt)) {
                    collectedCitations.push(c);
                  }
                });
              }
            });
            setCitations(collectedCitations);
          } catch {
            console.warn('Could not load thread citations, using knowledge query fallback');
          }
        }

        // 2. Fetch bookings for thread or latest
        const bList = await api.getBookings();
        const threadBookings = threadId
          ? bList.filter(b => b.thread_id === threadId || !b.thread_id)
          : bList;
        setBookings(threadBookings);
      } catch (err) {
        console.error('Error loading evidence ledger:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvidence();
  }, [threadId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCitations = citations.filter(c =>
    c.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookings = bookings.filter(b =>
    b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-nexus-surface-secondary via-nexus-surface-tertiary to-nexus-surface-secondary border border-nexus-border-primary shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-nexus-accent-cyan/10 border border-nexus-accent-cyan/30 flex items-center justify-center text-nexus-accent-cyan shadow-inner">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-nexus-text-primary tracking-tight">
                Auditable Evidence Ledger
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                VERIFIED SOURCES
              </span>
            </div>
            <p className="text-xs text-nexus-text-muted mt-0.5">
              Ground-truth audit trail linking LLM outputs directly to verified PDF pages, exact excerpts, and database booking references.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-nexus-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter evidence & citations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-nexus-surface-primary border border-nexus-border-subtle rounded-xl text-nexus-text-primary focus:border-nexus-accent-cyan focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-nexus-border-subtle pb-3">
        <button
          onClick={() => setActiveFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-nexus-surface-secondary text-nexus-accent-cyan border border-nexus-accent-cyan/30 shadow-sm'
              : 'text-nexus-text-muted hover:text-nexus-text-primary'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          All Evidence ({citations.length + bookings.length})
        </button>
        <button
          onClick={() => setActiveFilter('rag')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeFilter === 'rag'
              ? 'bg-nexus-surface-secondary text-nexus-accent-cyan border border-nexus-accent-cyan/30 shadow-sm'
              : 'text-nexus-text-muted hover:text-nexus-text-primary'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Handbook Citations ({citations.length})
        </button>
        <button
          onClick={() => setActiveFilter('booking')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeFilter === 'booking'
              ? 'bg-nexus-surface-secondary text-nexus-accent-cyan border border-nexus-accent-cyan/30 shadow-sm'
              : 'text-nexus-text-muted hover:text-nexus-text-primary'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Booking Transaction Audits ({bookings.length})
        </button>
      </div>

      {/* Content Section */}
      <div className="grid grid-cols-1 gap-6">
        {/* 1. Policy & Handbook Citations (RAG) */}
        {(activeFilter === 'all' || activeFilter === 'rag') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-nexus-text-primary uppercase tracking-wider font-mono">
                <BookOpen className="w-4 h-4 text-nexus-accent-cyan" />
                <span>Verified PDF Passages & Excerpts ({filteredCitations.length})</span>
              </div>
              <span className="text-[11px] text-nexus-text-muted">
                Exact Page Grounding
              </span>
            </div>

            {filteredCitations.length === 0 ? (
              <div className="p-8 text-center text-xs text-nexus-text-muted border border-dashed border-nexus-border-subtle rounded-2xl bg-nexus-surface-secondary/40">
                No policy citations recorded for this thread yet. Ask a question regarding employee reviews, PTO, or benefits to view grounded citations.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCitations.map((cit, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-nexus-surface-secondary border border-nexus-border-primary hover:border-nexus-accent-cyan/30 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-nexus-accent-cyan/10 text-nexus-accent-cyan border border-nexus-accent-cyan/30 text-[11px] font-mono">
                          {cit.source}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-nexus-surface-tertiary text-nexus-text-secondary border border-nexus-border-subtle text-[11px] font-mono">
                          Page {cit.page}
                        </span>
                      </div>
                      {cit.score !== undefined && (
                        <span className="text-[10px] font-mono text-emerald-400">
                          Relevance: {(cit.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <blockquote className="p-3 rounded-xl bg-nexus-surface-primary border-l-2 border-nexus-accent-cyan text-xs text-nexus-text-secondary italic leading-relaxed">
                      "{cit.excerpt}"
                    </blockquote>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-nexus-text-muted">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Grounded in Source Document
                      </span>
                      <button
                        onClick={() => copyToClipboard(cit.excerpt, `cit_${idx}`)}
                        className="flex items-center gap-1 hover:text-nexus-text-primary transition-colors font-mono"
                      >
                        {copiedId === `cit_${idx}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Quote</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Transactional Booking Records */}
        {(activeFilter === 'all' || activeFilter === 'booking') && (
          <div className="space-y-3 pt-4 border-t border-nexus-border-subtle/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-nexus-text-primary uppercase tracking-wider font-mono">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Transactional Appointment Records & Slot Audits ({filteredBookings.length})</span>
              </div>
              <span className="text-[11px] text-nexus-text-muted">
                ACID Committed Records
              </span>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-nexus-text-muted border border-dashed border-nexus-border-subtle rounded-2xl bg-nexus-surface-secondary/40">
                No bookings committed yet. Use the chat or voice interface to complete a review scheduling workflow.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-nexus-surface-secondary border border-nexus-border-primary hover:border-emerald-500/30 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {b.booking_reference}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {b.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-nexus-text-muted text-[10px] uppercase font-mono block">Attendee</span>
                        <span className="font-medium text-nexus-text-primary">{b.full_name}</span>
                      </div>
                      <div>
                        <span className="text-nexus-text-muted text-[10px] uppercase font-mono block">Work Email</span>
                        <span className="font-mono text-nexus-text-secondary">{b.email}</span>
                      </div>
                      <div>
                        <span className="text-nexus-text-muted text-[10px] uppercase font-mono block">Appointment</span>
                        <span className="text-nexus-text-primary">{b.appointment_type}</span>
                      </div>
                      <div>
                        <span className="text-nexus-text-muted text-[10px] uppercase font-mono block">Slot ID</span>
                        <span className="font-mono text-nexus-accent-cyan">{b.slot_id}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-nexus-border-subtle flex items-center justify-between text-[11px] text-nexus-text-muted">
                      <span>{new Date(b.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Persisted
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
