import React from 'react';
import { Mic, MicOff, Check, X, AlertCircle, Loader2 } from 'lucide-react';

interface VoiceVisualizerProps {
  isListening: boolean;
  transcript: string;
  isTranscribing?: boolean;
  audioLevels?: number[];
  errorMessage?: string | null;
  onStop: () => void;
  onSend: () => void;
  onCancel: () => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isListening,
  transcript,
  isTranscribing = false,
  audioLevels = [20, 45, 30, 60, 40, 25],
  errorMessage,
  onStop,
  onSend,
  onCancel,
}) => {
  if (!isListening && !errorMessage && !isTranscribing) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/80 via-slate-900/95 to-indigo-950/80 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Animated Mic + Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/30">
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin text-cyan-200" />
            ) : (
              <>
                <span className="absolute -inset-1 animate-ping rounded-xl bg-cyan-400/40 opacity-75" />
                <Mic className="h-5 w-5 animate-pulse" />
              </>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {isTranscribing
                  ? 'Transcribing audio...'
                  : transcript
                  ? 'Voice Detected'
                  : 'Recording your voice...'}
              </span>
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            </div>

            {/* Real-time reactive Audio Level Equalizer */}
            <div className="flex items-center gap-1.5 h-3.5 pt-0.5">
              {audioLevels.map((level, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full transition-all duration-75"
                  style={{
                    height: isTranscribing ? '30%' : `${Math.max(20, Math.min(100, level))}%`,
                    backgroundColor: level > 40 ? '#38bdf8' : '#0284c7',
                    boxShadow: level > 50 ? '0 0 8px #38bdf8' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            title="Cancel voice input"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {isListening && (
            <button
              type="button"
              onClick={onStop}
              title="Stop recording"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 transition-colors"
            >
              <MicOff className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onSend}
            disabled={isTranscribing}
            title="Send voice query"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 text-xs font-medium text-white shadow-md hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Send Query</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message if microphone is blocked */}
      {errorMessage && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-2 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Transcript / Prompt Preview */}
      {!errorMessage && (
        <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-slate-200 min-h-[38px] flex items-center">
          {isTranscribing ? (
            <p className="flex items-center gap-2 text-cyan-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Transcribing your audio recording...</span>
            </p>
          ) : transcript ? (
            <p className="italic text-cyan-200 font-medium">"{transcript}"</p>
          ) : (
            <p className="text-slate-400 italic">
              Speak now, then click <strong>Send Query</strong> (e.g. "What is our leave policy?" or "Schedule a review with Alex")
            </p>
          )}
        </div>
      )}
    </div>
  );
};
