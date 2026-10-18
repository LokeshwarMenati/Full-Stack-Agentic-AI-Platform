import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface StartVoiceButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  variant?: 'composer' | 'header' | 'floating';
  className?: string;
}

export const StartVoiceButton: React.FC<StartVoiceButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  variant = 'composer',
  className = '',
}) => {
  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`group relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-300 ${
          isActive
            ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-md shadow-cyan-500/20'
            : 'border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-slate-900/60 text-cyan-300 hover:border-cyan-400 hover:text-white hover:shadow-md hover:shadow-cyan-500/20'
        } ${className}`}
        title="Start Voice Conversation with NEXUS AI"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
        </span>
        <Mic className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span>Live Voice</span>
      </button>
    );
  }

  // Default: Composer prominent button
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Start Immersive Voice Conversation"
      className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/70 via-indigo-950/70 to-slate-900/90 px-3.5 py-2 text-xs font-semibold text-cyan-200 shadow-lg shadow-cyan-950/40 transition-all duration-300 hover:border-cyan-400 hover:text-white hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-40 ${className}`}
    >
      {/* Subtle animated gradient sweep */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

      {/* Pulsing beacon indicator */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500" />
      </span>

      <div className="flex items-center gap-1.5 relative z-10">
        <Mic className="h-4 w-4 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />
        <span className="tracking-wide">Start Voice</span>
      </div>

      <Sparkles className="h-3 w-3 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
    </button>
  );
};
