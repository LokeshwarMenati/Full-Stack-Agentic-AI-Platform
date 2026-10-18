import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
  webkitAudioContext?: any;
}

export interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  isSpeaking: boolean;
  isSupported: boolean;
  isTranscribing: boolean;
  audioLevels: number[];
  errorMessage: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  getTranscribedText: () => Promise<string>;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  clearTranscript: () => void;
}

export const useVoice = (onTranscriptUpdate?: (text: string) => void): UseVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 20, 30, 20, 15]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const callbackRef = useRef(onTranscriptUpdate);
  const isManuallyStoppedRef = useRef(false);

  // Keep callback reference updated without triggering re-renders
  useEffect(() => {
    callbackRef.current = onTranscriptUpdate;
  }, [onTranscriptUpdate]);

  const isSupported = typeof window !== 'undefined' &&
    Boolean(
      navigator.mediaDevices?.getUserMedia ||
      (window as unknown as IWindow).SpeechRecognition ||
      (window as unknown as IWindow).webkitSpeechRecognition
    );

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Setup real-time audio volume analysis & MediaRecorder
  const startAudioAnalysis = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      // 1. AudioContext volume measurement
      const AudioCtx = window.AudioContext || (window as unknown as IWindow).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateVolume = () => {
          if (!audioStreamRef.current || isManuallyStoppedRef.current) return;

          analyser.getByteFrequencyData(dataArray);

          const bands: number[] = [];
          const step = Math.max(1, Math.floor(bufferLength / 6));
          for (let i = 0; i < 6; i++) {
            const val = dataArray[i * step] || 0;
            const pct = Math.min(100, Math.max(15, Math.round((val / 255) * 100)));
            bands.push(pct);
          }

          setAudioLevels(bands);
          animFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
      }

      // 2. MediaRecorder for universal backend transcription fallback
      audioChunksRef.current = [];
      try {
        const mimeType = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        if (typeof MediaRecorder !== 'undefined') {
          const recorder = new MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(200);
          mediaRecorderRef.current = recorder;
        }
      } catch (recErr) {
        console.warn('MediaRecorder init error:', recErr);
      }

      return true;
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
      } else {
        setErrorMessage('Could not access microphone hardware. Please check audio devices.');
      }
      return false;
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
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
    setAudioLevels([15, 25, 20, 30, 20, 15]);
  };

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    stopAudioAnalysis();
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    setErrorMessage(null);
    isManuallyStoppedRef.current = false;
    setTranscript('');
    setIsTranscribing(false);

    // 1. Start audio analysis & hardware recording
    const streamOk = await startAudioAnalysis();
    if (!streamOk) return;

    setIsListening(true);

    // 2. Try native SpeechRecognition if supported
    const SpeechRecognition =
      (window as unknown as IWindow).SpeechRecognition ||
      (window as unknown as IWindow).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        // Use non-continuous mode for reliable HTTP-based recognition without gRPC network drops
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          const clean = current.trim();
          if (clean) {
            setTranscript(clean);
            if (callbackRef.current) {
              callbackRef.current(clean);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition notice:', event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access denied in browser settings.');
            stopListening();
          } else if (event.error === 'network') {
            // Google Cloud STT unreachable: seamlessly rely on audio recorder fallback
            console.info('Speech recognition network error: Audio recorder fallback active.');
            // Do NOT throw error or abort; the MediaRecorder has captured the voice audio!
          }
        };

        recognition.onend = () => {
          // If still recording audio and not stopped manually, recognition ended naturally
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition start error, using audio recorder fallback:', err);
      }
    }
  }, [stopListening]);

  const getTranscribedText = useCallback(async (): Promise<string> => {
    // 1. If we already got text from Web Speech API, return it immediately
    if (transcript.trim()) {
      return transcript.trim();
    }

    // 2. Otherwise transcribe recorded audio chunks using the backend transcription service
    if (audioChunksRef.current.length > 0) {
      setIsTranscribing(true);
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const res = await api.transcribeAudio(audioBlob);
        setIsTranscribing(false);
        if (res.text) {
          setTranscript(res.text);
          return res.text;
        }
      } catch (err) {
        console.error('Audio transcription error:', err);
        setIsTranscribing(false);
      }
    }

    return transcript.trim();
  }, [transcript]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[#*_`~>-]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    audioChunksRef.current = [];
  }, []);

  return {
    isListening,
    transcript,
    isSpeaking,
    isSupported,
    isTranscribing,
    audioLevels,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    getTranscribedText,
    speak,
    stopSpeaking,
    clearTranscript,
  };
};
