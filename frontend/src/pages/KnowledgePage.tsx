import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { KnowledgeStatus, Citation } from '../types';
import {
  BookOpen,
  FileText,
  RefreshCw,
  Search,
  CheckCircle2,
  Layers,
  Database,
  Cpu,
  Sparkles,
  AlertCircle,
  Upload
} from 'lucide-react';
import { CitationCard } from '../components/chat/CitationCard';

export const KnowledgePage: React.FC = () => {
  const [status, setStatus] = useState<KnowledgeStatus | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [testQuery, setTestQuery] = useState('how often are performance reviews conducted according to the handbook?');
  const [testCitations, setTestCitations] = useState<Citation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = async () => {
    try {
      const data = await api.getKnowledgeStatus();
      setStatus(data);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to load knowledge status', type: 'error' });
    }
  };

  const handleRunTestQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.queryKnowledge(queryText.trim(), 4);
      setTestCitations(res.citations);
    } catch (err: any) {
      console.error('Failed to query knowledge:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Run initial test query
    handleRunTestQuery('how often are performance reviews conducted according to the handbook?');
  }, []);

  const handleReindex = async () => {
    setIsReindexing(true);
    setMessage(null);
    try {
      const res = await api.ingestKnowledge();
      setMessage({ text: res.message, type: 'success' });
      await fetchStatus();
    } catch (err: any) {
      setMessage({ text: err.message || 'Ingestion failed', type: 'error' });
    } finally {
      setIsReindexing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);
    try {
      const res = await api.uploadKnowledgeDocument(file);
      setMessage({ text: res.message, type: 'success' });
      await fetchStatus();
    } catch (err: any) {
      setMessage({ text: err.message || 'Upload failed', type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#080c14] p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="h-6 w-6 text-cyan-400" />
              <span>Knowledge Intelligence Dashboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Authoritative document ingestion pipeline, page-level chunking, and semantic vector retrieval.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.md"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 active:scale-95 disabled:opacity-50 transition-all"
            >
              <Upload className={`h-4 w-4 ${isUploading ? 'animate-bounce' : ''}`} />
              <span>{isUploading ? 'Uploading & Indexing...' : 'Upload Document'}</span>
            </button>

            <button
              onClick={handleReindex}
              disabled={isReindexing}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-600/20 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${isReindexing ? 'animate-spin' : ''}`} />
              <span>{isReindexing ? 'Indexing Documents...' : 'Re-index Knowledge Base'}</span>
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs ${
              message.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Statistics Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Database className="h-4 w-4 text-cyan-400" />
              <span>Documents</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {status?.total_documents ?? '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Primary & Secondary</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>Indexed Pages</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {status?.total_pages ?? '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Preserved page numbers</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>Vector Chunks</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {status?.total_chunks ?? '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">~800 char semantic splits</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
              <Cpu className="h-4 w-4 text-violet-400" />
              <span>Vector Index</span>
            </div>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate">
              {status?.vector_store_type || 'Normalized TF-IDF Dense'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">L2-Normalized Cosine</div>
          </div>
        </div>

        {/* Indexed Document Files Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            <span>Indexed Source Files</span>
          </h3>

          <div className="space-y-2">
            {status?.documents.map((doc) => (
              <div
                key={doc.filename}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/50 text-cyan-400 border border-cyan-800/40">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{doc.filename}</div>
                    <div className="text-[11px] text-slate-500">
                      {(doc.file_size_bytes / 1024).toFixed(1)} KB • Extracted text page-by-page
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                  <span><strong>{doc.total_pages}</strong> pages</span>
                  <span>•</span>
                  <span><strong>{doc.total_chunks}</strong> chunks</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">Indexed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Semantic Retrieval Tester */}
        <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>Interactive Retrieval Tester</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute live similarity search against the vector index and inspect retrieved excerpts and exact page numbers.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunTestQuery(testQuery);
            }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Enter topic or question (e.g., 'performance review schedule', 'PTO')..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/90 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors"
            >
              {isSearching ? 'Searching...' : 'Search Index'}
            </button>
          </form>

          {/* Test Results */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Top Retrieved Passages ({testCitations.length})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {testCitations.map((c, idx) => (
                <CitationCard key={idx} citation={c} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
