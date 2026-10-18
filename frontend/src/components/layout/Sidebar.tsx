import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Mic,
  Calendar,
  BookOpen,
  Cpu,
  BarChart3,
  Zap,
  Activity,
  Users,
  Settings,
  Plus,
  CalendarPlus,
  HelpCircle,
  Upload,
  Play,
  Bot,
  User,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import type { ConversationSummary } from '../../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  conversations: ConversationSummary[];
  activeThreadId?: string;
  onSelectConversation: (threadId: string) => void;
  onNewConversation: () => void;
  onQuickAction?: (action: 'new_chat' | 'schedule' | 'ask_handbook' | 'upload_doc' | 'run_workflow') => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  conversations,
  activeThreadId,
  onSelectConversation,
  onNewConversation,
  onQuickAction,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 11 Core Navigation Items matching the exact reference specification
  const navItems = [
    { id: 'command-center', label: 'Command Center', icon: LayoutDashboard },
    { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
    { id: 'voice', label: 'Voice Studio', icon: Mic },
    { id: 'bookings', label: 'Bookings & Calendar', icon: Calendar },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'workflows', label: 'Agent Workflows', icon: Cpu },
    { id: 'insights', label: 'Organization Insights', icon: BarChart3 },
    { id: 'automation', label: 'Automation Hub', icon: Zap },
    { id: 'activity', label: 'Activity & Traces', icon: Activity },
    { id: 'team', label: 'Team & Access', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const quickActions = [
    { id: 'new_chat', label: 'New Conversation', icon: Plus },
    { id: 'schedule', label: 'Schedule Appointment', icon: CalendarPlus },
    { id: 'ask_handbook', label: 'Ask Handbook', icon: HelpCircle },
    { id: 'upload_doc', label: 'Upload Document', icon: Upload },
    { id: 'run_workflow', label: 'Run Workflow', icon: Play },
  ];

  const handleActionClick = (actionId: string) => {
    if (onCloseMobile) onCloseMobile();
    if (actionId === 'new_chat') {
      onNewConversation();
    } else if (onQuickAction) {
      onQuickAction(actionId as any);
    }
  };

  const sidebarContent = (
    <div
      className={`flex h-full flex-col border-r border-[#176BFF]/15 bg-[#050B19] text-[#94A9C8] transition-all duration-300 select-none ${
        isCollapsed ? 'w-16' : 'w-[220px]'
      }`}
    >
      {/* 1. NEXUS AI Logo and Branding */}
      <div className="flex items-center justify-between border-b border-[#176BFF]/15 px-3.5 py-3.5 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Holographic Glowing Emblem */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#00E5FF]/40 bg-gradient-to-tr from-[#050B19] via-[#0A1830] to-[#176BFF]/30 shadow-[0_0_15px_rgba(0,229,255,0.25)]">
            <Bot className="h-5 w-5 text-[#00E5FF]" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-[#F4F7FF] text-sm">NEXUS AI</span>
                <span className="rounded bg-[#00E5FF]/10 px-1 py-0.2 text-[9px] font-mono font-semibold text-[#00E5FF] border border-[#00E5FF]/30">
                  v1.0
                </span>
              </div>
              <p className="truncate text-[10px] text-[#5A7199]">Enterprise Assistant</p>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1 rounded-lg text-[#5A7199] hover:bg-[#0A1830] hover:text-[#F4F7FF] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Scrollable Navigation & Sections Area */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-4">
        {/* Navigation List */}
        <div className="space-y-0.5">
          {!isCollapsed && (
            <div className="px-2 pb-1.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-[#5A7199]">
              WORKSPACE
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`group flex w-full items-center rounded-lg py-1.5 text-xs font-medium transition-all ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                } ${
                  isActive
                    ? 'bg-[#176BFF] text-[#F4F7FF] font-semibold shadow-[0_0_15px_rgba(23,107,255,0.45)]'
                    : 'text-[#94A9C8] hover:bg-[#0A1830]/80 hover:text-[#F4F7FF]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#F4F7FF]' : 'text-[#00E5FF] group-hover:text-[#F4F7FF]'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
                )}
              </button>
            );
          })}
        </div>

        {/* 2. Quick Actions Section */}
        <div className="border-t border-[#176BFF]/15 pt-3 space-y-1">
          {!isCollapsed && (
            <div className="px-2 pb-1 text-[9px] font-mono font-semibold uppercase tracking-wider text-[#5A7199]">
              QUICK ACTIONS
            </div>
          )}
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.id}
                onClick={() => handleActionClick(qa.id)}
                title={isCollapsed ? qa.label : undefined}
                className={`flex w-full items-center rounded-lg py-1.5 text-[11px] font-medium text-[#94A9C8] hover:bg-[#0A1830] hover:text-[#00E5FF] transition-all ${
                  isCollapsed ? 'justify-center px-2' : 'gap-2 px-2.5 text-left'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#00E5FF]/80" />
                {!isCollapsed && <span className="truncate">{qa.label}</span>}
              </button>
            );
          })}
        </div>

        {/* 3. Recent Threads Section (if conversations exist) */}
        {conversations.length > 0 && !isCollapsed && (
          <div className="border-t border-[#176BFF]/15 pt-3 space-y-1">
            <div className="flex items-center justify-between px-2 pb-1 text-[9px] font-mono font-semibold uppercase tracking-wider text-[#5A7199]">
              <span>RECENT CHATS</span>
              <span className="text-[9px] font-mono text-[#5A7199]">{conversations.length}</span>
            </div>
            <div className="space-y-0.5">
              {conversations.slice(0, 4).map((c) => {
                const isActive = activeThreadId === c.thread_id;
                return (
                  <button
                    key={c.thread_id}
                    onClick={() => {
                      onSelectConversation(c.thread_id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] truncate transition-colors ${
                      isActive
                        ? 'bg-[#0A1830] text-[#00E5FF] font-medium border border-[#00E5FF]/30'
                        : 'text-[#94A9C8] hover:bg-[#0A1830]/50 hover:text-[#F4F7FF]'
                    }`}
                  >
                    <span className="truncate">{c.title || c.thread_id.slice(0, 14)}</span>
                    <span className="text-[9px] font-mono text-[#5A7199] ml-1 shrink-0">
                      {c.message_count || 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. User Profile at the bottom (Alex Chen) */}
      <div className="border-t border-[#176BFF]/15 p-2.5 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#071329] p-2 border border-[#176BFF]/20">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#176BFF]/20 text-[#00E5FF] border border-[#176BFF]/40">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-xs text-[#F4F7FF]">Alex Chen</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E6A0] shadow-[0_0_6px_#00E6A0]" />
                <p className="truncate text-[9px] text-[#94A9C8]">Assessment Session</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#176BFF]/20 text-[#00E5FF] border border-[#176BFF]/40">
              <User className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed ~220px Sidebar */}
      <aside className="hidden md:flex h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative flex w-[220px] flex-col bg-[#050B19] shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
