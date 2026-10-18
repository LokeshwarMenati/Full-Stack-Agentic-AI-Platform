import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Sparkles, BookOpen } from 'lucide-react';
import type { Citation, VoiceState } from '../../types';

interface LiveTranscriptProps {
  userTranscript: string;
  interimTranscript: string;
  assistantText: string;
  citations: Citation[];
  voiceState: VoiceState;
  isVisible: boolean;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  userTranscript,
  interimTranscript,
  assistantText,
  citations,
  voiceState,
  isVisible,
}) => {
  if (!isVisible) return null;

  const hasUserText = Boolean(userTranscript || interimTranscript);
  const hasAssistantText = Boolean(assistantText);

  if (!hasUserText && !hasAssistantText) {
    return (
      <div className="text-center text-xs text-slate-500 py-3">
        {voiceState === 'listening' ? (
          <span className="italic animate-pulse">Speak naturally... asking questions or scheduling an appointment</span>
        ) : (
          <span>Waiting for conversation turn...</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-3 px-2">
      {/* User Transcript Turn */}
      {hasUserText && (
        <div className="flex items-start gap-2.5 justify-end animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="max-w-[85%] rounded-2xl rounded-tr-none border border-indigo-500/30 bg-indigo-950/40 px-4 py-2.5 text-xs sm:text-sm text-indigo-100 shadow-md backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-indigo-400 mb-1">
              <User className="h-3 w-3" />
              <span>You</span>
            </div>
            <p className="leading-relaxed">
              <span>{userTranscript}</span>
              {interimTranscript && (
                <span className="text-indigo-300/60 italic ml-1">{interimTranscript}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Assistant Spoken Turn */}
      {hasAssistantText && (
        <div className="flex items-start gap-2.5 justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="max-w-[90%] rounded-2xl rounded-tl-none border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-xs sm:text-sm text-slate-100 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2 text-[10px] text-cyan-400">
              <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                NEXUS Intelligence
              </span>
              {voiceState === 'speaking' && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Speaking...
                </span>
              )}
            </div>

            <div className="prose prose-invert prose-xs sm:prose-sm max-w-none break-words leading-relaxed">
              <ReactMarkdown>{assistantText}</ReactMarkdown>
            </div>

            {/* Citations Badges */}
            {citations && citations.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                {citations.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300"
                    title={c.excerpt}
                  >
                    <BookOpen className="h-3 w-3 text-cyan-400 shrink-0" />
                    <span>{c.source} (p. {c.page})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
