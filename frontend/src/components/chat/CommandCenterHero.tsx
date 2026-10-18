import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Cpu,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { AIOrb } from '../ui/AIOrb';
import type { AgentOrbState } from '../../types';

interface CommandCenterHeroProps {
  onSelectPrompt: (prompt: string) => void;
  onNavigateToKnowledge?: () => void;
  onNavigateToBookings?: () => void;
  onNavigateToWorkflows?: () => void;
  onNavigateToInsights?: () => void;
  orbState?: AgentOrbState | 'listening' | 'speaking';
  userName?: string;
}

export const CommandCenterHero: React.FC<CommandCenterHeroProps> = ({
  onSelectPrompt,
  onNavigateToKnowledge: _onNavigateToKnowledge,
  onNavigateToBookings: _onNavigateToBookings,
  onNavigateToWorkflows: _onNavigateToWorkflows,
  onNavigateToInsights: _onNavigateToInsights,
  orbState = 'idle',
  userName = 'Alex',
}) => {
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  const featurePanels = [
    {
      id: 'knowledge',
      title: 'Knowledge Intelligence',
      badge: '24/7 Document Grounded',
      icon: BookOpen,
      iconColor: 'text-[#00E5FF]',
      borderHover: 'hover:border-[#00E5FF]/60 hover:shadow-[0_0_25px_rgba(0,229,255,0.2)]',
      items: [
        'Employee Handbook & Guidelines',
        'HR Policies & Compliance',
        'Benefits, Insurance & PTO',
        'Performance Review Cadence',
        '24/7 document-grounded answers',
      ],
      samplePrompt: 'How often are performance reviews conducted according to the handbook?',
      actionLabel: 'Ask NEXUS',
      onAction: () => onSelectPrompt('How often are performance reviews conducted according to the handbook?'),
    },
    {
      id: 'booking',
      title: 'Appointment Booking',
      badge: 'Real-time Availability',
      icon: Calendar,
      iconColor: 'text-[#176BFF]',
      borderHover: 'hover:border-[#176BFF]/70 hover:shadow-[0_0_25px_rgba(23,107,255,0.25)]',
      items: [
        'Schedule performance reviews',
        'Career discussions & HR meetings',
        'HR consultations with coordinators',
        'Real-time slot availability check',
        'Secure transactional booking',
      ],
      samplePrompt: 'I want to schedule a performance review.',
      actionLabel: 'Start Booking',
      onAction: () => onSelectPrompt('I want to schedule a performance review.'),
    },
    {
      id: 'actions',
      title: 'Execute Actions',
      badge: 'Agent Workflows',
      icon: Cpu,
      iconColor: 'text-[#873DFF]',
      borderHover: 'hover:border-[#873DFF]/70 hover:shadow-[0_0_25px_rgba(135,61,255,0.25)]',
      items: [
        'LangGraph agent workflows',
        'Calendar integration & slot lock',
        'Policy guidance & contextual rules',
        'Automated operations & checkpointing',
        'Human-in-the-loop approval gates',
      ],
      samplePrompt: 'Alex Chen, alex.chen@example.com. Before continuing, how often are performance reviews conducted according to the handbook?',
      actionLabel: 'Run Agent Workflow',
      onAction: () =>
        onSelectPrompt(
          'Alex Chen, alex.chen@example.com. Before continuing, how often are performance reviews conducted according to the handbook?'
        ),
    },
    {
      id: 'insights',
      title: 'Insights & Analytics',
      badge: 'Execution Efficiency',
      icon: BarChart3,
      iconColor: 'text-[#00E6A0]',
      borderHover: 'hover:border-[#00E6A0]/70 hover:shadow-[0_0_25px_rgba(0,230,160,0.2)]',
      items: [
        'Knowledge retrieval telemetry',
        'Workflow summaries & duration ms',
        'Execution efficiency & node metrics',
        'State persistence & checkpoint audit',
        'Transactional database commit ledger',
      ],
      samplePrompt: 'What does the handbook say about workplace safety?',
      actionLabel: 'Ask About Safety',
      onAction: () => onSelectPrompt('What does the handbook say about workplace safety?'),
    },
  ];

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center pt-2 pb-6 px-3 sm:px-6">
      {/* 1. Cinematic Architectural Perspective Background Subtle Grid & Skyline Lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        {/* Isometric office architectural line art */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grid-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#176BFF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#030817" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,80 L600,280 L1200,80" fill="none" stroke="url(#grid-grad)" strokeWidth="1" />
          <path d="M0,140 L600,320 L1200,140" fill="none" stroke="url(#grid-grad)" strokeWidth="1" />
          <path d="M200,0 L600,280 L1000,0" fill="none" stroke="url(#grid-grad)" strokeWidth="0.8" opacity="0.5" />
          <line x1="600" y1="280" x2="600" y2="700" stroke="#176BFF" strokeWidth="1" strokeOpacity="0.12" />
        </svg>
      </div>

      {/* 2. Central Holographic NEXUS AI Sphere */}
      <div className="relative z-10 mb-5 flex justify-center items-center">
        <AIOrb size="xl" state={orbState} />
      </div>

      {/* 3. Welcome Heading (Strictly matching reference text and styling) */}
      <div className="relative z-10 text-center max-w-2xl mx-auto mb-7">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#F4F7FF] mb-2 leading-tight">
          {greeting},{' '}
          <span className="text-[#00E5FF] drop-shadow-[0_0_20px_rgba(0,229,255,0.45)]">
            {userName || 'Alex'}
          </span>
          .
        </h1>
        <p className="text-sm sm:text-base font-medium text-[#94A9C8] mb-1">
          I'm <span className="text-[#F4F7FF] font-semibold">NEXUS</span> — your enterprise AI assistant.
        </p>
        <p className="text-xs sm:text-xs text-[#5A7199] max-w-lg mx-auto leading-relaxed">
          Ask questions, schedule appointments, explore policies, or let me execute complex workflows for you.
        </p>
      </div>

      {/* 4. Four Floating Glass-Style Feature Panels (2x2 Grid around sphere) */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left mb-6">
        {featurePanels.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className={`group flex flex-col justify-between rounded-2xl bg-[#071329]/80 border border-[#176BFF]/25 p-4.5 backdrop-blur-xl transition-all duration-300 ${p.borderHover}`}
            >
              <div>
                {/* Panel Header */}
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#176BFF]/15">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#0A1830] border border-[#176BFF]/30">
                      <Icon className={`h-4 w-4 ${p.iconColor}`} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F4F7FF]">
                      {p.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0A1830] border border-[#176BFF]/30 text-[#94A9C8]">
                    {p.badge}
                  </span>
                </div>

                {/* Bullet Points */}
                <ul className="space-y-1 mb-3.5">
                  {p.items.map((it, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-xs text-[#94A9C8]">
                      <span className="h-1 w-1 rounded-full bg-[#00E5FF]/70" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>

                {/* Sample Prompt Preview */}
                <button
                  type="button"
                  onClick={() => onSelectPrompt(p.samplePrompt)}
                  className="w-full text-left p-2 rounded-xl bg-[#030817]/60 border border-[#176BFF]/15 hover:border-[#00E5FF]/40 transition-colors group/item"
                >
                  <p className="text-[11px] text-[#5A7199] font-mono mb-0.5">Quick Prompt:</p>
                  <p className="text-xs text-[#F4F7FF] font-medium truncate group-hover/item:text-[#00E5FF]">
                    "{p.samplePrompt}"
                  </p>
                </button>
              </div>

              {/* Panel Action Button */}
              <div className="mt-3.5 pt-2 border-t border-[#176BFF]/15 flex items-center justify-between">
                <button
                  onClick={p.onAction}
                  className="flex items-center gap-1 text-xs font-semibold text-[#00E5FF] hover:text-[#F4F7FF] transition-colors"
                >
                  <span>{p.actionLabel}</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
