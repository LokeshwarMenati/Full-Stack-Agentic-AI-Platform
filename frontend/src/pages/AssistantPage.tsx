import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../services/api';
import type { ChatMessage, ExecutionEvent, PendingBooking, AgentOrbState } from '../types';
import { WelcomeScreen } from '../components/chat/WelcomeScreen';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { MessageComposer } from '../components/chat/MessageComposer';
import { AIOrb } from '../components/ui/AIOrb';
import { Sparkles, AlertCircle, Download } from 'lucide-react';
import { useVoiceConversation } from '../hooks/useVoiceConversation';
import { VoiceWorkspace, StartVoiceButton } from '../components/voice';

interface AssistantPageProps {
  threadId: string;
  queuedPrompt?: string | null;
  onQueuedPromptConsumed?: () => void;
  onThreadUpdate?: () => void;
  onSetActivityEvents: (events: ExecutionEvent[]) => void;
  onSetPendingBooking: (booking?: PendingBooking) => void;
  onSetCurrentNode: (node: string) => void;
  onNavigateToBookings: () => void;
  onNavigateToKnowledge?: () => void;
  onNavigateToWorkflows?: () => void;
  onNavigateToInsights?: () => void;
  onNavigateToEvidence?: () => void;
  activityEvents?: ExecutionEvent[];
  currentNode?: string;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({
  threadId,
  queuedPrompt,
  onQueuedPromptConsumed,
  onThreadUpdate,
  onSetActivityEvents,
  onSetPendingBooking,
  onSetCurrentNode,
  onNavigateToBookings,
  onNavigateToKnowledge,
  onNavigateToWorkflows,
  onNavigateToInsights,
  onNavigateToEvidence,
  activityEvents = [],
  currentNode = 'idle',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize unified voice conversation hook linked to the exact same thread & checkpointer
  const voice = useVoiceConversation({
    threadId,
    onUserMessage: (userMsg) => {
      setMessages((prev) => [...prev, userMsg]);
    },
    onTurnComplete: (userMsg, asstMsg) => {
      setMessages((prev) => {
        const hasUser = prev.some((m) => m.id === userMsg.id);
        return hasUser ? [...prev, asstMsg] : [...prev, userMsg, asstMsg];
      });
      if (asstMsg.pending_booking) {
        onSetPendingBooking(asstMsg.pending_booking);
      }
      if (onThreadUpdate) onThreadUpdate();
    },
    onSetCurrentNode,
    onSetActivityEvents,
    onThreadUpdate,
  });

  const handleOpenVoice = useCallback(() => {
    setIsVoiceModalOpen(true);
    voice.startVoiceSession();
  }, [voice]);

  const handleCloseVoice = useCallback(() => {
    void voice.endVoiceSession();
    setIsVoiceModalOpen(false);
  }, [voice]);

  useEffect(() => {
    const handleVoiceTrigger = () => {
      handleOpenVoice();
    };
    window.addEventListener('nexus:start-voice', handleVoiceTrigger);
    return () => window.removeEventListener('nexus:start-voice', handleVoiceTrigger);
  }, [handleOpenVoice]);

  // Load conversation history on thread change
  useEffect(() => {
    let isMounted = true;
    setError(null);
    setStreamingText('');

    if (threadId) {
      api.getConversation(threadId)
        .then((detail) => {
          if (isMounted) {
            setMessages(detail.messages || []);
          }
        })
        .catch(() => {
          if (isMounted) setMessages([]);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [threadId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setStreamingText('');
    setStreamingStatus('Nexus Agent analyzing query...');
    onSetCurrentNode('router');

    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const collectedEvents: ExecutionEvent[] = [];

    // Stream SSE response
    api.streamMessage(text, threadId, {
      onStatus: (status) => {
        setStreamingStatus(status.message);
        if (status.node) onSetCurrentNode(status.node);
      },
      onAgentEvent: (evt) => {
        collectedEvents.push(evt);
        onSetActivityEvents([...collectedEvents]);
        onSetCurrentNode(evt.node_name);
      },
      onToken: (token) => {
        setStreamingStatus('Generating grounded response...');
        setStreamingText((prev) => prev + token);
      },
      onComplete: (fullResp) => {
        setIsLoading(false);
        setStreamingText('');
        setStreamingStatus(null);
        onSetCurrentNode('idle');

        const asstMsg: ChatMessage = {
          id: `asst_${Date.now()}`,
          role: 'assistant',
          content: fullResp.content,
          citations: fullResp.citations || [],
          execution_events: fullResp.execution_events || [],
          pending_booking: fullResp.pending_booking,
          booking_confirmed: fullResp.booking_confirmed,
          suggested_actions: fullResp.suggested_actions || [],
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, asstMsg]);
        onSetPendingBooking(fullResp.pending_booking);
        if (onThreadUpdate) onThreadUpdate();
      },
      onError: (err) => {
        console.error('Streaming error, falling back to REST call:', err);
        // Fallback to standard request
        api.sendMessage(text, threadId)
          .then((fullResp) => {
            setIsLoading(false);
            setStreamingText('');
            setStreamingStatus(null);
            onSetCurrentNode('idle');

            const asstMsg: ChatMessage = {
              id: `asst_${Date.now()}`,
              role: 'assistant',
              content: fullResp.content,
              citations: fullResp.citations || [],
              execution_events: fullResp.execution_events || [],
              pending_booking: fullResp.pending_booking,
              booking_confirmed: fullResp.booking_confirmed,
              suggested_actions: fullResp.suggested_actions || [],
              created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, asstMsg]);
            onSetPendingBooking(fullResp.pending_booking);
            if (onThreadUpdate) onThreadUpdate();
          })
          .catch((postErr) => {
            setIsLoading(false);
            setStreamingText('');
            setStreamingStatus(null);
            setError(postErr.message || 'Failed to communicate with Nexus backend.');
          });
      },
    });
  }, [isLoading, threadId, onSetCurrentNode, onSetActivityEvents, onSetPendingBooking, onThreadUpdate]);

  useEffect(() => {
    if (!queuedPrompt?.trim()) return;
    const prompt = queuedPrompt;
    onQueuedPromptConsumed?.();
    handleSendMessage(prompt);
  }, [queuedPrompt, onQueuedPromptConsumed, handleSendMessage]);

  const handleExportTranscript = () => {
    if (messages.length === 0) return;
    const lines = [
      `# NEXUS AI Enterprise Assistant — Session Transcript`,
      `**Thread ID**: \`${threadId}\``,
      `**Export Date**: ${new Date().toLocaleString()}`,
      `\n---\n`,
    ];

    messages.forEach((m) => {
      lines.push(`### ${m.role === 'user' ? '👤 Employee Inquiry' : '🤖 NEXUS Intelligence Response'}`);
      lines.push(`${m.content}\n`);
      if (m.citations && m.citations.length > 0) {
        lines.push(`**Citations & Grounding:**`);
        m.citations.forEach((c) => {
          lines.push(`- *${c.source}* (Page ${c.page}): "${c.excerpt.slice(0, 150)}..."`);
        });
        lines.push(``);
      }
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexus_transcript_${threadId.slice(0, 8)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const orbState: AgentOrbState | 'listening' | 'speaking' = isVoiceModalOpen
    ? 'listening'
    : isLoading
    ? streamingStatus?.includes('Generating')
      ? 'speaking'
      : 'processing'
    : 'idle';

  const latestMessage = messages[messages.length - 1];
  const suggestedActions = latestMessage?.suggested_actions || [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#030817] futuristic-bg relative">
      {/* Scrollable Main Hero or Chat Flow */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
        <div className="mx-auto max-w-5xl h-full">
          {messages.length === 0 && !isLoading ? (
            <WelcomeScreen
              onSelectPrompt={handleSendMessage}
              threadId={threadId}
              onNavigateToBookings={onNavigateToBookings}
              onNavigateToKnowledge={onNavigateToKnowledge}
              onNavigateToWorkflows={onNavigateToWorkflows}
              onNavigateToInsights={onNavigateToInsights}
              onNavigateToEvidence={onNavigateToEvidence}
              onStartVoice={handleOpenVoice}
              events={activityEvents}
              currentNode={currentNode}
              orbState={orbState}
              userName="Alex"
            />
          ) : (
            <div className="space-y-3 pb-6">
              {/* Header Action Bar when in active chat conversation */}
              <div className="flex items-center justify-between border-b border-[#176BFF]/20 pb-2 mb-3 text-xs text-[#94A9C8]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#5A7199]">Thread: {threadId.slice(0, 14)}...</span>
                  <span className="rounded bg-[#071329] px-2 py-0.5 text-[10px] text-[#00E5FF] border border-[#176BFF]/30">
                    {messages.length} {messages.length === 1 ? 'Turn' : 'Turns'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMessages([])}
                    className="text-[11px] text-[#5A7199] hover:text-[#00E5FF] px-2 py-1 rounded hover:bg-[#071329] transition-colors"
                  >
                    View Hero Workspace
                  </button>

                  <StartVoiceButton
                    variant="header"
                    onClick={handleOpenVoice}
                    isActive={isVoiceModalOpen}
                  />

                  <button
                    onClick={handleExportTranscript}
                    className="flex items-center gap-1 rounded-lg border border-[#176BFF]/30 bg-[#071329] px-2.5 py-1 text-[#94A9C8] hover:text-[#F4F7FF] hover:border-[#00E5FF]/40 transition-colors text-xs"
                    title="Export transcript as Markdown"
                  >
                    <Download className="h-3.5 w-3.5 text-[#00E5FF]" />
                    <span className="hidden sm:inline">Export Transcript</span>
                  </button>
                </div>
              </div>

              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onViewBookings={onNavigateToBookings}
                />
              ))}

              {/* Streaming In-Progress Assistant Bubble */}
              {isLoading && (
                <div className="flex w-full gap-3 py-4 justify-start">
                  <div className="shrink-0 mt-0.5">
                    <AIOrb size="sm" state="processing" />
                  </div>
                  <div className="max-w-[85%] md:max-w-[78%] flex flex-col items-start">
                    <div className="rounded-2xl rounded-tl-none border border-[#00E5FF]/40 bg-[#071329]/95 p-4 text-sm text-[#F4F7FF] shadow-xl backdrop-blur-xl">
                      <div className="mb-2 flex items-center gap-2 text-xs text-[#00E5FF]">
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        <span>{streamingStatus || 'Nexus Agent reasoning...'}</span>
                      </div>
                      <div className="text-[#F4F7FF] leading-relaxed text-sm">
                        {streamingText ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{streamingText}</ReactMarkdown>
                          </div>
                        ) : (
                          <span className="inline-block h-4 w-2 bg-[#00E5FF] animate-pulse rounded" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-[#FF3B5C]/40 bg-[#FF3B5C]/10 p-3 text-xs text-[#FF3B5C]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Composer (Bottom Fixed) */}
      <MessageComposer
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        suggestedActions={suggestedActions}
        onStartVoice={handleOpenVoice}
        onOpenUpload={onNavigateToKnowledge}
        onOpenTools={onNavigateToWorkflows}
      />

      {/* Dedicated Immersive Voice Workspace Modal */}
      {isVoiceModalOpen && (
        <VoiceWorkspace
          voice={voice}
          threadId={threadId}
          onClose={handleCloseVoice}
          onViewBookings={onNavigateToBookings}
        />
      )}
    </div>
  );
};
