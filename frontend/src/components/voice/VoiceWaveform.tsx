import React from 'react';

interface VoiceWaveformProps {
  levels: number[];
  isActive: boolean;
  colorTheme?: 'cyan' | 'emerald' | 'purple' | 'slate';
  barCount?: number;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  levels,
  isActive,
  colorTheme = 'cyan',
  barCount = 12,
}) => {
  // Mirror or interpolate levels across barCount
  const bars = Array.from({ length: barCount }, (_, i) => {
    const srcIndex = i < barCount / 2 ? i : barCount - 1 - i;
    const base = levels[srcIndex % levels.length] || 15;
    return isActive ? Math.max(15, Math.min(100, base)) : 10;
  });

  const themeColors = {
    cyan: {
      bar: 'bg-cyan-400',
      activeGlow: 'shadow-[0_0_8px_#22d3ee]',
    },
    emerald: {
      bar: 'bg-emerald-400',
      activeGlow: 'shadow-[0_0_8px_#34d399]',
    },
    purple: {
      bar: 'bg-indigo-400',
      activeGlow: 'shadow-[0_0_8px_#818cf8]',
    },
    slate: {
      bar: 'bg-slate-600',
      activeGlow: '',
    },
  };

  const theme = themeColors[colorTheme] || themeColors.cyan;

  return (
    <div
      className="flex items-center justify-center gap-1.5 h-8 px-4"
      role="presentation"
      aria-hidden="true"
    >
      {bars.map((height, i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-all duration-75 motion-reduce:transition-none ${theme.bar} ${
            height > 40 ? theme.activeGlow : ''
          }`}
          style={{
            height: `${height}%`,
            opacity: isActive ? Math.max(0.4, height / 100) : 0.25,
          }}
        />
      ))}
    </div>
  );
};
