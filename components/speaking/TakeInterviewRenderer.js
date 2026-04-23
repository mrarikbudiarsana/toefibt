'use client';
import { useState, useRef, useEffect } from 'react';

/**
 * Take an Interview  Speaking Task
 * Flow:
 *   1. Interviewer photo + question shown
 *   2. Preparation countdown (1530 seconds)
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
  audioUrl = null,
  prepSeconds = 15,
  maxRecordSeconds = 45,
  onRecordingReady,
  onAutoAdvance,
  questionNumber,
  totalQuestions,
}) {
  const [phase, setPhase] = useState('init'); // init | pre_media_countdown | media_playback | post_media_countdown | prep | recording | done
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [preCountdown, setPreCountdown] = useState(3);
  const [postCountdown, setPostCountdown] = useState(3);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(5);
  const [prepRemaining, setPrepRemaining] = useState(prepSeconds);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [mediaEnded, setMediaEnded] = useState(false);

  const mediaRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  const isVideo = audioUrl && (audioUrl.toLowerCase().endsWith('.mp4') || audioUrl.toLowerCase().endsWith('.webm'));

  // Initialization: wait for media to load
  useEffect(() => {
    if (!audioUrl) {
      setMediaLoaded(true);
      setPhase('prep'); // Fallback if no media
    }
  }, [audioUrl]);

  useEffect(() => {
    if (mediaLoaded && phase === 'init') {
      startPreMediaCountdown();
    }
  }, [mediaLoaded, phase]);

  function startPreMediaCountdown() {
    setPhase('pre_media_countdown');
    let count = 3;
    const id = setInterval(() => {
      count--;
      setPreCountdown(count);
      if (count <= 0) {
        clearInterval(id);
        startMediaPlayback();
      }
    }, 1000);
  }

  function startMediaPlayback() {
    setPhase('media_playback');
    if (mediaRef.current) {
      mediaRef.current.play().catch(() => setMediaEnded(true));
    } else {
      setMediaEnded(true);
    }
  }

  useEffect(() => {
    if (mediaEnded && phase === 'media_playback') {
      startPostMediaCountdown();
    }
  }, [mediaEnded, phase]);

  function startPostMediaCountdown() {
    setPhase('post_media_countdown');
    let count = 3;
    const id = setInterval(() => {
      count--;
      setPostCountdown(count);
      if (count <= 0) {
        clearInterval(id);
        startPrep();
      }
    }, 1000);
  }

  function startPrep() {
    setPhase('prep');
    setPrepRemaining(prepSeconds);
    let remaining = prepSeconds;
    const id = setInterval(() => {
      remaining--;
      setPrepRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        startRecording();
      }
    }, 1000);
    intervalRef.current = id;
  }

  async function startRecording() {
    clearInterval(intervalRef.current);
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
        startAutoAdvance();
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

  function startAutoAdvance() {
    if (!onAutoAdvance) return;
    let count = 5;
    setAutoAdvanceCountdown(count);
    const id = setInterval(() => {
      count--;
      setAutoAdvanceCountdown(count);
      if (count <= 0) {
        clearInterval(id);
        onAutoAdvance();
      }
    }, 1000);
  }

  const recordProgress = (recordSeconds / maxRecordSeconds) * 100;
  const prepProgress = ((prepSeconds - prepRemaining) / prepSeconds) * 100;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 32px' }}>
      {/* Media container at the top */}
      <div style={{ 
        width: '100%', 
        height: 320, 
        background: '#000', 
        borderRadius: 12, 
        overflow: 'hidden', 
        marginBottom: 24,
        display: (phase !== 'done') ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {isVideo ? (
          <video
            ref={mediaRef}
            src={audioUrl}
            poster={interviewerPhotoUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onLoadedData={() => setMediaLoaded(true)}
            onEnded={() => setMediaEnded(true)}
            onError={() => setMediaLoaded(true)}
          />
        ) : (
          <>
            {interviewerPhotoUrl && (
              <img 
                src={interviewerPhotoUrl} 
                alt="Interviewer" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onLoad={() => setMediaLoaded(true)}
                onError={() => setMediaLoaded(true)}
              />
            )}
            <audio
              ref={mediaRef}
              src={audioUrl}
              onLoadedData={() => !interviewerPhotoUrl && setMediaLoaded(true)}
              onEnded={() => setMediaEnded(true)}
              onError={() => setMediaLoaded(true)}
              style={{ display: 'none' }}
            />
          </>
        )}

        {phase === 'init' && (
          <div className="spinner" style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        )}

        {phase === 'pre_media_countdown' && (
          <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '12px 24px', borderRadius: 99, fontSize: 20, fontWeight: 700 }}>
            Question starts in {preCountdown}
          </div>
        )}

        {phase === 'post_media_countdown' && (
          <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '12px 24px', borderRadius: 99, fontSize: 20, fontWeight: 700 }}>
            Prepare to speak in {postCountdown}
          </div>
        )}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#000' }}>{interviewerName}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>TOEFL iBT Interview &middot; Question {questionNumber} of {totalQuestions}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="badge badge--teal" style={{ fontSize: 11, textTransform: 'uppercase' }}>Take an Interview</span>
        </div>
      </div>

      {/* Question card (if text provided) */}
      {question && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #edf2f7',
          borderLeft: '4px solid var(--teal)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          fontSize: 16,
          fontWeight: 600,
          color: '#000',
          lineHeight: 1.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }}>
          {question}
        </div>
      )}

      {/*  PREP PHASE  */}
      {phase === 'prep' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--teal)' }}>
            Preparation Time
          </div>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: '#ffffff', color: 'var(--teal)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 800,
            margin: '0 auto 12px',
            border: '3px solid var(--teal)',
            boxShadow: '0 8px 24px rgba(13,115,119,0.15)',
          }}>
            {prepRemaining}
          </div>
          <div className="progress-bar" style={{ maxWidth: 280, margin: '0 auto 12px' }}>
            <div className="progress-bar__fill" style={{ width: `${prepProgress}%` }} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Organize your thoughts. Recording starts automatically.</p>
          <button className="btn btn--outline btn--sm" style={{ marginTop: 12 }} onClick={startRecording}>
            Skip to Recording
          </button>
        </div>
      )}

      {/*  RECORDING PHASE  */}
      {phase === 'recording' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--danger)' }}>
            x Recording
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, margin: '0 auto 6px' }}>
            <span>{recordSeconds}s</span>
            <span>{maxRecordSeconds}s</span>
          </div>
          <div className="progress-bar" style={{ maxWidth: 280, margin: '0 auto 16px' }}>
            <div className="progress-bar__fill" style={{ width: `${recordProgress}%`, background: 'var(--danger)' }} />
          </div>
          <button className="record-btn recording" onClick={stopRecording} aria-label="Stop recording" style={{ margin: '0 auto' }}>
            <div style={{ width: 20, height: 20, background: '#fff', borderRadius: 4 }} />
          </button>
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>Click to stop early</p>
        </div>
      )}

      {/*  DONE PHASE  */}
      {phase === 'done' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>Response Recorded</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>Your interview answer has been saved.</p>
          {onAutoAdvance && (
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>
              Next question in {autoAdvanceCountdown}s...
            </div>
          )}
          {playbackUrl && (
            <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, display: 'inline-block' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Review response:</p>
              <audio controls src={playbackUrl} style={{ height: 32 }} />
            </div>
          )}
        </div>
      )}
  );
}

