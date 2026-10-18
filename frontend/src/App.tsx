import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { AgentActivityPanel } from './components/layout/AgentActivityPanel';
import { AssistantPage } from './pages/AssistantPage';
import { ExecutionSurface } from './components/execution/ExecutionSurface';
import { EvidenceLedger } from './components/evidence/EvidenceLedger';
import { CommandPalette } from './components/command/CommandPalette';
import { WorkflowReplayModal } from './components/replay/WorkflowReplayModal';
import { BookingsPage } from './pages/BookingsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';
import { OrganizationInsightsPage } from './pages/OrganizationInsightsPage';
import { AutomationHubPage } from './pages/AutomationHubPage';
import { TeamAccessPage } from './pages/TeamAccessPage';
import { api } from './services/api';
import type {
  ConversationSummary,
  ExecutionEvent,
  PendingBooking,
  OperatingSurface,
} from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('command-center');
  const [activeSurface, setActiveSurface] = useState<OperatingSurface>('work');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    return localStorage.getItem('nexus_thread_id') || `thread_${Date.now()}`;
  });
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Observability state shared with right panel and operational panels
  const [activityEvents, setActivityEvents] = useState<ExecutionEvent[]>([]);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | undefined>();
  const [currentNode, setCurrentNode] = useState<string>('idle');

  // Load conversations list
  const loadConversations = () => {
    api.getConversations()
      .then(setConversations)
      .catch((err) => console.error('Failed to load conversations:', err));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Persist active thread
  useEffect(() => {
    if (activeThreadId) {
      localStorage.setItem('nexus_thread_id', activeThreadId);
    }
  }, [activeThreadId]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewConversation = () => {
    const newThread = `thread_${Date.now()}`;
    setActiveThreadId(newThread);
    setCurrentTab('command-center');
    setActiveSurface('work');
    setActivityEvents([]);
    setPendingBooking(undefined);
    setCurrentNode('idle');
  };

  const handleSelectConversation = (threadId: string) => {
    setActiveThreadId(threadId);
    setCurrentTab('assistant');
    api.getActivity(threadId, 20)
      .then((traces) => {
        const mapped: ExecutionEvent[] = traces.map((t) => ({
          event_id: t.id,
          node_name: t.node_name,
          event_type: t.event_type,
          status: t.status as any,
          summary: t.summary,
          duration_ms: t.duration_ms,
          timestamp: t.created_at,
        }));
        setActivityEvents(mapped);
      })
      .catch(() => setActivityEvents([]));
  };

  const openAssistantWithPrompt = (prompt: string) => {
    setCurrentTab('command-center');
    setActiveSurface('work');
    setQueuedPrompt(prompt);
  };

  const handleQuickAction = (action: 'new_chat' | 'schedule' | 'ask_handbook' | 'upload_doc' | 'run_workflow') => {
    switch (action) {
      case 'new_chat':
        handleNewConversation();
        break;
      case 'schedule':
        openAssistantWithPrompt('I want to schedule a performance review.');
        break;
      case 'ask_handbook':
        openAssistantWithPrompt('How often are performance reviews conducted according to the handbook?');
        break;
      case 'upload_doc':
        setCurrentTab('knowledge');
        break;
      case 'run_workflow':
        setCurrentTab('workflows');
        setIsReplayModalOpen(true);
        break;
    }
  };

  const pageTitles: Record<string, string> = {
    'command-center': 'Command Center Workspace',
    assistant: 'AI Assistant',
    voice: 'Voice Studio',
    bookings: 'Bookings & Calendar',
    knowledge: 'Knowledge Grounding Engine',
    workflows: 'Agent Workflows',
    insights: 'Organization Insights & Telemetry',
    automation: 'Automation Hub',
    activity: 'Developer Observability',
    team: 'Team & Access Control',
    settings: 'System Settings',
  };

  const isCommandOrAssistant = currentTab === 'command-center' || currentTab === 'assistant' || currentTab === 'voice';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#030817] font-sans text-[#F4F7FF] antialiased selection:bg-[#00E5FF]/30 selection:text-[#00E5FF]">
      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        activeSurface={activeSurface}
        onSelectSurface={(surf) => {
          setCurrentTab('command-center');
          setActiveSurface(surf);
        }}
        onStartVoice={() => {
          setCurrentTab('command-center');
          setActiveSurface('work');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('nexus:start-voice'));
          }, 60);
        }}
        onNewChat={handleNewConversation}
        onOpenReplay={() => setIsReplayModalOpen(true)}
      />

      {/* Workflow Replay & Simulation Modal */}
      <WorkflowReplayModal
        isOpen={isReplayModalOpen}
        onClose={() => setIsReplayModalOpen(false)}
        threadId={activeThreadId}
      />

      {/* Left Sidebar (220px Fixed Desktop) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'command-center' || tab === 'assistant') {
            setActiveSurface('work');
          }
          if (tab === 'voice') {
            setCurrentTab('command-center');
            setActiveSurface('work');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('nexus:start-voice'));
            }, 60);
          }
        }}
        conversations={conversations}
        activeThreadId={activeThreadId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onQuickAction={handleQuickAction}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          title={pageTitles[currentTab] || 'Nexus AI'}
          threadId={isCommandOrAssistant ? activeThreadId : undefined}
          activeSurface={activeSurface}
          onSelectSurface={isCommandOrAssistant ? (surf) => setActiveSurface(surf) : undefined}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onStartVoice={() => {
            if (!isCommandOrAssistant) {
              setCurrentTab('command-center');
              setActiveSurface('work');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('nexus:start-voice'));
              }, 60);
            } else {
              window.dispatchEvent(new CustomEvent('nexus:start-voice'));
            }
          }}
          onOpenReplay={() => setIsReplayModalOpen(true)}
          isActivityPanelOpen={isActivityPanelOpen}
          onToggleActivityPanel={() => setIsActivityPanelOpen(!isActivityPanelOpen)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Central Workspace + Right Live Execution Panel */}
        <main className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 1. Command Center & AI Assistant */}
            {isCommandOrAssistant && (
              <>
                {activeSurface === 'work' && (
                  <AssistantPage
                    threadId={activeThreadId}
                    queuedPrompt={queuedPrompt}
                    onQueuedPromptConsumed={() => setQueuedPrompt(null)}
                    onThreadUpdate={loadConversations}
                    onSetActivityEvents={setActivityEvents}
                    onSetPendingBooking={setPendingBooking}
                    onSetCurrentNode={setCurrentNode}
                    onNavigateToBookings={() => setCurrentTab('bookings')}
                    onNavigateToKnowledge={() => setCurrentTab('knowledge')}
                    onNavigateToWorkflows={() => setCurrentTab('workflows')}
                    onNavigateToInsights={() => setCurrentTab('insights')}
                    onNavigateToEvidence={() => setActiveSurface('evidence')}
                    activityEvents={activityEvents}
                    currentNode={currentNode}
                  />
                )}

                {activeSurface === 'execution' && (
                  <ExecutionSurface
                    threadId={activeThreadId}
                    onOpenReplay={() => setIsReplayModalOpen(true)}
                    onWorkflowUpdated={loadConversations}
                  />
                )}

                {activeSurface === 'evidence' && (
                  <EvidenceLedger
                    threadId={activeThreadId}
                  />
                )}
              </>
            )}


            {/* 3. Bookings & Calendar */}
            {currentTab === 'bookings' && (
              <BookingsPage
                onNewBookingClick={(prompt) => {
                  openAssistantWithPrompt(
                    prompt || 'I want to schedule a performance review.'
                  );
                }}
              />
            )}

            {/* 4. Knowledge Base */}
            {currentTab === 'knowledge' && <KnowledgePage />}

            {/* 5. Agent Workflows */}
            {currentTab === 'workflows' && (
              <ExecutionSurface
                threadId={activeThreadId}
                onOpenReplay={() => setIsReplayModalOpen(true)}
                onWorkflowUpdated={loadConversations}
              />
            )}

            {/* 6. Organization Insights */}
            {currentTab === 'insights' && <OrganizationInsightsPage />}

            {/* 7. Automation Hub */}
            {currentTab === 'automation' && <AutomationHubPage />}

            {/* 8. Activity & Traces */}
            {currentTab === 'activity' && <ActivityPage />}

            {/* 9. Team & Access */}
            {currentTab === 'team' && <TeamAccessPage />}

            {/* 10. Settings */}
            {currentTab === 'settings' && <SettingsPage />}
          </div>

          {/* Right Live Agent Execution Panel (350px fixed on desktop) */}
          {isActivityPanelOpen && (isCommandOrAssistant || currentTab === 'workflows') && (
            <AgentActivityPanel
              events={activityEvents}
              pendingBooking={pendingBooking}
              currentNode={currentNode}
              isOpen={isActivityPanelOpen}
              onClose={() => setIsActivityPanelOpen(false)}
              intent={pendingBooking ? 'booking_workflow' : undefined}
              missingFields={
                pendingBooking
                  ? [
                      ...(!pendingBooking.full_name ? ['full_name'] : []),
                      ...(!pendingBooking.email ? ['email'] : []),
                      ...(!pendingBooking.slot_id ? ['slot_id'] : []),
                    ]
                  : []
              }
              workflowStatus={pendingBooking?.status || 'IDLE'}
              threadId={activeThreadId}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
