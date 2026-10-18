import React, { useState, useEffect } from 'react';
import { X, Mic, Settings, Play, Check } from 'lucide-react';
import type { VoiceSettings } from '../../types';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: Partial<VoiceSettings>) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  if (!isOpen) return null;

  const handleTestVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Hello, I am NEXUS AI. Your voice settings are working properly.');
    utterance.rate = settings.speechRate || 1.05;

    if (settings.selectedVoice) {
      const match = availableVoices.find((v) => v.name === settings.selectedVoice);
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => setIsPlayingTest(true);
    utterance.onend = () => setIsPlayingTest(false);
    utterance.onerror = () => setIsPlayingTest(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-settings-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0c121e] p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Settings className="h-4 w-4" />
            </div>
            <h3 id="voice-settings-title" className="text-sm font-semibold text-white">
              Voice Conversation Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close voice settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Interaction Mode Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Conversation Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdateSettings({ mode: 'live_conversation' })}
              className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                settings.mode === 'live_conversation'
                  ? 'border-cyan-500 bg-cyan-950/30 text-white ring-1 ring-cyan-500/40'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-cyan-300 mb-0.5">
                <Mic className="h-3.5 w-3.5" />
                <span>Live Continuous</span>
              </div>
              <span className="text-[11px] text-slate-400 leading-tight">
                Hands-free automatic turn-taking like Gemini Voice.
              </span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ mode: 'push_to_talk' })}
              className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                settings.mode === 'push_to_talk'
                  ? 'border-indigo-500 bg-indigo-950/30 text-white ring-1 ring-indigo-500/40'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-300 mb-0.5">
                <Mic className="h-3.5 w-3.5" />
                <span>Push-To-Talk</span>
              </div>
              <span className="text-[11px] text-slate-400 leading-tight">
                Hold or tap mic to record, review, and manually send.
              </span>
            </button>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Speech Output Voice</label>
          <select
            value={settings.selectedVoice}
            onChange={(e) => onUpdateSettings({ selectedVoice: e.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Default High-Quality Natural Voice</option>
            {availableVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Speech Rate Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Speaking Speed</span>
            <span className="font-mono text-cyan-400">{settings.speechRate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.4"
            step="0.05"
            value={settings.speechRate}
            onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-xs text-slate-300">Spoken Voice Responses (TTS)</span>
            <input
              type="checkbox"
              checked={settings.outputEnabled}
              onChange={(e) => onUpdateSettings({ outputEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-xs text-slate-300">Auto-Listen After Assistant Response</span>
            <input
              type="checkbox"
              checked={settings.autoListen}
              onChange={(e) => onUpdateSettings({ autoListen: e.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-xs text-slate-300">Show Real-Time Transcripts</span>
            <input
              type="checkbox"
              checked={settings.transcriptVisible}
              onChange={(e) => onUpdateSettings({ transcriptVisible: e.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
            />
          </label>
        </div>

        {/* Test Speech Audio */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTestVoice}
            disabled={isPlayingTest}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/40 transition-colors disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{isPlayingTest ? 'Playing Test...' : 'Test Voice Audio'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
