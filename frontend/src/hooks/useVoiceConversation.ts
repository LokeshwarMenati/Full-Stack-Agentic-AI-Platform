import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import type {
  VoiceState,
  VoiceMode,
  VoiceSession,
  VoiceSettings,
  Citation,
  ChatMessage,
  ExecutionEvent,
} from '../types';

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
  webkitAudioContext?: any;
}

export interface UseVoiceConversationOptions {
  threadId: string;
  onTurnComplete?: (userMsg: ChatMessage, asstMsg: ChatMessage) => void;
  onUserMessage?: (userMsg: ChatMessage) => void;
  onSetCurrentNode?: (node: string) => void;
  onSetActivityEvents?: (events: ExecutionEvent[]) => void;
  onThreadUpdate?: () => void;
}

export interface UseVoiceConversationReturn {
  voiceState: VoiceState;
  mode: VoiceMode;
  setMode: (mode: VoiceMode) => void;
  session: VoiceSession | null;
  sessionDuration: number;
  userTranscript: string;
  interimTranscript: string;
  assistantSpokenText: string;
  activeCitations: Citation[];
  audioLevels: number[];
  errorMessage: string | null;
  isMicMuted: boolean;
  isOutputMuted: boolean;
  settings: VoiceSettings;
  updateSettings: (newSettings: Partial<VoiceSettings>) => void;
  startVoiceSession: () => Promise<void>;
  endVoiceSession: () => Promise<void>;
  toggleMicMute: () => void;
  toggleOutputMute: () => void;
  interruptSpeaking: () => void;
  submitSpokenQuery: (overrideText?: string) => Promise<void>;
  cancelCurrentTurn: () => void;
  clearError: () => void;
  retryLastTurn: () => Promise<void>;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  outputEnabled: true,
  selectedVoice: '',
  speechRate: 1.05,
  mode: 'live_conversation',
  autoListen: true,
  transcriptVisible: true,
};

export const useVoiceConversation = ({
  threadId,
  onTurnComplete,
  onUserMessage,
  onSetCurrentNode,
  onSetActivityEvents,
  onThreadUpdate,
}: UseVoiceConversationOptions): UseVoiceConversationReturn => {
  // Explicit state machine
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [mode, setModeState] = useState<VoiceMode>('live_conversation');
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  const [userTranscript, setUserTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [assistantSpokenText, setAssistantSpokenText] = useState('');
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);

  const [audioLevels, setAudioLevels] = useState<number[]>([15, 20, 15, 25, 20, 15]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isOutputMuted, setIsOutputMuted] = useState(false);

  // Settings
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    try {
      const stored = localStorage.getItem('nexus_voice_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Hardware & Web API references
  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isExplicitlyCancellingRef = useRef(false);
  const lastSpokenAssistantTextRef = useRef('');

  // Timers
  const timerIntervalRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const speechWatchdogRef = useRef<any>(null);
  const restartListenTimerRef = useRef<any>(null);

  // Lifecycle & State guards
  const isSessionActiveRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>('idle');
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const isOutputMutedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Stored thread ID and transcripts
  const threadIdRef = useRef(threadId);
  const accumulatedTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const latestTranscriptRef = useRef('');
  const lastSubmittedTranscriptRef = useRef('');
  const lastSubmitTimeRef = useRef(0);
  const lastAttemptedQueryRef = useRef('');

  // Abort controller for in-flight chat requests
  const activeAbortFnRef = useRef<(() => void) | null>(null);

  // Settings reference
  const settingsRef = useRef(settings);

  // Callbacks reference
  const onTurnCompleteRef = useRef(onTurnComplete);
  const onUserMessageRef = useRef(onUserMessage);
  const onSetCurrentNodeRef = useRef(onSetCurrentNode);
  const onSetActivityEventsRef = useRef(onSetActivityEvents);
  const onThreadUpdateRef = useRef(onThreadUpdate);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    isOutputMutedRef.current = isOutputMuted;
  }, [isOutputMuted]);

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    onTurnCompleteRef.current = onTurnComplete;
    onUserMessageRef.current = onUserMessage;
    onSetCurrentNodeRef.current = onSetCurrentNode;
    onSetActivityEventsRef.current = onSetActivityEvents;
    onThreadUpdateRef.current = onThreadUpdate;
  }, [onTurnComplete, onUserMessage, onSetCurrentNode, onSetActivityEvents, onThreadUpdate]);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('nexus_voice_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    if (newSettings.mode) {
      setModeState(newSettings.mode);
    }
  }, []);

  const setMode = useCallback((newMode: VoiceMode) => {
    setModeState(newMode);
    updateSettings({ mode: newMode });
  }, [updateSettings]);

  // Clean hardware & audio resources
  const releaseAudioResources = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    if (restartListenTimerRef.current) {
      clearTimeout(restartListenTimerRef.current);
      restartListenTimerRef.current = null;
    }
    if (activeAbortFnRef.current) {
      try {
        activeAbortFnRef.current();
      } catch {
        // ignore
      }
      activeAbortFnRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    currentUtteranceRef.current = null;
    isSpeakingRef.current = false;
    isProcessingRef.current = false;
    setAudioLevels([15, 20, 15, 25, 20, 15]);
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      releaseAudioResources();
    };
  }, [releaseAudioResources]);

  // Audio volume analyzer
  const startAudioEngine = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn('getUserMedia not supported in current environment');
        return true;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as IWindow).webkitAudioContext;
      if (AudioCtx) {
        try {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          analyser.smoothingTimeConstant = 0.5;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const trackLevels = () => {
            if (!audioStreamRef.current || !isSessionActiveRef.current) return;

            analyser.getByteFrequencyData(dataArray);

            const bands: number[] = [];
            const step = Math.max(1, Math.floor(bufferLength / 6));
            for (let i = 0; i < 6; i++) {
              const val = dataArray[i * step] || 0;
              const pct = Math.min(100, Math.max(15, Math.round((val / 255) * 100)));
              bands.push(pct);
            }

            setAudioLevels(bands);
            animFrameRef.current = requestAnimationFrame(trackLevels);
          };

          trackLevels();
        } catch (ctxErr) {
          console.warn('AudioContext visualization setup notice:', ctxErr);
        }
      }

      // Initialize MediaRecorder fallback
      audioChunksRef.current = [];
      try {
        if (typeof MediaRecorder !== 'undefined') {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
          const recorder = new MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(250);
          mediaRecorderRef.current = recorder;
        }
      } catch (recErr) {
        console.warn('MediaRecorder notice:', recErr);
      }

      return true;
    } catch (err: any) {
      console.warn('Microphone permission or hardware access notice:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please grant microphone permission in your browser address bar.');
        voiceStateRef.current = 'error';
        setVoiceState('error');
        return false;
      }
      return true;
    }
  };

  // Text-To-Speech output engine
  const speakResponse = useCallback((rawText: string, onEnd?: () => void) => {
    // If output disabled, muted or session inactive
    if (!isSessionActiveRef.current || !settingsRef.current.outputEnabled || isOutputMutedRef.current) {
      if (onEnd) onEnd();
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('SpeechSynthesis is unavailable in current environment.');
      if (onEnd) onEnd();
      return;
    }

    // Stop microphone recognition during speech output to prevent acoustic feedback loop
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Stop previous audio with cancellation flag to avoid phantom onEnd triggers
    isExplicitlyCancellingRef.current = true;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
    isExplicitlyCancellingRef.current = false;

    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }

    // Clean formatting for natural speech
    const cleanText = rawText
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links -> text
      .replace(/\[([A-Za-z0-9_.-]+),\s*Page\s*(\d+)\]/gi, 'According to $1, page $2') // natural citation pronunciation
      .replace(/[`*_#~>-]/g, '')               // formatting symbols
      .replace(/https?:\/\/\S+/g, '')          // strip raw URLs
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Track what the assistant speaks to filter acoustic echoes
    lastSpokenAssistantTextRef.current = cleanText;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = settingsRef.current.speechRate || 1.0;
    utterance.pitch = 1.04; // Natural friendly conversational pitch

    // Pin utterance to window to prevent Chromium garbage collection bug (Chromium issue 509488)
    (window as any).__nexusVoiceUtterance = utterance;

    // Advanced Human-like Voice Selection prioritizing premium natural conversational voices
    try {
      const voices = window.speechSynthesis.getVoices();
      if (settingsRef.current.selectedVoice) {
        const match = voices.find((v) => v.name === settingsRef.current.selectedVoice);
        if (match) utterance.voice = match;
      } else {
        // Priority list of lifelike human neural/natural voices
        const naturalVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
             v.name.includes('Neural') ||
             v.name.includes('Jenny') ||
             v.name.includes('Aria') ||
             v.name.includes('Guy') ||
             v.name.includes('Google US English') ||
             v.name.includes('Samantha') ||
             v.name.includes('Zira'))
        ) || voices.find((v) => v.lang.startsWith('en-US')) || voices.find((v) => v.lang.startsWith('en'));

        if (naturalVoice) utterance.voice = naturalVoice;
      }
    } catch {
      // ignore voice selection failure
    }

    currentUtteranceRef.current = utterance;
    isSpeakingRef.current = true;
    voiceStateRef.current = 'speaking';
    setVoiceState('speaking');

    // Simulate realistic human vocal cadence & sound wave fluctuations while speaking
    let speakInterval: any = null;
    const startSpeakingCadence = () => {
      if (speakInterval) clearInterval(speakInterval);
      speakInterval = setInterval(() => {
        if (!isSpeakingRef.current) {
          clearInterval(speakInterval);
          return;
        }
        // Human vocal modulation: variable bursts of intensity reflecting syllables
        const base = Math.floor(Math.random() * 45) + 35;
        const simulated = [
          Math.min(95, base + Math.floor(Math.random() * 20)),
          Math.min(95, base + Math.floor(Math.random() * 30)),
          Math.min(95, base + Math.floor(Math.random() * 25)),
          Math.min(95, base + Math.floor(Math.random() * 35)),
          Math.min(95, base + Math.floor(Math.random() * 20)),
          Math.min(95, base + Math.floor(Math.random() * 15)),
        ];
        setAudioLevels(simulated);
      }, 90);
    };

    let finished = false;
    const handleSpeechFinish = () => {
      if (finished || isExplicitlyCancellingRef.current) return;
      finished = true;

      if (speakInterval) {
        clearInterval(speakInterval);
        speakInterval = null;
      }
      setAudioLevels([15, 20, 15, 25, 20, 15]);

      delete (window as any).__nexusVoiceUtterance;
      if (speechWatchdogRef.current) {
        clearTimeout(speechWatchdogRef.current);
        speechWatchdogRef.current = null;
      }
      currentUtteranceRef.current = null;
      isSpeakingRef.current = false;

      if (onEnd) {
        onEnd();
      }
    };

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      voiceStateRef.current = 'speaking';
      setVoiceState('speaking');
      startSpeakingCadence();
    };

    utterance.onboundary = () => {
      // Syllable/word boundary: trigger natural micro-burst in vocal dynamics
      const surge = Math.floor(Math.random() * 35) + 50;
      setAudioLevels([surge, surge + 10, surge + 15, surge + 5, surge, 25]);
    };

    utterance.onend = () => {
      if (!isExplicitlyCancellingRef.current) {
        handleSpeechFinish();
      }
    };

    utterance.onerror = (e: any) => {
      if (isExplicitlyCancellingRef.current || e?.error === 'canceled' || e?.error === 'interrupted') {
        return;
      }
      console.warn('TTS playback notice:', e);
      handleSpeechFinish();
    };

    // Watchdog timer: If browser drops onend, safety recover
    const estimatedMs = Math.max(3500, Math.ceil(cleanText.split(' ').length * 480) + 2000);
    speechWatchdogRef.current = setTimeout(() => {
      console.info('Speech synthesis watchdog timer triggered turn completion.');
      handleSpeechFinish();
    }, estimatedMs);

    try {
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (speakErr) {
      console.warn('SpeechSynthesis speak call failed:', speakErr);
      handleSpeechFinish();
    }
  }, []);

  // Forward declarations for listening and submission triggers
  const startListeningTurnRef = useRef<() => void>(() => {});
  const submitSpokenQueryRef = useRef<(override?: string) => Promise<void>>(async () => {});

  // Complete one recognized user turn: send query to existing chat endpoint
  const processUserTurn = useCallback(async (textToSubmit: string) => {
    const query = textToSubmit.trim();

    // 1. Validate transcript
    if (!query || query.length === 0) {
      isSubmittingRef.current = false;
      isProcessingRef.current = false;
      if (isSessionActiveRef.current && !isMicMutedRef.current) {
        voiceStateRef.current = 'listening';
        setVoiceState('listening');
        startListeningTurnRef.current();
      } else {
        voiceStateRef.current = 'idle';
        setVoiceState('idle');
      }
      return;
    }

    // 2. Prevent concurrent turn processing
    if (isProcessingRef.current || isSpeakingRef.current) {
      console.warn('Turn rejected: Previous turn still in-flight or speaking.');
      isSubmittingRef.current = false;
      return;
    }

    // 3. Acoustic Echo Filter: Discard microphone inputs that match the assistant's recent spoken reply
    const isEchoOfAssistant = (text: string) => {
      const norm = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (!norm || norm.length < 3) return false;
      const recentSpoken = (lastSpokenAssistantTextRef.current || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (!recentSpoken) return false;
      // Exact substring match
      if (recentSpoken.includes(norm)) return true;
      if (norm.includes(recentSpoken) && recentSpoken.length > 8) return true;
      // High token overlap match
      const words = norm.split(/\s+/).filter((w) => w.length > 2);
      if (words.length >= 2) {
        const matches = words.filter((w) => recentSpoken.includes(w));
        if (matches.length / words.length >= 0.7) return true;
      }
      return false;
    };

    if (isEchoOfAssistant(query)) {
      console.info('Acoustic echo of assistant speech filtered out:', query);
      isSubmittingRef.current = false;
      isProcessingRef.current = false;
      setUserTranscript('');
      setInterimTranscript('');
      accumulatedTranscriptRef.current = '';
      latestTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      if (isSessionActiveRef.current && !isMicMutedRef.current) {
        voiceStateRef.current = 'listening';
        setVoiceState('listening');
        startListeningTurnRef.current();
      }
      return;
    }

    // 4. Deduplicate submissions within 8 seconds
    const now = Date.now();
    if (
      query.toLowerCase() === (lastSubmittedTranscriptRef.current || '').toLowerCase() &&
      now - lastSubmitTimeRef.current < 8000
    ) {
      console.info('Duplicate transcript submission ignored:', query);
      isSubmittingRef.current = false;
      if (isSessionActiveRef.current && !isMicMutedRef.current) {
        voiceStateRef.current = 'listening';
        setVoiceState('listening');
        startListeningTurnRef.current();
      }
      return;
    }

    lastSubmittedTranscriptRef.current = query;
    lastSubmitTimeRef.current = now;
    lastAttemptedQueryRef.current = query;

    // Transition state
    isProcessingRef.current = true;
    voiceStateRef.current = 'processing';
    setVoiceState('processing');
    setErrorMessage(null);
    setUserTranscript(query);
    setInterimTranscript('');
    accumulatedTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    interimTranscriptRef.current = '';

    if (onSetCurrentNodeRef.current) onSetCurrentNodeRef.current('router');

    // 4. Create optimistic user message
    const userMsg: ChatMessage = {
      id: `user_voice_${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    if (onUserMessageRef.current) {
      onUserMessageRef.current(userMsg);
    }

    // 5. Send message through existing LangGraph chat pipeline
    const currentThread = threadIdRef.current;
    let responseContent = '';
    let citations: Citation[] = [];
    const executionEvents: ExecutionEvent[] = [];

    // Helper to finalize assistant response and speak
    const handleResponseSuccess = (fullResp: any) => {
      isProcessingRef.current = false;
      isSubmittingRef.current = false;

      if (!isSessionActiveRef.current) {
        voiceStateRef.current = 'ended';
        setVoiceState('ended');
        return;
      }

      const finalContent = (fullResp.content || responseContent).trim();

      if (!finalContent) {
        setErrorMessage('Received empty response from assistant.');
        voiceStateRef.current = 'error';
        setVoiceState('error');
        return;
      }

      const asstMsg: ChatMessage = {
        id: `asst_voice_${Date.now()}`,
        role: 'assistant',
        content: finalContent,
        citations: fullResp.citations || citations,
        execution_events: fullResp.execution_events || executionEvents,
        pending_booking: fullResp.pending_booking,
        booking_confirmed: fullResp.booking_confirmed,
        structured_task: fullResp.structured_task,
        approval_gate: fullResp.approval_gate,
        state_diffs: fullResp.state_diffs,
        suggested_actions: fullResp.suggested_actions || [],
        created_at: new Date().toISOString(),
      };

      setAssistantSpokenText(asstMsg.content);
      setActiveCitations(asstMsg.citations || []);

      if (onTurnCompleteRef.current) {
        onTurnCompleteRef.current(userMsg, asstMsg);
      }
      if (onThreadUpdateRef.current) {
        onThreadUpdateRef.current();
      }
      if (onSetCurrentNodeRef.current) {
        onSetCurrentNodeRef.current('idle');
      }

      // Update session statistics
      setSession((prev) => (prev ? { ...prev, turns_count: prev.turns_count + 1 } : null));

      // Check if session was ended while request was in-flight
      if (!isSessionActiveRef.current) {
        voiceStateRef.current = 'ended';
        setVoiceState('ended');
        return;
      }

      // 6. Speak the real assistant response
      speakResponse(asstMsg.content, () => {
        // Returned after speech output finishes
        if (!isSessionActiveRef.current) {
          voiceStateRef.current = 'ended';
          setVoiceState('ended');
          return;
        }

        if (settingsRef.current.mode === 'live_conversation' && settingsRef.current.autoListen && !isMicMutedRef.current) {
          voiceStateRef.current = 'listening';
          setVoiceState('listening');
          // Extended pause before opening microphone to ensure all speaker reverberation has faded
          if (restartListenTimerRef.current) clearTimeout(restartListenTimerRef.current);
          restartListenTimerRef.current = setTimeout(() => {
            if (isSessionActiveRef.current && voiceStateRef.current === 'listening' && !isMicMutedRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
              startListeningTurnRef.current();
            }
          }, 750);
        } else {
          voiceStateRef.current = 'idle';
          setVoiceState('idle');
        }
      });
    };

    try {
      const controller = new AbortController();
      activeAbortFnRef.current = () => controller.abort();
      const fullResp = await api.sendMessage(query, currentThread, controller.signal);
      activeAbortFnRef.current = null;
      handleResponseSuccess(fullResp);
    } catch (reqErr: any) {
      console.error('Failed to initiate request:', reqErr);
      activeAbortFnRef.current = null;
      isProcessingRef.current = false;
      isSubmittingRef.current = false;
      if (reqErr?.name === 'AbortError' || !isSessionActiveRef.current) {
        return;
      }
      setErrorMessage(reqErr.message || 'Network communication error.');
      voiceStateRef.current = 'error';
      setVoiceState('error');
    }
  }, [speakResponse]);

  // Start single listening turn
  const startListeningTurn = useCallback(() => {
    if (!isSessionActiveRef.current || isMicMutedRef.current || isProcessingRef.current || isSpeakingRef.current) {
      return;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    isSubmittingRef.current = false;
    setUserTranscript('');
    setInterimTranscript('');
    accumulatedTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    audioChunksRef.current = [];

    // Safely stop any previous speech recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const SpeechRecognition =
      (window as unknown as IWindow).SpeechRecognition ||
      (window as unknown as IWindow).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.info('SpeechRecognition not supported in current browser. Push-to-talk audio fallback available.');
      voiceStateRef.current = 'listening';
      setVoiceState('listening');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      // Turn-based discrete conversational recognition prevents repeating earlier utterances
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';

      // Helper to finalize transcript and submit
      const finalizeAndSubmit = (overrideText?: string) => {
        if (!isSessionActiveRef.current || isProcessingRef.current || isSpeakingRef.current || isSubmittingRef.current) {
          return;
        }

        const candidateText = (overrideText || latestTranscriptRef.current || accumulatedTranscriptRef.current).trim();
        if (!candidateText || candidateText.length < 2) {
          return;
        }

        isSubmittingRef.current = true;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }

        accumulatedTranscriptRef.current = '';
        latestTranscriptRef.current = '';
        interimTranscriptRef.current = '';

        voiceStateRef.current = 'transcribing';
        setVoiceState('transcribing');

        // Immediately detach and abort recognition to prevent capturing assistant response
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onstart = null;
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
          recognitionRef.current = null;
        }

        processUserTurn(candidateText);
      };

      recognition.onstart = () => {
        if (isSessionActiveRef.current && !isProcessingRef.current && !isSpeakingRef.current && !isSubmittingRef.current) {
          voiceStateRef.current = 'listening';
          setVoiceState('listening');
        }
      };

      recognition.onresult = (event: any) => {
        if (!isSessionActiveRef.current || isProcessingRef.current || isSpeakingRef.current || isSubmittingRef.current) {
          return;
        }

        let currentTranscript = '';
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          currentTranscript += res[0].transcript;
          if (res.isFinal) {
            isFinal = true;
          }
        }

        const clean = currentTranscript.trim();
        if (!clean) return;

        setUserTranscript(clean);
        latestTranscriptRef.current = clean;
        accumulatedTranscriptRef.current = clean;

        if (isFinal) {
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          finalizeAndSubmit(clean);
        } else if (clean.length >= 2) {
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          if (settingsRef.current.mode === 'live_conversation') {
            silenceTimeoutRef.current = setTimeout(() => {
              finalizeAndSubmit(clean);
            }, 800); // 800ms natural pause before turn submission
          }
        }
      };

      recognition.onerror = (event: any) => {
        const errorType = event.error;
        console.info('SpeechRecognition status:', errorType);

        if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
          setErrorMessage('Microphone access denied in browser.');
          voiceStateRef.current = 'error';
          setVoiceState('error');
          isSessionActiveRef.current = false;
          releaseAudioResources();
          return;
        }

        if (errorType === 'no-speech') {
          // Normal silence pause, keep ready
          return;
        }

        if (errorType === 'network') {
          console.info('Speech recognition network glitch; falling back to server-side audio transcription.');
          const candidate = (latestTranscriptRef.current || accumulatedTranscriptRef.current).trim();
          if (candidate.length >= 2 && !isSubmittingRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
            finalizeAndSubmit(candidate);
          } else if (audioChunksRef.current.length > 0 && !isSubmittingRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
            submitSpokenQueryRef.current();
          }
        }
      };

      recognition.onend = () => {
        if (!isSessionActiveRef.current || isMicMutedRef.current) {
          return;
        }

        // If stopped because we are submitting, processing, or speaking, do not restart
        if (isSubmittingRef.current || isProcessingRef.current || isSpeakingRef.current) {
          return;
        }

        const candidateText = (latestTranscriptRef.current || accumulatedTranscriptRef.current).trim();
        if (candidateText.length >= 2 && settingsRef.current.mode === 'live_conversation') {
          finalizeAndSubmit(candidateText);
        } else if (settingsRef.current.mode === 'live_conversation' && settingsRef.current.autoListen) {
          // Restart clean turn smoothly to keep listening
          if (restartListenTimerRef.current) clearTimeout(restartListenTimerRef.current);
          restartListenTimerRef.current = setTimeout(() => {
            if (isSessionActiveRef.current && voiceStateRef.current === 'listening' && !isMicMutedRef.current && !isProcessingRef.current && !isSpeakingRef.current && !isSubmittingRef.current) {
              startListeningTurnRef.current();
            }
          }, 250);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      voiceStateRef.current = 'listening';
      setVoiceState('listening');
    } catch (recErr) {
      console.warn('SpeechRecognition initialization notice:', recErr);
    }
  }, [processUserTurn, releaseAudioResources]);

  // Keep ref updated
  useEffect(() => {
    startListeningTurnRef.current = startListeningTurn;
  }, [startListeningTurn]);

  // Start complete Voice Session
  const startVoiceSession = useCallback(async () => {
    setErrorMessage(null);
    voiceStateRef.current = 'requesting_permission';
    setVoiceState('requesting_permission');
    isSessionActiveRef.current = true;
    isSubmittingRef.current = false;
    isProcessingRef.current = false;
    isSpeakingRef.current = false;
    setSessionDuration(0);
    lastSubmittedTranscriptRef.current = '';

    // 1. Request microphone access & initialize audio engine
    const audioOk = await startAudioEngine();
    if (!audioOk) {
      isSessionActiveRef.current = false;
      return;
    }

    // 2. Initialize Voice Session in Backend
    try {
      const sess = await api.createVoiceSession(threadIdRef.current, mode, settings.selectedVoice);
      setSession(sess);
    } catch (sessErr) {
      console.warn('Backend voice session notice (proceeding locally):', sessErr);
      setSession({
        session_id: `local_voice_${Date.now()}`,
        thread_id: threadIdRef.current,
        mode,
        status: 'active',
        turns_count: 0,
        created_at: new Date().toISOString(),
      });
    }

    // 3. Start session duration clock
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    // 4. Begin listening turn
    voiceStateRef.current = 'listening';
    setVoiceState('listening');
    startListeningTurn();
  }, [mode, settings.selectedVoice, startListeningTurn]);

  // End complete Voice Session
  const endVoiceSession = useCallback(async () => {
    isSessionActiveRef.current = false;
    isSubmittingRef.current = false;
    isProcessingRef.current = false;
    isSpeakingRef.current = false;
    voiceStateRef.current = 'ended';
    setVoiceState('ended');

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (session?.session_id && !session.session_id.startsWith('local_')) {
      try {
        await api.endVoiceSession(session.session_id);
      } catch {
        // ignore
      }
    }

    releaseAudioResources();
  }, [session, releaseAudioResources]);

  // Manual Turn Submission (e.g. from user transcript edit or button click)
  const submitSpokenQuery = useCallback(async (overrideText?: string) => {
    let query = (overrideText !== undefined ? overrideText : (latestTranscriptRef.current || accumulatedTranscriptRef.current || userTranscript)).trim();

    // If speech recognition returned empty but MediaRecorder has audio chunks, try server transcription
    if (!query && audioChunksRef.current.length > 0) {
      try {
        voiceStateRef.current = 'transcribing';
        setVoiceState('transcribing');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const res = await api.transcribeAudio(audioBlob);
        if (res.text && res.text.trim()) {
          query = res.text.trim();
        }
      } catch (err) {
        console.warn('Server audio transcription notice:', err);
      }
    }

    if (!query) {
      if (isSessionActiveRef.current && !isMicMutedRef.current) {
        voiceStateRef.current = 'listening';
        setVoiceState('listening');
        startListeningTurn();
      } else {
        voiceStateRef.current = 'idle';
        setVoiceState('idle');
      }
      return;
    }

    // Stop recognition before processing
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    await processUserTurn(query);
  }, [userTranscript, processUserTurn, startListeningTurn]);

  useEffect(() => {
    submitSpokenQueryRef.current = submitSpokenQuery;
  }, [submitSpokenQuery]);

  // Toggle Microphone Mute
  const toggleMicMute = useCallback(() => {
    setIsMicMuted((prev) => {
      const next = !prev;
      isMicMutedRef.current = next;

      if (next) {
        // Muting
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
        }
        voiceStateRef.current = 'muted';
        setVoiceState('muted');
      } else {
        // Unmuting
        if (isSessionActiveRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
          voiceStateRef.current = 'listening';
          setVoiceState('listening');
          startListeningTurn();
        }
      }
      return next;
    });
  }, [startListeningTurn]);

  // Toggle Audio Output Mute
  const toggleOutputMute = useCallback(() => {
    setIsOutputMuted((prev) => {
      const next = !prev;
      isOutputMutedRef.current = next;

      if (next && typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
        if (voiceStateRef.current === 'speaking') {
          if (settingsRef.current.mode === 'live_conversation') {
            voiceStateRef.current = 'listening';
            setVoiceState('listening');
            startListeningTurn();
          } else {
            voiceStateRef.current = 'idle';
            setVoiceState('idle');
          }
        }
      }
      return next;
    });
  }, [startListeningTurn]);

  // Interrupt Assistant Speaking
  const interruptSpeaking = useCallback(() => {
    isExplicitlyCancellingRef.current = true;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    isExplicitlyCancellingRef.current = false;

    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    currentUtteranceRef.current = null;
    isSpeakingRef.current = false;
    try {
      delete (window as any).__nexusVoiceUtterance;
    } catch {}

    if (isSessionActiveRef.current && !isMicMutedRef.current) {
      voiceStateRef.current = 'listening';
      setVoiceState('listening');
      if (restartListenTimerRef.current) clearTimeout(restartListenTimerRef.current);
      restartListenTimerRef.current = setTimeout(() => {
        startListeningTurnRef.current();
      }, 150);
    } else {
      voiceStateRef.current = 'idle';
      setVoiceState('idle');
    }
  }, []);

  // Cancel current turn
  const cancelCurrentTurn = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (activeAbortFnRef.current) {
      try {
        activeAbortFnRef.current();
      } catch {
        // ignore
      }
      activeAbortFnRef.current = null;
    }

    isSubmittingRef.current = false;
    isProcessingRef.current = false;
    setUserTranscript('');
    setInterimTranscript('');
    accumulatedTranscriptRef.current = '';
    latestTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    audioChunksRef.current = [];

    if (isSessionActiveRef.current && !isMicMutedRef.current) {
      voiceStateRef.current = 'listening';
      setVoiceState('listening');
      startListeningTurn();
    } else {
      voiceStateRef.current = 'idle';
      setVoiceState('idle');
    }
  }, [startListeningTurn]);

  // Clear error
  const clearError = useCallback(() => {
    setErrorMessage(null);
    isSubmittingRef.current = false;
    isProcessingRef.current = false;
    if (isSessionActiveRef.current && !isMicMutedRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
      voiceStateRef.current = 'listening';
      setVoiceState('listening');
      startListeningTurn();
    } else if (!isSessionActiveRef.current) {
      voiceStateRef.current = 'idle';
      setVoiceState('idle');
    }
  }, [startListeningTurn]);

  // Retry last turn
  const retryLastTurn = useCallback(async () => {
    const queryToRetry = lastAttemptedQueryRef.current.trim();
    if (!queryToRetry) {
      clearError();
      return;
    }
    setErrorMessage(null);
    isSubmittingRef.current = false;
    isProcessingRef.current = false;
    // Allow re-submitting the last attempted query
    lastSubmittedTranscriptRef.current = '';
    await processUserTurn(queryToRetry);
  }, [clearError, processUserTurn]);

  return {
    voiceState,
    mode,
    setMode,
    session,
    sessionDuration,
    userTranscript,
    interimTranscript,
    assistantSpokenText,
    activeCitations,
    audioLevels,
    errorMessage,
    isMicMuted,
    isOutputMuted,
    settings,
    updateSettings,
    startVoiceSession,
    endVoiceSession,
    toggleMicMute,
    toggleOutputMute,
    interruptSpeaking,
    submitSpokenQuery,
    cancelCurrentTurn,
    clearError,
    retryLastTurn,
  };
};
