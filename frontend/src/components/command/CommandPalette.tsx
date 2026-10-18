import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Cpu,
  FileCheck,
  Mic,
  RotateCcw,
  PlusCircle,
  X,
  ArrowRight
} from 'lucide-react';
import type { OperatingSurface } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  activeSurface?: OperatingSurface;
  onSelectSurface: (surface: OperatingSurface) => void;
  onStartVoice: () => void;
  onNewChat: () => void;
  onOpenReplay?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  activeSurface: _activeSurface,
  onSelectSurface,
  onStartVoice,
  onNewChat,
  onOpenReplay
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    {
      id: 'surface-work',
      category: 'Surfaces',
      title: 'Work Surface',
      description: 'Conversational chat, voice interaction, and interactive task canvas',
      icon: MessageSquare,
      badge: 'Surface 1',
      action: () => {
        onSelectSurface('work');
        onClose();
      }
    },
    {
      id: 'surface-execution',
      category: 'Surfaces',
      title: 'Execution Surface',
      description: 'LangGraph live state graph, task inputs editor & state-diff inspector',
      icon: Cpu,
      badge: 'Surface 2',
      action: () => {
        onSelectSurface('execution');
        onClose();
      }
    },
    {
      id: 'surface-evidence',
      category: 'Surfaces',
      title: 'Evidence Ledger',
      description: 'Auditable handbook citations, page references & slot reservation logs',
      icon: FileCheck,
      badge: 'Surface 3',
      action: () => {
        onSelectSurface('evidence');
        onClose();
      }
    },
    {
      id: 'action-voice',
      category: 'Actions',
      title: 'Start Voice Workspace',
      description: 'Open interactive voice orb with live listening & speech synthesis',
      icon: Mic,
      badge: 'Voice Mode',
      action: () => {
        onStartVoice();
        onClose();
      }
    },
    {
      id: 'action-replay',
      category: 'Actions',
      title: 'Replay Workflow Simulation',
      description: 'Run current workflow in isolated test sandbox with dry-run semantics',
      icon: RotateCcw,
      badge: 'Simulation',
      action: () => {
        if (onOpenReplay) onOpenReplay();
        onClose();
      }
    },
    {
      id: 'action-new-chat',
      category: 'Actions',
      title: 'New Conversation Thread',
      description: 'Initialize a fresh thread with persistent LangGraph checkpointing',
      icon: PlusCircle,
      badge: 'Thread',
      action: () => {
        onNewChat();
        onClose();
      }
    }
  ];

  const filtered = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-nexus-surface-secondary border border-nexus-border-primary rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Command Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-nexus-border-subtle bg-nexus-surface-primary/80">
          <Search className="w-5 h-5 text-nexus-text-muted mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search surfaces (Ctrl+K)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-nexus-text-primary placeholder:text-nexus-text-muted focus:outline-none"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-nexus-surface-tertiary text-nexus-text-muted border border-nexus-border-subtle rounded">ESC</kbd>
            <button
              onClick={onClose}
              className="p-1 text-nexus-text-muted hover:text-nexus-text-primary rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Command Results */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-nexus-text-muted text-sm">
              No matching commands or surfaces found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-nexus-surface-tertiary text-nexus-text-primary border border-nexus-accent-cyan/30'
                      : 'text-nexus-text-secondary hover:bg-nexus-surface-tertiary/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${
                      cmd.category === 'Surfaces'
                        ? 'bg-nexus-accent-cyan/10 text-nexus-accent-cyan'
                        : 'bg-nexus-accent-purple/10 text-nexus-accent-purple'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-nexus-text-primary">{cmd.title}</span>
                        <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-nexus-surface-primary text-nexus-text-muted border border-nexus-border-subtle">
                          {cmd.badge}
                        </span>
                      </div>
                      <p className="text-xs text-nexus-text-muted truncate mt-0.5">{cmd.description}</p>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 ml-3 text-nexus-text-muted transition-transform ${isSelected ? 'translate-x-1 text-nexus-accent-cyan' : ''}`} />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 bg-nexus-surface-tertiary/40 border-t border-nexus-border-subtle flex items-center justify-between text-[11px] text-nexus-text-muted">
          <div className="flex items-center gap-4">
            <span><strong className="text-nexus-text-secondary">↑↓</strong> Navigate</span>
            <span><strong className="text-nexus-text-secondary">↵</strong> Select</span>
            <span><strong className="text-nexus-text-secondary">Esc</strong> Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-nexus-accent-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-nexus-accent-cyan animate-pulse"></span>
            <span>NEXUS OS Command Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
};
