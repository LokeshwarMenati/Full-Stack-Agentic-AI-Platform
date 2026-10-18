import React, { useState } from 'react';
import {
  Settings,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Radio,
  Mic,
  MicOff,
  PhoneOff,
  X,
  Sparkles,
} from 'lucide-react';
import { VoiceOrb } from './VoiceOrb';
import { TalkingAvatar3D } from './TalkingAvatar3D';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import type { UseVoiceConversationReturn } from '../../hooks/useVoiceConversation';

interface VoiceWorkspaceProps {
  voice: UseVoiceConversationReturn;
  threadId: string;
  onClose: () => void;
  onViewBookings?: () => void;
}

export const VoiceWorkspace: React.FC<VoiceWorkspaceProps> = ({
  voice,
  threadId: _threadId,
  onClose,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [use3DAvatar, setUse3DAvatar] = useState(true);

  const {
    voiceState,
    sessionDuration,
    userTranscript,
    interimTranscript,
    assistantSpokenText,
    audioLevels,
    errorMessage,
    settings,
    clearError,
    updateSettings,
  } = voice;

  // Format MM:SS for duration
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndSessionAndReturn = async () => {
    await voice.endVoiceSession();
    onClose();
  };

  // Status mapping
  const getStatusInfo = () => {
    switch (voiceState) {
      case 'listening':
        return {
          label: 'Listening...',
          badge: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.25)]',
          dot: 'bg-cyan-400 animate-ping',
        };
      case 'transcribing':
        return {
          label: 'Transcribing...',
          badge: 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'processing':
        return {
          label: 'Thinking...',
          badge: 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.25)]',
          dot: 'bg-indigo-400 animate-pulse',
        };
      case 'speaking':
        return {
          label: 'Speaking...',
          badge: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
          dot: 'bg-emerald-400 animate-bounce',
        };
      case 'muted':
        return {
          label: 'Microphone Muted',
          badge: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-400',
        };
      case 'error':
        return {
          label: 'Connection Error',
          badge: 'bg-rose-500/10 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-400',
        };
      default:
        return {
          label: 'Ready',
          badge: 'bg-slate-800/60 border-slate-700 text-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Active displayed live text (clean and formatted)
  const currentLiveSpeech =
    assistantSpokenText ||
    interimTranscript ||
    userTranscript ||
    "Hi! I'm NEXUS AI, your enterprise intelligent assistant. How can I help you today?";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="NEXUS AI Voice Studio"
      className="fixed inset-0 z-50 flex flex-col bg-[#030817] text-slate-100 overflow-hidden font-sans select-none"
    >
      {/* Cinematic Ambient Background Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] rounded-full bg-cyan-600/10 blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-indigo-600/10 blur-[110px]" />
        <div className="futuristic-skyline opacity-40" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between px-6 border-b border-cyan-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="group flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Return to standard chat dashboard"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Chat</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
            <h1 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-cyan-100">
              NEXUS Voice Studio
            </h1>
          </div>
        </div>

        {/* Header Right: Avatar Mode Toggle & Live Timer */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setUse3DAvatar((prev) => !prev)}
            className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-[#071329]/80 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:border-cyan-400 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Toggle between Three.js Living 3D Human Avatar and Hologram Orb"
          >
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>{use3DAvatar ? '3D Human Avatar' : 'Hologram Orb'}</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-[#071329]/80 px-3 py-1 text-xs font-mono text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.15)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{formatDuration(sessionDuration)}</span>
          </div>
        </div>
      </header>

      {/* Main Cinematic Visual Canvas */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-between px-4 py-2 sm:py-4 overflow-hidden">
        {/* Error Banner */}
        {errorMessage && (
          <div className="w-full max-w-lg my-1 flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/60 p-2.5 text-xs text-rose-200 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              {voice.retryLastTurn && (
                <button
                  onClick={() => voice.retryLastTurn?.()}
                  className="flex items-center gap-1 rounded border border-cyan-500/60 bg-cyan-950/60 px-2 py-0.5 text-[11px] text-cyan-200 hover:bg-cyan-900/60"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
              )}
              <button
                onClick={() => clearError()}
                className="rounded border border-rose-700 bg-rose-900/60 px-2 py-0.5 text-[11px] text-white hover:bg-rose-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Central Large Human Avatar & Holographic Stage */}
        <div className="relative flex-1 flex flex-col items-center justify-center w-full max-w-4xl my-auto">
          <div className="relative flex items-center justify-center">
            {use3DAvatar ? (
              <TalkingAvatar3D
                state={voiceState}
                audioLevels={audioLevels}
                size="cinematic"
              />
            ) : (
              <VoiceOrb
                state={voiceState}
                audioLevels={audioLevels}
                size="cinematic"
              />
            )}
          </div>

          {/* Audio Waveform Equalizer beneath Avatar */}
          <div className="w-72 sm:w-80 max-w-md mt-6 sm:mt-8">
            <VoiceWaveform
              levels={audioLevels}
              isActive={voiceState === 'listening' || voiceState === 'speaking' || voiceState === 'transcribing'}
              colorTheme={voiceState === 'speaking' ? 'emerald' : voiceState === 'transcribing' ? 'purple' : 'cyan'}
              barCount={32}
            />
          </div>
        </div>

        {/* Lower Section: Live Conversation Caption & State Pill */}
        <div className="w-full max-w-2xl flex flex-col items-center gap-3 mb-2">
          {/* Translucent Dark Glass Caption Panel matching reference design */}
          <div className="w-full rounded-2xl border border-cyan-500/25 bg-[#071329]/75 backdrop-blur-xl px-5 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(0,229,255,0.12)] transition-all">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00E5FF]" />
              <span className="text-[11px] font-mono tracking-widest uppercase text-cyan-400 font-semibold">
                NEXUS AI Response
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans line-clamp-3 selection:bg-cyan-500/30">
              {currentLiveSpeech}
            </p>
          </div>

          {/* Glowing State Pill */}
          <div className={`flex items-center gap-2 px-4 py-1 rounded-full border text-xs font-medium tracking-wide ${statusInfo.badge} transition-all duration-300`}>
            <span className={`h-2 w-2 rounded-full ${statusInfo.dot}`} />
            <span>{statusInfo.label}</span>
          </div>
        </div>

        {/* Bottom Circular Controls Bar matching IMAGE 1 */}
        <div className="relative z-20 flex items-center justify-center gap-5 sm:gap-7 py-3">
          {/* Control 1: Mute / Unmute Microphone */}
          <button
            onClick={() => voice.toggleMicMute()}
            className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
              voice.isMicMuted
                ? 'border-rose-500/60 bg-rose-950/60 text-rose-300 shadow-rose-950/50 hover:bg-rose-900/60'
                : 'border-cyan-500/40 bg-[#071329]/90 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:border-cyan-400 hover:bg-[#0A1830]'
            }`}
            title={voice.isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={voice.isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {voice.isMicMuted ? (
              <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </button>

          {/* Control 2: End Session (Red Phone Call Hangup) */}
          <button
            onClick={handleEndSessionAndReturn}
            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-rose-500 bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.55)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer"
            title="End voice session and return to chat"
            aria-label="End voice session"
          >
            <PhoneOff className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>

          {/* Control 3: Voice Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-cyan-500/40 bg-[#071329]/90 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:border-cyan-400 hover:bg-[#0A1830] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Voice & Speech Settings"
            aria-label="Voice & Speech Settings"
          >
            <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          {/* Interrupt Speech Control Button (Appears floating when assistant is speaking) */}
          {voiceState === 'speaking' && (
            <button
              onClick={() => voice.interruptSpeaking()}
              className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-amber-500/70 bg-amber-950/80 text-amber-200 text-xs font-semibold shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse hover:bg-amber-900 transition-all cursor-pointer"
              title="Interrupt speaking immediately"
            >
              <X className="h-3.5 w-3.5" />
              <span>Tap to Interrupt</span>
            </button>
          )}
        </div>
      </main>

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
};
