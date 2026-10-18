import React from 'react';
import { CommandCenterHero } from './CommandCenterHero';
import { OperationalPanels } from '../dashboard/OperationalPanels';
import type { ExecutionEvent, AgentOrbState } from '../../types';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  threadId?: string;
  onNavigateToBookings?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToKnowledge?: () => void;
  onNavigateToWorkflows?: () => void;
  onNavigateToInsights?: () => void;
  onStartVoice?: () => void;
  events?: ExecutionEvent[];
  currentNode?: string;
  orbState?: AgentOrbState | 'listening' | 'speaking';
  userName?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  threadId = '',
  onNavigateToBookings,
  onNavigateToEvidence,
  onNavigateToKnowledge,
  onNavigateToWorkflows,
  onNavigateToInsights,
  onStartVoice,
  events = [],
  currentNode = 'idle',
  orbState = 'idle',
  userName = 'Alex',
}) => {
  return (
    <div className="flex flex-col items-center justify-start text-center max-w-6xl mx-auto w-full animate-fade-in pb-8">
      {/* 1. Futuristic Central Hero Workspace with Animated Holographic AI Sphere & 4 Floating Panels */}
      <CommandCenterHero
        onSelectPrompt={onSelectPrompt}
        onNavigateToBookings={onNavigateToBookings}
        onNavigateToKnowledge={onNavigateToKnowledge}
        onNavigateToWorkflows={onNavigateToWorkflows}
        onNavigateToInsights={onNavigateToInsights}
        orbState={orbState}
        userName={userName}
      />

      {/* 2. Coordinated Bottom Operational Dashboard (Appointments, Graph, Evidence, Voice) */}
      <OperationalPanels
        threadId={threadId}
        onNavigateToBookings={onNavigateToBookings}
        onNavigateToEvidence={onNavigateToEvidence}
        onStartVoice={onStartVoice}
        events={events}
        currentNode={currentNode}
      />
    </div>
  );
};
