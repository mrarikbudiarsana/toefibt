'use client';
import { useState, useRef } from 'react';

/**
 * Take an Interview — Speaking Task
 * Flow:
 *   1. Interviewer photo + question shown
 *   2. Preparation countdown (15–30 seconds)
 *   3. Record answer (max 45 seconds)
 *   4. Playback available
 *
 * Props:
 *   question: string
 *   interviewerName: string
 *   interviewerPhotoUrl: string | null
 *   prepSeconds: number
 *   maxRecordSeconds: number
 *   onRecordingReady: (blob: Blob) => void
 */
export default function TakeInterviewRenderer({
  question = '',
  interviewerName = 'Interviewer',
  interviewerPhotoUrl = null,
  prepSeconds = 15,
  maxRecordSeconds = 45,
  onRecordingReady,
  questionNumber,
  totalQuestions,
}) {
  const [phase, setPhase] = useState('question'); // question | prep | recording | done
  const [prepRemaining, setPrepRemaining] = useState(prepSeconds);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  function startPrep() {
    setPhase('prep');
    let remaining = prepSeconds;
    const id = setInterval(() => {
      remaining--;
      setPrepRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        startRecording();
      }
    }, 1000);
  }

  async function startRecording() {
    setPhase('recording');
    setRecordSeconds(0);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setPlaybackUrl(URL.createObjectURL(blob));
        setPhase('done');
        onRecordingReady?.(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();

      let elapsed = 0;
      intervalRef.current = setInterval(() => {
        elapsed++;
        setRecordSeconds(elapsed);
        if (elapsed >= maxRecordSeconds) stopRecording();
      }, 1000);
    } catch {
      setPhase('done');
    }
  }

  function stopRecording() {
    clearInterval(intervalRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  const recordProgress = (recordSeconds / maxRecordSeconds) * 100;
  const prepProgress = ((prepSeconds - prepRemaining) / prepSeconds) * 100;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        {interviewerPhotoUrl ? (
          <img src={interviewerPhotoUrl} alt={interviewerName} className="speaker-photo" style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--teal)', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), var(--teal-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0, border: '3px solid var(--teal)' }}>
            👩‍💼
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{interviewerName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>TOEFL iBT Interviewer · Question {questionNumber} of {totalQuestions}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="badge badge--teal" style={{ fontSize: 11, textTransform: 'uppercase' }}>Take an Interview</span>
        </div>
      </div>

      {/* Question card */}
      <div style={{
        background: 'var(--surface)', border: '2px solid var(--teal)',
        borderRadius: 10, padding: '20px 24px',
        marginBottom: 28, fontSize: 17, fontWeight: 600,
        color: 'var(--text-primary)', lineHeight: 1.6,
      }}>
        {question || 'Tell me about a time when you had to overcome a challenge. What did you do, and what did you learn from the experience?'}
      </div>

      {/* ── QUESTION PHASE ── */}
      {phase === 'question' && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            Read the question above. You will have <strong>{prepSeconds} seconds</strong> to prepare, then <strong>{maxRecordSeconds} seconds</strong> to speak.
          </p>
          <button className="btn btn--primary btn--lg" onClick={startPrep}>
            Begin — Start Preparation Timer →
          </button>
        </div>
      )}

      {/* ── PREP PHASE ── */}
      {phase === 'prep' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--teal)' }}>
            Preparation Time
          </div>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'var(--teal)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, fontWeight: 800,
            margin: '0 auto 16px',
            boxShadow: '0 6px 24px rgba(13,115,119,0.3)',
          }}>
            {prepRemaining}
          </div>
          <div className="progress-bar" style={{ maxWidth: 300, margin: '0 auto 16px' }}>
            <div className="progress-bar__fill" style={{ width: `${prepProgress}%` }} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Organize your thoughts. Recording starts automatically.</p>
          <button className="btn btn--outline btn--sm" style={{ marginTop: 16 }} onClick={startRecording}>
            Skip — Start Recording Now
          </button>
        </div>
      )}

      {/* ── RECORDING PHASE ── */}
      {phase === 'recording' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--danger)' }}>
            🔴 Recording your answer
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto 8px' }}>
            <span>{recordSeconds}s elapsed</span>
            <span>{maxRecordSeconds - recordSeconds}s remaining</span>
          </div>
          <div className="progress-bar" style={{ maxWidth: 300, margin: '0 auto 20px' }}>
            <div className="progress-bar__fill" style={{ width: `${recordProgress}%`, background: 'var(--danger)' }} />
          </div>
          <button className="record-btn recording" onClick={stopRecording} aria-label="Stop recording" style={{ margin: '0 auto' }}>
            <div style={{ width: 24, height: 24, background: '#fff', borderRadius: 4 }} />
          </button>
          <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>Click to stop recording early</p>
        </div>
      )}

      {/* ── DONE PHASE ── */}
      {phase === 'done' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Response recorded</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>Your speaking response has been saved.</p>
          {playbackUrl && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Review your answer:</p>
              <audio controls src={playbackUrl} style={{ borderRadius: 8, width: '100%', maxWidth: 340 }} />
            </div>
          )}
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            Click <strong>Next</strong> when ready.
          </p>
        </div>
      )}
    </div>
  );
}
