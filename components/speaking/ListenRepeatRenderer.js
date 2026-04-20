'use client';
import { useState, useRef, useEffect } from 'react';

/**
 * Listen and Repeat  Speaking Task
 * Flow:
 *   1. Audio plays (sentence/phrase)
 *   2. Countdown (3 seconds) before recording starts
 *   3. Student records (max 15 seconds)
 *   4. Playback available
 *
 * Props:
 *   audioUrl: string
 *   prompt: string           the text to repeat (shown during recording)
 *   maxRecordSeconds: number
 *   onRecordingReady: (blob: Blob) => void
 */
export default function ListenRepeatRenderer({ audioUrl, prompt = '', maxRecordSeconds = 15, onRecordingReady }) {
  const [phase, setPhase] = useState('audio'); // audio | countdown | recording | done
  const [countdown, setCountdown] = useState(3);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const sourceAudioRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  // Play source audio on mount
  useEffect(() => {
    if (!sourceAudioRef.current || !audioUrl) return;
    sourceAudioRef.current.play().catch(() => setPhase('countdown'));
  }, [audioUrl]);

  function handleSourceAudioEnd() {
    startCountdown();
  }

  function startCountdown() {
    setPhase('countdown');
    setCountdown(3);
    let c = 3;
    const id = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
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
        setAudioBlob(blob);
        setPlaybackUrl(URL.createObjectURL(blob));
        setPhase('done');
        onRecordingReady?.(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();

      // Auto-stop after max seconds
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

  const progress = (recordSeconds / maxRecordSeconds) * 100;

  return (
    <div className="audio-screen">
      <audio
        ref={sourceAudioRef}
        src={audioUrl}
        preload="auto"
        onEnded={handleSourceAudioEnd}
        style={{ display: 'none' }}
      />

      {/*  AUDIO PHASE  */}
      {phase === 'audio' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal)', marginBottom: 8 }}>
            Listen and Repeat
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>Audio</div>
          <p style={{ fontWeight: 600, fontSize: 18, marginTop: 8 }}>Listen carefully</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
            You will hear a sentence. You will then repeat it as accurately as possible.
          </p>
          <div className="audio-wave">
            {[1,2,3,4,5].map(i => <div key={i} className="audio-wave__bar" />)}
          </div>
        </>
      )}

      {/*  COUNTDOWN PHASE  */}
      {phase === 'countdown' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal)', marginBottom: 8 }}>
            Get Ready
          </div>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'var(--teal)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48, fontWeight: 800,
            boxShadow: '0 8px 32px rgba(13,115,119,0.3)',
          }}>
            {countdown}
          </div>
          <p style={{ fontWeight: 600, fontSize: 18 }}>Recording starts in</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Prepare to repeat what you heard.</p>
        </>
      )}

      {/*  RECORDING PHASE  */}
      {phase === 'recording' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--danger)', marginBottom: 8 }}>
            x Recording
          </div>
          <button className="record-btn recording" onClick={stopRecording} aria-label="Stop recording">
            <div style={{ width: 24, height: 24, background: '#fff', borderRadius: 4 }} />
          </button>
          <p style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>Repeat the sentence now</p>
          {prompt && (
            <div style={{
              background: 'var(--teal-light)', borderRadius: 10,
              padding: '14px 20px', maxWidth: 480, textAlign: 'center',
              fontSize: 16, fontWeight: 600, color: 'var(--teal-dark)',
              border: '1px solid #a7d7d9',
            }}>
              &ldquo;{prompt}&rdquo;
            </div>
          )}
          <div style={{ width: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>{recordSeconds}s</span>
              <span>{maxRecordSeconds}s</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${progress}%`, background: 'var(--danger)' }} />
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click the button to stop recording early</p>
        </>
      )}

      {/*  DONE PHASE  */}
      {phase === 'done' && (
        <>
          <div style={{ fontSize: 28, fontWeight: 700 }}>Done</div>
          <p style={{ fontWeight: 700, fontSize: 18 }}>Recording saved</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Your response has been recorded.</p>
          {playbackUrl && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>Listen to your recording:</p>
              <audio controls src={playbackUrl} style={{ borderRadius: 8 }} />
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            Click <strong>Next</strong> to continue.
          </p>
        </>
      )}
    </div>
  );
}

