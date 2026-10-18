import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Copy, Check, Sparkles, BookOpen, Volume2, VolumeX } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { CitationCard } from './CitationCard';
import { BookingConfirmationCard } from '../booking/BookingConfirmationCard';
import { AIOrb } from '../ui/AIOrb';

interface ChatMessageItemProps {
  message: ChatMessage;
  onViewBookings?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onViewBookings,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const clean = message.content
      .replace(/[#*_`~>-]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`flex w-full gap-3 py-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <AIOrb size="sm" state={isSpeaking ? 'executing' : 'idle'} />
        </div>
      )}

      {/* Message Bubble */}
      <div className={`max-w-[85%] md:max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md backdrop-blur-md transition-all ${
            isUser
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-tr-none'
              : 'border border-slate-700/60 bg-slate-900/80 text-slate-100 rounded-tl-none shadow-black/40'
          }`}
        >
          {/* Header for assistant message */}
          {!isUser && (
            <div className="mb-1.5 flex items-center justify-between gap-4 border-b border-slate-800/80 pb-1.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-medium text-cyan-400">
                <Sparkles className="h-3 w-3" /> NEXUS Intelligence
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSpeak}
                  className={`flex items-center gap-1 transition-colors ${
                    isSpeaking ? 'text-cyan-400 font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={isSpeaking ? 'Stop speaking' : 'Read aloud with AI Voice'}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                      <span className="text-rose-300">Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Listen</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Copy message"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Markdown Content */}
          <div className="prose prose-invert prose-sm max-w-none break-words">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {/* Booking Confirmation Card if turn resulted in committed booking */}
          {message.booking_confirmed && (
            <BookingConfirmationCard
              booking={message.booking_confirmed}
              onViewBookings={onViewBookings}
            />
          )}

          {/* Timestamp */}
          <div className="mt-1.5 text-right text-[10px] text-slate-400/70">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Compact & Expandable Citations Summary */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2.5 w-full">
            <button
              type="button"
              onClick={() => setShowCitations(!showCitations)}
              className="flex w-full items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-1.5 text-xs text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-900/30"
              title="Click to toggle source evidence passages"
            >
              <div className="flex items-center gap-1.5 truncate">
                <BookOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="font-medium text-slate-200">
                  {message.citations.length} Verified {message.citations.length === 1 ? 'Source' : 'Sources'}:
                </span>
                <span className="truncate text-slate-400 font-mono text-[11px]">
                  {message.citations.map((c) => `${c.source.replace('.pdf', '')} (p.${c.page})`).join(', ')}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-cyan-400 ml-2">
                {showCitations ? 'Hide' : 'Expand'}
              </span>
            </button>

            {showCitations && (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 animate-in fade-in duration-200">
                {message.citations.map((c, idx) => (
                  <CitationCard key={idx} citation={c} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 border border-slate-700 mt-0.5">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
