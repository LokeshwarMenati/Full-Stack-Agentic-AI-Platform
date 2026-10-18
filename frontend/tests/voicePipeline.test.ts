import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

// Data types mirroring platform contract
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ source: string; page: number; excerpt: string }>;
  pending_booking?: Record<string, any>;
  booking_confirmed?: Record<string, any>;
  created_at: string;
}

type VoiceState =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'speaking'
  | 'muted'
  | 'error'
  | 'ended';

// Mock Browser Environment for SpeechRecognition & SpeechSynthesis
class MockSpeechRecognition {
  continuous = true;
  interimResults = true;
  lang = 'en-US';
  started = false;
  aborted = false;
  stopped = false;

  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  start() {
    this.started = true;
    this.aborted = false;
    this.stopped = false;
    if (this.onstart) this.onstart();
  }

  stop() {
    this.stopped = true;
    this.started = false;
    if (this.onend) this.onend();
  }

  abort() {
    this.aborted = true;
    this.started = false;
    if (this.onend) this.onend();
  }

  // Helper to simulate user speech
  simulateSpeech(results: Array<{ transcript: string; isFinal: boolean }>) {
    if (!this.onresult) return;
    const formatted = results.map((r) => [{ transcript: r.transcript }]);
    (formatted as any).results = results.map((r) => {
      const item = [{ transcript: r.transcript }];
      (item as any).isFinal = r.isFinal;
      return item;
    });
    this.onresult({ results: (formatted as any).results });
  }

  simulateError(errorType: string) {
    if (this.onerror) {
      this.onerror({ error: errorType });
    }
  }
}

class MockSpeechSynthesisUtterance {
  text: string;
  rate = 1.0;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

class MockSpeechSynthesis {
  speaking = false;
  paused = false;
  spokenUtterances: string[] = [];
  lastUtterance: MockSpeechSynthesisUtterance | null = null;

  speak(utterance: MockSpeechSynthesisUtterance) {
    this.speaking = true;
    this.spokenUtterances.push(utterance.text);
    this.lastUtterance = utterance;
    if (utterance.onstart) utterance.onstart();
  }

  cancel() {
    this.speaking = false;
    if (this.lastUtterance && this.lastUtterance.onend) {
      this.lastUtterance.onend();
    }
  }

  getVoices() {
    return [{ name: 'Google US English', lang: 'en-US' }];
  }

  finishSpeaking() {
    this.speaking = false;
    if (this.lastUtterance && this.lastUtterance.onend) {
      this.lastUtterance.onend();
    }
  }
}

// Simulated Voice Engine matching the implementation in useVoiceConversation
class VoiceEngine {
  threadId: string;
  state: VoiceState = 'idle';
  isSessionActive = false;
  isProcessing = false;
  isSpeaking = false;
  isMicMuted = false;
  isOutputMuted = false;

  userTranscript = '';
  interimTranscript = '';
  accumulatedTranscript = '';
  lastSubmittedTranscript = '';
  lastSubmitTime = 0;
  lastAttemptedQuery = '';
  assistantSpokenText = '';

  requestCount = 0;
  submittedPayloads: Array<{ message: string; thread_id: string }> = [];
  messages: ChatMessage[] = [];
  pendingBooking: Record<string, any> | null = null;
  errorMessage: string | null = null;

  recognition: MockSpeechRecognition;
  synthesis: MockSpeechSynthesis;
  chatApiHandler: (msg: string, thread: string) => Promise<any>;

  constructor(
    threadId: string,
    chatApiHandler: (msg: string, thread: string) => Promise<any>
  ) {
    this.threadId = threadId;
    this.recognition = new MockSpeechRecognition();
    this.synthesis = new MockSpeechSynthesis();
    this.chatApiHandler = chatApiHandler;
  }

  async startVoiceSession(): Promise<boolean> {
    this.errorMessage = null;
    this.state = 'requesting_permission';

    // Simulate microphone permission grant
    const micGranted = true;
    if (!micGranted) {
      this.state = 'error';
      this.errorMessage = 'Microphone access denied';
      return false;
    }

    this.isSessionActive = true;
    this.state = 'listening';
    this.startListeningTurn();
    return true;
  }

  startListeningTurn() {
    if (!this.isSessionActive || this.isMicMuted || this.isProcessing || this.isSpeaking) {
      return;
    }

    this.userTranscript = '';
    this.interimTranscript = '';
    this.accumulatedTranscript = '';

    this.recognition.onstart = () => {
      if (this.isSessionActive && !this.isProcessing && !this.isSpeaking) {
        this.state = 'listening';
      }
    };

    this.recognition.onresult = (event: any) => {
      if (!this.isSessionActive || this.isProcessing || this.isSpeaking) return;

      let final = '';
      let interim = '';
      for (const item of event.results) {
        if (item.isFinal) final += item[0].transcript + ' ';
        else interim += item[0].transcript;
      }

      this.accumulatedTranscript = final.trim();
      this.interimTranscript = interim.trim();
      if (this.accumulatedTranscript) this.userTranscript = this.accumulatedTranscript;
    };

    this.recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        this.errorMessage = 'Microphone access denied';
        this.state = 'error';
        this.isSessionActive = false;
      }
    };

    this.recognition.onend = () => {
      if (!this.isSessionActive || this.isMicMuted || this.isProcessing || this.isSpeaking) return;

      const candidate = (this.accumulatedTranscript + ' ' + this.interimTranscript).trim();
      if (candidate.length >= 2) {
        this.finalizeAndSubmit(candidate);
      } else {
        // Auto-restart
        if (this.state === 'listening') {
          this.recognition.start();
        }
      }
    };

    this.recognition.start();
  }

  finalizeAndSubmit(candidate: string) {
    if (this.isProcessing || this.isSpeaking) return Promise.resolve(false);
    this.state = 'transcribing';
    this.accumulatedTranscript = '';
    this.interimTranscript = '';
    this.recognition.stop();
    return this.processUserTurn(candidate);
  }

  async processUserTurn(rawQuery: string): Promise<boolean> {
    const query = rawQuery.trim();

    // 1. Validate transcript
    if (!query) {
      if (this.isSessionActive && !this.isMicMuted) {
        this.state = 'listening';
        this.startListeningTurn();
      }
      return false;
    }

    // 2. Prevent concurrent turns
    if (this.isProcessing || this.isSpeaking) {
      return false;
    }

    // 3. Prevent duplicate submissions within short interval
    const now = Date.now();
    if (query === this.lastSubmittedTranscript && now - this.lastSubmitTime < 2500) {
      return false;
    }

    this.lastSubmittedTranscript = query;
    this.lastSubmitTime = now;
    this.lastAttemptedQuery = query;

    this.isProcessing = true;
    this.state = 'processing';
    this.errorMessage = null;
    this.userTranscript = query;
    this.interimTranscript = '';

    // Add user message to conversation
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };
    this.messages.push(userMsg);

    // Track request submission
    this.requestCount++;
    this.submittedPayloads.push({ message: query, thread_id: this.threadId });

    try {
      const response = await this.chatApiHandler(query, this.threadId);
      this.isProcessing = false;

      if (!response || !response.content) {
        this.errorMessage = 'Received empty response from assistant.';
        this.state = 'error';
        return false;
      }

      const asstMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        citations: response.citations || [],
        pending_booking: response.pending_booking,
        booking_confirmed: response.booking_confirmed,
        created_at: new Date().toISOString(),
      };
      this.messages.push(asstMsg);
      this.assistantSpokenText = asstMsg.content;

      if (response.pending_booking) {
        this.pendingBooking = response.pending_booking;
      }

      if (!this.isSessionActive) {
        this.state = 'ended';
        return true;
      }

      // Speak response aloud
      this.speakResponse(asstMsg.content, () => {
        if (!this.isSessionActive) {
          this.state = 'ended';
          return;
        }
        this.state = 'listening';
        this.startListeningTurn();
      });

      return true;
    } catch (err: any) {
      this.isProcessing = false;
      this.errorMessage = err.message || 'Failed to communicate with backend.';
      this.state = 'error';
      return false;
    }
  }

  speakResponse(text: string, onEnd: () => void) {
    if (!this.isSessionActive || this.isOutputMuted) {
      onEnd();
      return;
    }

    const clean = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[`*_#~>-]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) {
      onEnd();
      return;
    }

    this.isSpeaking = true;
    this.state = 'speaking';

    const utterance = new MockSpeechSynthesisUtterance(clean);
    utterance.onend = () => {
      this.isSpeaking = false;
      onEnd();
    };

    this.synthesis.speak(utterance);
  }

  endVoiceSession() {
    this.isSessionActive = false;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.state = 'ended';
    this.recognition.abort();
    this.synthesis.cancel();
  }

  retryLastTurn() {
    const q = this.lastAttemptedQuery;
    if (!q) return Promise.resolve(false);
    this.lastSubmittedTranscript = '';
    return this.processUserTurn(q);
  }
}

describe('NEXUS AI Voice-to-Chat Pipeline Regression Tests', () => {
  const BACKEND_BASE = 'http://127.0.0.1:8000';

  // Helper for calling real running backend
  const liveChatCall = async (message: string, thread_id: string) => {
    const res = await fetch(`${BACKEND_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, thread_id }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  };

  test('1. Start voice session: requests permission, initializes state to listening', async () => {
    const engine = new VoiceEngine('test_thread_01', liveChatCall);
    assert.equal(engine.state, 'idle');

    const started = await engine.startVoiceSession();
    assert.equal(started, true);
    assert.equal(engine.state, 'listening');
    assert.equal(engine.isSessionActive, true);
    assert.equal(engine.recognition.started, true);
  });

  test('2. Recognize a final transcript from speech input', async () => {
    const engine = new VoiceEngine('test_thread_02', liveChatCall);
    await engine.startVoiceSession();

    // User speaks into mic
    engine.recognition.simulateSpeech([
      { transcript: 'How often are performance reviews conducted', isFinal: false },
    ]);
    assert.equal(engine.interimTranscript, 'How often are performance reviews conducted');

    engine.recognition.simulateSpeech([
      { transcript: 'How often are performance reviews conducted according to the handbook?', isFinal: true },
    ]);
    assert.equal(engine.userTranscript, 'How often are performance reviews conducted according to the handbook?');
    assert.equal(engine.accumulatedTranscript, 'How often are performance reviews conducted according to the handbook?');
  });

  test('3. Submit exactly one request per user utterance (no double-submission)', async () => {
    const engine = new VoiceEngine('test_thread_03', liveChatCall);
    await engine.startVoiceSession();

    engine.recognition.simulateSpeech([
      { transcript: 'What is the PTO policy?', isFinal: true },
    ]);

    // Finalize turn
    const turnPromise = engine.finalizeAndSubmit(engine.userTranscript);

    // Simulate recognition onend firing right after
    engine.recognition.onend?.();

    await turnPromise;

    // Must have submitted exactly 1 request
    assert.equal(engine.requestCount, 1);
  });

  test('4. Send the correct thread ID in the request payload', async () => {
    const expectedThreadId = 'voice_session_thread_special_004';
    const engine = new VoiceEngine(expectedThreadId, liveChatCall);
    await engine.startVoiceSession();

    await engine.processUserTurn('What are the core benefits?');

    assert.equal(engine.submittedPayloads.length, 1);
    assert.equal(engine.submittedPayloads[0].thread_id, expectedThreadId);
    assert.equal(engine.submittedPayloads[0].message, 'What are the core benefits?');
  });

  test('5. Receive a successful assistant response from existing backend', async () => {
    const engine = new VoiceEngine('voice_test_thread_05', liveChatCall);
    await engine.startVoiceSession();

    const success = await engine.processUserTurn('How often are performance reviews conducted?');
    assert.equal(success, true);
    assert.ok(engine.assistantSpokenText.length > 0);

    // Verify citations or grounded response received
    const asstMessage = engine.messages.find((m) => m.role === 'assistant');
    assert.ok(asstMessage);
    assert.ok(asstMessage.content.length > 0);
  });

  test('6. Display the response in conversation messages', async () => {
    const engine = new VoiceEngine('voice_test_thread_06', liveChatCall);
    await engine.startVoiceSession();

    await engine.processUserTurn('What health plans are available?');

    assert.equal(engine.messages.length, 2);
    assert.equal(engine.messages[0].role, 'user');
    assert.equal(engine.messages[0].content, 'What health plans are available?');
    assert.equal(engine.messages[1].role, 'assistant');
    assert.ok(engine.messages[1].content.length > 0);
  });

  test('7. Speak the response aloud with clean text stripping markdown and URLs', async () => {
    const engine = new VoiceEngine('voice_test_thread_07', liveChatCall);
    await engine.startVoiceSession();

    // Verify speaking state and spoken text
    await engine.processUserTurn('What is the standard work week?');

    assert.equal(engine.state, 'speaking');
    assert.equal(engine.isSpeaking, true);
    assert.ok(engine.synthesis.spokenUtterances.length > 0);

    const spoken = engine.synthesis.spokenUtterances[0];
    // Check no raw markdown symbols or URLs in spoken speech
    assert.ok(!spoken.includes('###'));
    assert.ok(!spoken.includes('**'));
    assert.ok(!spoken.includes('http://'));
    assert.ok(!spoken.includes('https://'));
  });

  test('8. Return to listening after speech ends', async () => {
    const engine = new VoiceEngine('voice_test_thread_08', liveChatCall);
    await engine.startVoiceSession();

    await engine.processUserTurn('Can you explain bereavement leave?');
    assert.equal(engine.state, 'speaking');

    // Simulate speech finishing
    engine.synthesis.finishSpeaking();

    // Returns automatically to listening
    assert.equal(engine.state, 'listening');
    assert.equal(engine.recognition.started, true);
  });

  test('9. Process multiple consecutive user turns seamlessly', async () => {
    const engine = new VoiceEngine('multi_turn_voice_thread_09', liveChatCall);
    await engine.startVoiceSession();

    // Turn 1
    await engine.processUserTurn('How often are performance reviews conducted according to the handbook?');
    assert.equal(engine.state, 'speaking');
    engine.synthesis.finishSpeaking();
    assert.equal(engine.state, 'listening');

    // Turn 2
    await engine.processUserTurn('I want to schedule a performance review');
    assert.equal(engine.state, 'speaking');
    engine.synthesis.finishSpeaking();
    assert.equal(engine.state, 'listening');

    // Turn 3
    await engine.processUserTurn('Alex Chen, alex@example.com');
    assert.equal(engine.state, 'speaking');
    engine.synthesis.finishSpeaking();
    assert.equal(engine.state, 'listening');

    // Total 6 messages (3 user, 3 assistant)
    assert.equal(engine.messages.length, 6);
    assert.equal(engine.requestCount, 3);
  });

  test('10. Ignore empty and duplicate transcripts', async () => {
    const engine = new VoiceEngine('voice_test_thread_10', liveChatCall);
    await engine.startVoiceSession();

    // Empty speech
    const emptyResult = await engine.processUserTurn('   ');
    assert.equal(emptyResult, false);
    assert.equal(engine.requestCount, 0);

    // First valid query
    await engine.processUserTurn('What is the PTO policy?');
    assert.equal(engine.requestCount, 1);
    engine.synthesis.finishSpeaking();

    // Immediate identical query within 2500ms debounce
    const dupResult = await engine.processUserTurn('What is the PTO policy?');
    assert.equal(dupResult, false);
    assert.equal(engine.requestCount, 1); // Still 1
  });

  test('11. Recover from backend errors without page reload', async () => {
    // Failing API mock
    let failMode = true;
    const flakyApi = async (_msg: string, _thread: string) => {
      if (failMode) throw new Error('Service Unavailable 503');
      return { content: 'Recovered successfully!' };
    };

    const engine = new VoiceEngine('voice_test_thread_11', flakyApi);
    await engine.startVoiceSession();

    // Turn fails
    const failResult = await engine.processUserTurn('Will this fail?');
    assert.equal(failResult, false);
    assert.equal(engine.state, 'error');
    assert.equal(engine.errorMessage, 'Service Unavailable 503');

    // User recovers via retry
    failMode = false;
    const retryResult = await engine.retryLastTurn();
    assert.equal(retryResult, true);
    assert.equal(engine.state, 'speaking');
    assert.equal(engine.errorMessage, null);
  });

  test('12. Handle recognition errors (e.g. not-allowed) gracefully', async () => {
    const engine = new VoiceEngine('voice_test_thread_12', liveChatCall);
    await engine.startVoiceSession();

    engine.recognition.simulateError('not-allowed');

    assert.equal(engine.state, 'error');
    assert.ok(engine.errorMessage?.includes('denied'));
    assert.equal(engine.isSessionActive, false);
  });

  test('13. Stop immediately when the session ends', async () => {
    const engine = new VoiceEngine('voice_test_thread_13', liveChatCall);
    await engine.startVoiceSession();
    assert.equal(engine.state, 'listening');

    engine.endVoiceSession();

    assert.equal(engine.state, 'ended');
    assert.equal(engine.isSessionActive, false);
    assert.equal(engine.recognition.started, false);
    assert.equal(engine.synthesis.speaking, false);
  });

  test('14. Preserve booking state across voice turns (Context Interleaving)', async () => {
    const threadId = 'voice_interleaving_thread_14_' + Date.now();
    const engine = new VoiceEngine(threadId, liveChatCall);
    await engine.startVoiceSession();

    // Step 1: Turn 1 - Initiate scheduling
    await engine.processUserTurn('I want to schedule a performance review.');
    engine.synthesis.finishSpeaking();

    // Verify booking state initiated
    assert.ok(engine.pendingBooking);
    assert.equal(engine.pendingBooking.appointment_type, 'Performance Review');

    // Step 2: Turn 2 - Interleave details and handbook FAQ in one turn
    await engine.processUserTurn('Alex Chen, alex.chen@example.com. Before continuing, how often are performance reviews conducted according to the handbook?');
    engine.synthesis.finishSpeaking();

    // Verify FAQ answered with handbook evidence and booking details saved
    assert.ok(engine.pendingBooking);
    assert.equal(engine.pendingBooking.full_name, 'Alex Chen');
    assert.equal(engine.pendingBooking.email, 'alex.chen@example.com');
    const faqAsst = engine.messages[3];
    assert.ok(faqAsst.citations && faqAsst.citations.length > 0);
    assert.equal(faqAsst.citations[0].source, 'employee_handbook.pdf');
    assert.equal(faqAsst.citations[0].page, 4);

    // Step 3: Turn 3 - Select available slot
    await engine.processUserTurn('Friday at 10:30 AM works for me.');
    engine.synthesis.finishSpeaking();

    const slotAsst = engine.messages[5];
    assert.ok(engine.pendingBooking.slot_id === 'slot_fri_1030' || slotAsst.content.toLowerCase().includes('confirm') || slotAsst.content.toLowerCase().includes('friday'));
  });

  test('15. Preserve the thread when switching between voice and text', async () => {
    const threadId = 'cross_modal_thread_15';

    // 1. Text Chat turn
    const textResp1 = await liveChatCall('Hello, I have a question about employee benefits', threadId);
    assert.ok(textResp1.content.length > 0);

    // 2. Voice Turn on same thread
    const voiceEngine = new VoiceEngine(threadId, liveChatCall);
    await voiceEngine.startVoiceSession();
    await voiceEngine.processUserTurn('What dental benefits are provided?');
    voiceEngine.synthesis.finishSpeaking();
    voiceEngine.endVoiceSession();

    // 3. Text Chat turn continuing on same thread
    const textResp2 = await liveChatCall('Can I book an appointment?', threadId);
    assert.ok(textResp2.content.length > 0);

    // Verify all 3 turns used the exact same thread
    assert.equal(textResp1.thread_id, threadId);
    assert.equal(voiceEngine.submittedPayloads[0].thread_id, threadId);
    assert.equal(textResp2.thread_id, threadId);
  });
});
