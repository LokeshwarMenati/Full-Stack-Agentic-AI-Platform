import React, { useState } from 'react';
import {
  Menu,
  Search,
  Mic,
  Cpu,
  Bell,
  X,
  User,
  Sliders,
} from 'lucide-react';
import type { OperatingSurface } from '../../types';

interface TopBarProps {
  title: string;
  threadId?: string;
  activeSurface?: OperatingSurface;
  onSelectSurface?: (surface: OperatingSurface) => void;
  onOpenCommandPalette: () => void;
  onStartVoice?: () => void;
  onOpenReplay?: () => void;
  isActivityPanelOpen: boolean;
  onToggleActivityPanel: () => void;
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  threadId,
  activeSurface = 'work',
  onSelectSurface,
  onOpenCommandPalette,
  onStartVoice,
  isActivityPanelOpen,
  onToggleActivityPanel,
  onOpenMobileMenu,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'StateGraph Checkpointed', time: 'Just now', desc: 'Active thread session securely checkpointed in SQLite.' },
    { id: 2, title: 'FastAPI Backend Online', time: '2m ago', desc: 'RAG Knowledge Retriever & Slot Services ready.' },
  ];

  return (
    <header className="relative flex h-13 shrink-0 items-center justify-between border-b border-[#176BFF]/20 bg-[#050B19]/95 px-3.5 backdrop-blur-xl z-30">
      {/* Left Area: Mobile hamburger & Context view / surfaces */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-1 text-[#94A9C8] hover:bg-[#0A1830] hover:text-[#F4F7FF] md:hidden"
          title="Open menu"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Surface Switcher (when in Assistant / Command Center) or Title */}
        {onSelectSurface ? (
          <div className="hidden sm:flex items-center bg-[#071329] border border-[#176BFF]/25 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => onSelectSurface('work')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeSurface === 'work'
                  ? 'bg-[#176BFF] text-[#F4F7FF] shadow-sm'
                  : 'text-[#94A9C8] hover:text-[#F4F7FF]'
              }`}
            >
              <span>Work</span>
            </button>
            <button
              onClick={() => onSelectSurface('execution')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeSurface === 'execution'
                  ? 'bg-[#176BFF] text-[#F4F7FF] shadow-sm'
                  : 'text-[#94A9C8] hover:text-[#F4F7FF]'
              }`}
            >
              <span>Execution</span>
            </button>
            <button
              onClick={() => onSelectSurface('evidence')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeSurface === 'evidence'
                  ? 'bg-[#176BFF] text-[#F4F7FF] shadow-sm'
                  : 'text-[#94A9C8] hover:text-[#F4F7FF]'
              }`}
            >
              <span>Evidence</span>
            </button>
          </div>
        ) : (
          <span className="font-semibold text-xs text-[#F4F7FF] px-2">{title}</span>
        )}

        {threadId && (
          <span className="hidden xl:inline-flex items-center rounded bg-[#071329] px-2 py-0.5 text-[10px] font-mono text-[#5A7199] border border-[#176BFF]/20">
            thread: {threadId.slice(0, 14)}...
          </span>
        )}
      </div>

      {/* Center: Global Search / Command Palette Input */}
      <div className="flex-1 max-w-md mx-4">
        <button
          onClick={onOpenCommandPalette}
          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 bg-[#071329] hover:bg-[#0A1830] border border-[#176BFF]/25 hover:border-[#00E5FF]/40 rounded-xl text-xs text-[#94A9C8] transition-all shadow-inner"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-[#00E5FF]" />
            <span className="truncate">Search commands, policies, slots...</span>
          </div>
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono bg-[#0A1830] text-[#00E5FF] border border-[#176BFF]/30 rounded">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Toolbar Controls */}
      <div className="flex items-center gap-2">
        {/* StateGraph Engine Badge */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-lg bg-[#071329] border border-[#176BFF]/25 px-2.5 py-1 text-[11px] text-[#94A9C8]">
          <Cpu className="h-3.5 w-3.5 text-[#00E5FF]" />
          <span className="font-mono text-[10px]">StateGraph Checkpointed</span>
        </div>

        {/* Backend Connection Status */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#071329] border border-[#00E6A0]/30 px-2.5 py-1 text-[11px] text-[#00E6A0]">
          <span className="h-2 w-2 rounded-full bg-[#00E6A0] animate-pulse" />
          <span className="font-mono text-[10px]">FastAPI Online</span>
        </div>

        {/* Quick Microphone Shortcut */}
        {onStartVoice && (
          <button
            onClick={onStartVoice}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#176BFF]/15 hover:bg-[#176BFF]/25 text-[#00E5FF] border border-[#176BFF]/30 text-xs font-medium transition-all"
            title="Start voice interaction"
            aria-label="Start voice interaction"
          >
            <Mic className="h-3.5 w-3.5 animate-pulse" />
            <span className="hidden sm:inline text-[11px]">Voice</span>
          </button>
        )}

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 rounded-lg text-[#94A9C8] hover:bg-[#0A1830] hover:text-[#F4F7FF] transition-colors border border-transparent hover:border-[#176BFF]/30"
            title="System notifications"
            aria-label="System notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#00E5FF]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#071329] border border-[#176BFF]/30 p-3 shadow-2xl backdrop-blur-2xl z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#176BFF]/20 text-xs font-semibold text-[#F4F7FF]">
                <span>System Notifications</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[#5A7199] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-lg bg-[#0A1830] p-2 border border-[#176BFF]/15 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-medium text-[#00E5FF]">
                      <span>{n.title}</span>
                      <span className="text-[9px] text-[#5A7199]">{n.time}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#94A9C8]">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Execution Panel Toggle */}
        <button
          onClick={onToggleActivityPanel}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            isActivityPanelOpen
              ? 'border-[#00E5FF]/40 bg-[#00E5FF]/15 text-[#00E5FF]'
              : 'border-[#176BFF]/25 bg-[#071329] text-[#94A9C8] hover:text-[#F4F7FF]'
          }`}
          title="Toggle live agent execution panel"
          aria-label="Toggle live agent execution panel"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span className="hidden xl:inline text-[11px]">Execution</span>
        </button>

        {/* User Profile Mini Badge */}
        <div className="flex items-center gap-1.5 pl-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#176BFF]/20 text-[#00E5FF] border border-[#176BFF]/40">
            <User className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </header>
  );
};
