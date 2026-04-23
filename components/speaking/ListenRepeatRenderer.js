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
export default function ListenRepeatRenderer({ audioUrl, speakerPhotoUrl = '', prompt = '', maxRecordSeconds = 15, onRecordingReady, onAutoAdvance }) {
  const [phase, setPhase] = useState('init'); // init | pre_audio_countdown | audio | countdown | recording | done
  const [countdown, setCountdown] = useState(3);
  const [preCountdown, setPreCountdown] = useState(3);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [doneCountdown, setDoneCountdown] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(!speakerPhotoUrl);

  // Handle auto-advance countdown when done
  useEffect(() => {
    if (phase === 'done') {
      setDoneCountdown(5);
      let c = 5;
      const id = setInterval(() => {
        c--;
        setDoneCountdown(c);
        if (c <= 0) {
          clearInterval(id);
          onAutoAdvance?.();
        }
      }, 1000);
      return () => clearInterval(id);
    }
  }, [phase, onAutoAdvance]);

  const sourceAudioRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  // Handle init to pre_audio_countdown transition when image loads
  useEffect(() => {
    if (phase === 'init' && imageLoaded) {
      setPhase('pre_audio_countdown');
    }
  }, [phase, imageLoaded]);

  // Handle pre-audio countdown
  useEffect(() => {
    if (phase === 'pre_audio_countdown') {
      setPreCountdown(3);
      let c = 3;
      const id = setInterval(() => {
        c--;
        setPreCountdown(c);
        if (c <= 0) {
          clearInterval(id);
          setPhase('audio');
        }
      }, 1000);
      return () => clearInterval(id);
    }
  }, [phase]);

  // Play source audio when entering 'audio' phase
  useEffect(() => {
    if (phase === 'audio') {
      if (!sourceAudioRef.current || !audioUrl) {
        setPhase('countdown');
        return;
      }
      sourceAudioRef.current.play().catch(() => setPhase('countdown'));
    }
  }, [phase, audioUrl]);

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

      {/* Render the image once at the top, but hide it until loaded to prevent visual jumping. Also hide in done phase. */}
      {speakerPhotoUrl && phase !== 'done' ? (
        <img
          src={speakerPhotoUrl}
          alt="Speaking prompt"
          style={{ width: 460, maxWidth: '100%', height: 260, objectFit: 'contain', marginBottom: 12, display: imageLoaded ? 'block' : 'none' }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
      ) : null}

      {/*  INIT PHASE  */}
      {phase === 'init' && (
        <div style={{ padding: 40 }}>
           <div className="spinner" style={{ width: 40, height: 40, border: '4px solid rgba(13, 115, 119, 0.1)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      )}

      {/*  PRE-AUDIO COUNTDOWN PHASE  */}
      {phase === 'pre_audio_countdown' && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal)', marginBottom: 8 }}>
            Get Ready
          </div>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--teal)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 800,
            boxShadow: '0 8px 32px rgba(13,115,119,0.3)',
            marginBottom: 12
          }}>
            {preCountdown}
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Audio starts in</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Please look at the picture.</p>
        </>
      )}

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
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--teal)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 800,
            boxShadow: '0 8px 32px rgba(13,115,119,0.3)',
            marginBottom: 12
          }}>
            {countdown}
          </div>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Recording starts in</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Prepare to repeat what you heard.</p>
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
          <p style={{ fontWeight: 600, fontSize: 16, marginTop: 12, marginBottom: 12 }}>Repeat the sentence now</p>
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
          <div style={{ marginTop: 24, fontSize: 16, fontWeight: 600, color: 'var(--teal)' }}>
            Proceeding to next question in {doneCountdown}s...
          </div>
        </>
      )}
    </div>
  );
}

