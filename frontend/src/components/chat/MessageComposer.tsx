import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  MessageSquare,
  Wrench,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useVoice } from '../../hooks/useVoice';
import { VoiceVisualizer } from './VoiceVisualizer';
import { StartVoiceButton } from '../voice/StartVoiceButton';

interface MessageComposerProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  suggestedActions?: string[];
  onStartVoice?: () => void;
  onOpenUpload?: () => void;
  onOpenTools?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isLoading,
  suggestedActions = [],
  onStartVoice,
  onOpenUpload,
  onOpenTools,
}) => {
  const [input, setInput] = useState('');
  const [composerMode, setComposerMode] = useState<'chat' | 'voice' | 'upload' | 'tools'>('chat');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook into browser speech recognition with volume tracking
  const {
    isListening,
    transcript,
    isSupported,
    isTranscribing,
    audioLevels,
    errorMessage,
    startListening,
    stopListening,
    getTranscribedText,
    clearTranscript,
  } = useVoice((liveText) => {
    setInput(liveText);
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isListening) stopListening();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    clearTranscript();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceSend = async () => {
    stopListening();
    const textToSend = await getTranscribedText();
    if (!textToSend.trim() || isLoading) return;
    onSendMessage(textToSend.trim());
    setInput('');
    clearTranscript();
  };

  const handleVoiceCancel = () => {
    stopListening();
    clearTranscript();
  };

  const handleToggleMic = () => {
    if (isLoading) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInput(`[Document attached: ${file.name}] Please summarize key policies in this file.`);
    }
  };

  return (
    <div className="w-full border-t border-[#176BFF]/20 bg-[#050B19]/90 p-3 sm:p-4 backdrop-blur-2xl">
      <div className="mx-auto max-w-4xl space-y-2.5">
        {/* Live Speech Recognition Waveform Visualizer */}
        <VoiceVisualizer
          isListening={isListening}
          transcript={transcript}
          isTranscribing={isTranscribing}
          audioLevels={audioLevels}
          errorMessage={errorMessage}
          onStop={stopListening}
          onSend={handleVoiceSend}
          onCancel={handleVoiceCancel}
        />

        {/* Suggested Action Chips (if any from previous turn) */}
        {suggestedActions && suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(action)}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-full border border-[#00E5FF]/30 bg-[#071329] px-3 py-1 text-xs text-[#00E5FF] transition-all hover:border-[#00E5FF]/70 hover:bg-[#0A1830] hover:text-[#F4F7FF] disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3 text-[#00E5FF]" />
                <span>{action}</span>
              </button>
            ))}
          </div>
        )}

        {/* Mode Selector Header Bar */}
        <div className="flex items-center justify-between px-1 text-xs text-[#94A9C8]">
          <div className="flex items-center gap-1 bg-[#071329] p-0.5 rounded-lg border border-[#176BFF]/20">
            <button
              type="button"
              onClick={() => setComposerMode('chat')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                composerMode === 'chat'
                  ? 'bg-[#176BFF] text-[#F4F7FF]'
                  : 'text-[#94A9C8] hover:text-[#F4F7FF]'
              }`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerMode('voice');
                if (onStartVoice) onStartVoice();
                else handleToggleMic();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                composerMode === 'voice'
                  ? 'bg-[#176BFF] text-[#F4F7FF]'
                  : 'text-[#94A9C8] hover:text-[#F4F7FF]'
              }`}
            >
              <Mic className="h-3 w-3" />
              <span>Voice</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerMode('upload');
                if (onOpenUpload) onOpenUpload();
                else fileInputRef.current?.click();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                composerMode === 'upload'
                  ? 'bg-[#176BFF] text-[#F4F7FF]'
                  : 'text-[#94A9C8] hover:text-[#F4F7FF]'
              }`}
            >
              <Upload className="h-3 w-3" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerMode('tools');
                if (onOpenTools) onOpenTools();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                composerMode === 'tools'
                  ? 'bg-[#176BFF] text-[#F4F7FF]'
                  : 'text-[#94A9C8] hover:text-[#F4F7FF]'
              }`}
            >
              <Wrench className="h-3 w-3" />
              <span>Tools</span>
            </button>
          </div>

          <span className="hidden sm:inline font-mono text-[10px] text-[#5A7199]">
            Enterprise StateGraph • Citations Grounded
          </span>
        </div>

        {/* Dark Glass Composer Box with thin luminous blue border */}
        <form
          onSubmit={handleSubmit}
          className={`relative flex items-end gap-2 rounded-2xl border p-2 transition-all duration-300 composer-glass ${
            isListening ? 'border-[#00E5FF] ring-2 ring-[#00E5FF]/30' : ''
          }`}
        >
          {/* Hidden File Input for Attachment */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,.docx"
            onChange={handleFileChange}
          />

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#94A9C8] hover:bg-[#0A1830] hover:text-[#00E5FF] transition-colors border border-transparent hover:border-[#176BFF]/30 disabled:opacity-50"
            title="Attach policy document or PDF"
            aria-label="Attach policy document or PDF"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Main Input Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={
              isListening
                ? 'Listening to speech... Speak clearly'
                : 'Ask about employee policies, PTO, or schedule a performance review...'
            }
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-[#F4F7FF] placeholder-[#5A7199] focus:outline-none disabled:opacity-50 leading-relaxed font-sans"
          />

          {/* Microphone Control */}
          {isSupported && (
            <button
              type="button"
              onClick={handleToggleMic}
              disabled={isLoading}
              title={isListening ? 'Stop recording voice' : 'Quick microphone dictation'}
              aria-label={isListening ? 'Stop recording voice' : 'Quick microphone dictation'}
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                isListening
                  ? 'border-[#00E5FF] bg-[#00E5FF] text-[#030817] shadow-lg shadow-[#00E5FF]/50 animate-pulse'
                  : 'border-[#176BFF]/30 bg-[#071329] text-[#94A9C8] hover:border-[#00E5FF]/60 hover:text-[#00E5FF]'
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          {/* Dedicated Full Voice Studio Button */}
          {onStartVoice && (
            <StartVoiceButton
              onClick={onStartVoice}
              disabled={isLoading}
            />
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Send message to Nexus AI"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#176BFF] to-[#00E5FF] text-white shadow-md shadow-[#176BFF]/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>

        {/* Footer Hints */}
        <div className="flex items-center justify-between text-[10px] text-[#5A7199] px-1 font-mono">
          <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
          <span className="hidden sm:inline">PDF Grounded Answers • Transactional Bookings</span>
        </div>
      </div>
    </div>
  );
};
