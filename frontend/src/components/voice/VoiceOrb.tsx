import React from 'react';
import type { VoiceState } from '../../types';

interface VoiceOrbProps {
  state: VoiceState;
  audioLevels?: number[];
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'cinematic';
  className?: string;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  audioLevels = [15, 20, 15, 25, 20, 15],
  size = 'cinematic',
  className = '',
}) => {
  // Calculate average audio intensity (0 to 1)
  const avgLevel = audioLevels.reduce((a, b) => a + b, 0) / (audioLevels.length || 1);
  const audioScale = Math.min(1.35, 1 + (avgLevel / 100) * 0.35);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28',
    lg: 'w-44 h-44 sm:w-56 sm:h-56',
    xl: 'w-60 h-60 sm:w-72 sm:h-72',
    '2xl': 'w-72 h-72 sm:w-80 sm:h-80',
    '3xl': 'w-80 h-80 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px]',
    cinematic: 'w-72 h-72 sm:w-96 sm:h-96 md:w-[400px] md:h-[400px] lg:w-[440px] lg:h-[440px]',
  };

  // State-specific color palettes and glow
  const stateThemes = {
    idle: {
      core: 'from-slate-800 via-blue-950 to-slate-900',
      ring1: 'border-cyan-500/30',
      ring2: 'border-blue-500/20',
      glow: 'shadow-cyan-950/40',
      pulseSpeed: 'duration-1000',
    },
    requesting_permission: {
      core: 'from-amber-600 via-amber-800 to-slate-900',
      ring1: 'border-amber-400/40',
      ring2: 'border-amber-500/20',
      glow: 'shadow-amber-500/30',
      pulseSpeed: 'duration-700',
    },
    listening: {
      core: 'from-cyan-400 via-blue-600 to-indigo-900',
      ring1: 'border-cyan-400/70',
      ring2: 'border-blue-400/50',
      glow: 'shadow-cyan-500/60',
      pulseSpeed: 'duration-500',
    },
    transcribing: {
      core: 'from-amber-500 via-cyan-600 to-indigo-900',
      ring1: 'border-amber-400/60',
      ring2: 'border-cyan-500/40',
      glow: 'shadow-amber-500/50',
      pulseSpeed: 'duration-400',
    },
    processing: {
      core: 'from-indigo-500 via-purple-600 to-pink-900',
      ring1: 'border-indigo-400/60',
      ring2: 'border-purple-500/40',
      glow: 'shadow-purple-500/50',
      pulseSpeed: 'duration-300',
    },
    speaking: {
      core: 'from-emerald-400 via-teal-500 to-cyan-900',
      ring1: 'border-emerald-400/70',
      ring2: 'border-cyan-400/50',
      glow: 'shadow-emerald-500/60',
      pulseSpeed: 'duration-500',
    },
    muted: {
      core: 'from-slate-800 via-zinc-900 to-black',
      ring1: 'border-slate-700/40',
      ring2: 'border-slate-800/20',
      glow: 'shadow-black/40',
      pulseSpeed: 'duration-1000',
    },
    error: {
      core: 'from-rose-600 via-rose-900 to-black',
      ring1: 'border-rose-500/60',
      ring2: 'border-rose-600/30',
      glow: 'shadow-rose-500/50',
      pulseSpeed: 'duration-500',
    },
    ended: {
      core: 'from-slate-800 to-slate-950',
      ring1: 'border-slate-800',
      ring2: 'border-slate-900',
      glow: 'shadow-black/20',
      pulseSpeed: 'duration-1000',
    },
  };

  const theme = stateThemes[state] || stateThemes.idle;

  return (
    <div
      className={`relative flex items-center justify-center ${sizeClasses[size]} ${className}`}
      role="img"
      aria-label={`NEXUS Voice Assistant Orb: State is ${state}`}
    >
      {/* Outer Deep Atmosphere Radial Glow */}
      <div
        className={`absolute -inset-10 sm:-inset-16 rounded-full bg-gradient-to-tr ${theme.core} blur-3xl opacity-50 transition-transform duration-200 pointer-events-none`}
        style={{
          transform: state === 'listening' || state === 'speaking' ? `scale(${audioScale * 1.25})` : 'scale(1)',
        }}
      />

      {/* Orbit Ring 1 - Deep outer dotted celestial ring */}
      <div
        className={`absolute -inset-8 sm:-inset-12 rounded-full border border-cyan-500/25 border-dotted opacity-50 animate-[spin_35s_linear_infinite] pointer-events-none`}
      />

      {/* Orbit Ring 2 - Ambient Holographic Counter-Rotation Ring */}
      <div
        className={`absolute -inset-4 sm:-inset-6 rounded-full border ${theme.ring1} border-dashed opacity-75 animate-[spin_24s_linear_infinite_reverse] pointer-events-none`}
        style={{
          transform: state === 'listening' ? `scale(${audioScale})` : 'scale(1)',
        }}
      />

      {/* Orbit Ring 3 - Precision Glowing Cyan Halo */}
      <div
        className={`absolute -inset-1 sm:-inset-2 rounded-full border-2 ${theme.ring2} opacity-90 ${
          state === 'processing'
            ? 'animate-[spin_4s_linear_infinite]'
            : 'animate-[spin_16s_linear_infinite]'
        } pointer-events-none shadow-[0_0_25px_rgba(0,229,255,0.35)]`}
      />

      {/* Pulsing Audio Reactivity Ripple when listening/speaking */}
      {(state === 'listening' || state === 'speaking') && (
        <div
          className={`absolute -inset-2 rounded-full border-2 border-cyan-400/50 animate-ping opacity-40 ${theme.pulseSpeed} pointer-events-none`}
        />
      )}

      {/* Core Plasma / Humanoid AI Avatar Container */}
      <div
        className={`relative h-full w-full rounded-full bg-gradient-to-br ${theme.core} p-1 shadow-2xl ${theme.glow} transition-all duration-150 motion-reduce:transition-none overflow-hidden border-2 border-cyan-400/50`}
        style={{
          transform: state === 'listening' || state === 'speaking' ? `scale(${audioScale})` : 'scale(1)',
        }}
      >
        {/* Realistic Human AI Assistant Living Avatar Stage */}
        <div className="relative h-full w-full rounded-full overflow-hidden bg-slate-950">
          {/* Base Living Human Character */}
          <div
            className={`h-full w-full relative transition-transform duration-300 ${
              state === 'speaking'
                ? 'animate-avatar-speaking animate-avatar-nod'
                : state === 'processing' || state === 'transcribing'
                ? 'animate-avatar-thinking'
                : state === 'listening'
                ? 'animate-avatar-nod'
                : 'animate-avatar-breathing'
            }`}
          >
            <img
              src="/ai_avatar_v2.jpg"
              alt="NEXUS AI Living Humanoid Assistant"
              className={`h-full w-full rounded-full object-cover transition-all duration-300 select-none pointer-events-none ${
                state === 'speaking'
                  ? 'brightness-110 contrast-105'
                  : state === 'listening'
                  ? 'brightness-105 saturate-110'
                  : state === 'processing'
                  ? 'brightness-95 contrast-105'
                  : 'brightness-95 saturate-100'
              }`}
            />

            {/* Natural facial depth illumination */}
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-t from-cyan-900/10 via-transparent to-transparent pointer-events-none"
            />

            {/* Synchronized Lip-Sync Lower-Face & Jaw Motion Layer */}
            {state === 'speaking' && (
              <div
                className="absolute top-[46%] left-[41%] w-[18%] h-[8%] rounded-full bg-[#0a1222]/80 blur-[2px] pointer-events-none animate-lip-sync"
                style={{
                  transform: `scaleY(${1 + (avgLevel / 100) * 0.85})`,
                  opacity: Math.min(0.9, 0.4 + (avgLevel / 100) * 0.5),
                }}
              />
            )}

            {/* Realistic Speech Resonance / Mouth & Lower-Face Dynamic Glow when speaking */}
            {state === 'speaking' && (
              <div
                className="absolute top-[45%] left-1/2 -translate-x-1/2 w-28 h-14 rounded-full bg-cyan-400/25 blur-md animate-speech-glow pointer-events-none"
                style={{
                  transform: `translateX(-50%) scale(${audioScale})`,
                }}
              />
            )}
          </div>

          {/* Dynamic Holographic Audio Light Overlay */}
          <div
            className={`absolute inset-0 rounded-full transition-opacity duration-300 pointer-events-none ${
              state === 'speaking'
                ? 'bg-gradient-to-t from-emerald-500/20 via-cyan-400/10 to-transparent opacity-80'
                : state === 'listening'
                ? 'bg-gradient-to-t from-cyan-500/30 via-transparent to-blue-500/20 opacity-70'
                : state === 'processing'
                ? 'bg-gradient-to-t from-indigo-500/35 via-purple-500/20 to-transparent opacity-85'
                : 'opacity-0'
            }`}
          />

          {/* Shimmer light reflex */}
          <div className="absolute -top-1/4 -left-1/4 h-3/4 w-3/4 rounded-full bg-white/15 blur-xl pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
