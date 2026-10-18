import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { Citation } from '../../types';

interface CitationCardProps {
  citation: Citation;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(citation.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scorePct = citation.score ? Math.round(citation.score * 100) : null;

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group cursor-pointer rounded-xl border transition-all duration-200 ${
        isExpanded
          ? 'border-cyan-500/50 bg-slate-900/90 shadow-lg shadow-cyan-950/20'
          : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
      }`}
    >
      <div className="flex items-center justify-between gap-3 p-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-950/70 text-cyan-400 border border-cyan-800/40">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-slate-200 group-hover:text-cyan-300">
              {citation.source}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="font-semibold text-cyan-400">Page {citation.page}</span>
              {scorePct && (
                <>
                  <span>•</span>
                  <span>{scorePct}% match</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <button
            onClick={handleCopy}
            title="Copy excerpt"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            type="button"
            className="p-1 text-slate-400 group-hover:text-cyan-300 transition-colors"
            aria-label={isExpanded ? 'Collapse excerpt' : 'Expand excerpt'}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-800/80 px-3 py-2.5 text-xs text-slate-300 bg-slate-950/60 rounded-b-xl animate-in fade-in duration-150">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Retrieved Evidence Excerpt
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap bg-slate-900/80 p-2 rounded border border-slate-800/60">
            "{citation.excerpt}"
          </p>
        </div>
      )}
    </div>
  );
};
