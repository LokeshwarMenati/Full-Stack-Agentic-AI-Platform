import React from 'react';
import type { AgentOrbState } from '../../types';

interface AIOrbProps {
  state?: AgentOrbState | 'listening' | 'speaking';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AIOrb: React.FC<AIOrbProps> = ({
  state = 'idle',
  size = 'lg',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
    xl: 'w-56 h-56',
  };

  // State-dependent kinetic stroke colors
  const ringColorMap: Record<string, string> = {
    idle: 'stroke-[#00E5FF]/50',
    listening: 'stroke-[#00E5FF] animate-pulse',
    processing: 'stroke-[#176BFF]',
    retrieving: 'stroke-[#00E6A0]',
    executing: 'stroke-[#FFB020]',
    speaking: 'stroke-[#873DFF]',
    completed: 'stroke-[#00E6A0]',
    error: 'stroke-[#FF3B5C]',
  };

  // State-dependent ambient halo glows
  const glowColorMap: Record<string, string> = {
    idle: 'from-[#00E5FF]/20 via-[#176BFF]/15 to-[#873DFF]/20 shadow-[0_0_50px_rgba(0,229,255,0.35)]',
    listening: 'from-[#00E5FF]/35 via-[#00E6A0]/20 to-[#176BFF]/30 shadow-[0_0_65px_rgba(0,229,255,0.6)] animate-pulse',
    processing: 'from-[#176BFF]/35 via-[#873DFF]/25 to-[#00E5FF]/35 shadow-[0_0_60px_rgba(23,107,255,0.6)]',
    retrieving: 'from-[#00E6A0]/35 via-[#00E5FF]/30 to-[#176BFF]/35 shadow-[0_0_60px_rgba(0,230,160,0.55)]',
    executing: 'from-[#FFB020]/35 via-[#176BFF]/25 to-[#873DFF]/30 shadow-[0_0_55px_rgba(255,176,32,0.5)]',
    speaking: 'from-[#873DFF]/45 via-[#176BFF]/30 to-[#00E5FF]/40 shadow-[0_0_65px_rgba(135,61,255,0.65)]',
    completed: 'from-[#00E6A0]/40 via-[#00E5FF]/25 to-[#176BFF]/30 shadow-[0_0_50px_rgba(0,230,160,0.5)]',
    error: 'from-[#FF3B5C]/40 via-[#873DFF]/30 to-[#FF3B5C]/35 shadow-[0_0_55px_rgba(255,59,92,0.6)]',
  };

  return (
    <div
      aria-label={`Nexus AI Assistant State: ${state}`}
      role="img"
      className={`relative flex items-center justify-center select-none ${sizeMap[size]} ${className}`}
    >
      {/* 1. Ambient Background Volumetric Radial Halo */}
      <div
        className={`absolute inset-[-20%] rounded-full bg-gradient-to-tr transition-all duration-700 blur-2xl ${
          glowColorMap[state] || glowColorMap.idle
        }`}
      />

      {/* 2. Outer Kinetic Segmented Orbital Ring with Satellite Node */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full animate-spin-slow transition-transform drop-shadow-[0_0_10px_rgba(0,229,255,0.45)]"
      >
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          strokeWidth="1.2"
          strokeDasharray="20 14 8 10 28 12"
          className={`${ringColorMap[state] || ringColorMap.idle} transition-colors duration-500`}
        />
        {/* Orbital Satellite Node */}
        <circle cx="97" cy="50" r="2.8" className="fill-[#00E5FF] drop-shadow-[0_0_8px_#00E5FF]" />
        <circle cx="3" cy="50" r="2" className="fill-[#873DFF] opacity-80" />
      </svg>

      {/* 3. Middle Counter-Rotating Celestial Coordinate Ring */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-[9%] w-[82%] h-[82%] animate-spin-reverse transition-transform opacity-75"
      >
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          strokeWidth="1"
          strokeDasharray="32 20 12 16"
          className="stroke-[#176BFF]/70"
        />
        {/* Secondary Satellite Dots */}
        <circle cx="50" cy="9" r="2.2" className="fill-[#873DFF] drop-shadow-[0_0_6px_#873DFF]" />
        <circle cx="50" cy="91" r="1.8" className="fill-[#00E5FF]/70" />
      </svg>

      {/* 4. Fine Inner Precision Measurement Marks & Astrolabe Ticks */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-[19%] w-[62%] h-[62%] animate-spin-slow opacity-60"
      >
        <circle
          cx="50"
          cy="50"
          r="33"
          fill="none"
          strokeWidth="0.8"
          strokeDasharray="3 5 6 4"
          className="stroke-[#00E5FF]/45"
        />
      </svg>

      {/* 5. Central Holographic Core Sphere */}
      <div
        className={`relative z-10 w-2/5 h-2/5 rounded-full bg-gradient-to-tr from-[#00E5FF] via-[#176BFF] to-[#873DFF] shadow-[0_0_30px_rgba(0,229,255,0.8)] border border-white/40 flex items-center justify-center transition-all duration-500 ${
          state === 'processing' || state === 'retrieving'
            ? 'animate-pulse scale-110'
            : state === 'listening'
            ? 'scale-105 shadow-[0_0_40px_rgba(0,229,255,0.9)]'
            : state === 'speaking'
            ? 'scale-110 shadow-[0_0_45px_rgba(135,61,255,0.9)] animate-bounce-subtle'
            : 'animate-sphere-pulse'
        }`}
      >
        {/* Inner Glowing NEXUS Geometric Core Symbol */}
        <div className="w-[58%] h-[58%] rounded-full bg-[#030817]/90 border border-[#00E5FF]/70 flex items-center justify-center shadow-inner relative overflow-hidden">
          {/* Subtle Radar Sweep line inside Core */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00E5FF]/30 to-transparent animate-spin-slow opacity-60" />
          {/* Pulsing Core Beacon */}
          <div
            className={`w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF] relative z-10 ${
              state !== 'idle' ? 'animate-ping' : 'animate-pulse'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
