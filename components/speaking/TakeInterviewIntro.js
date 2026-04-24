'use client';

import { useEffect, useRef, useState } from 'react';

export default function TakeInterviewIntro({ contextText = '', introAudioUrl = '', introImageUrl = '', onFinished }) {
  const audioRef = useRef(null);
  const onFinishedRef = useRef(onFinished);
  const hasIntroAudio = String(introAudioUrl || '').trim().length > 0;
  const [status, setStatus] = useState(hasIntroAudio ? 'loading' : 'ended'); // loading | playing | ended | error
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const audio = audioRef.current;
    const url = String(introAudioUrl || '').trim();
    if (!audio || !url) return;
    
    // Start 3s countdown before playing audio
    setStatus('pre_countdown');
    setCountdown(3);
    let c = 3;
    const id = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(id);
        audio.src = url;
        audio.play()
          .then(() => setStatus('playing'))
          .catch(() => setStatus('error'));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [introAudioUrl]);

  useEffect(() => {
    if (status === 'ended' || status === 'error') {
      setCountdown(5);
      let c = 5;
      const id = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(id);
          onFinishedRef.current?.();
        }
      }, 1000);
      return () => clearInterval(id);
    }
  }, [status]);

  function handleAudioEnd() {
    setStatus('ended');
  }

  const showContinue = status === 'ended' || status === 'error';

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--navbar-height) - var(--subbar-height))',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={handleAudioEnd}
        onError={() => setStatus('error')}
        style={{ display: 'none' }}
      />

      <div style={{ width: '100%', maxWidth: 760, border: '2px solid #111', background: '#fff', padding: '18px 16px 20px' }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: '#111', textAlign: 'center', lineHeight: 1.25, marginBottom: 12 }}>
          {contextText || 'The researcher will ask you some questions.'}
        </div>

        {introImageUrl ? (
          <img
            src={introImageUrl}
            alt="Interview context"
            style={{ width: 420, maxWidth: '100%', height: 300, objectFit: 'contain', display: 'block', margin: '0 auto 14px', border: '1px solid #9ca3af' }}
          />
        ) : null}

        <div style={{ fontSize: 15, color: '#374151', textAlign: 'center' }}>
          {status === 'loading' && 'Preparing direction audio...'}
          {status === 'pre_countdown' && `Audio will play in ${countdown}s...`}
          {status === 'playing' && 'Listen carefully to the directions.'}
          {(status === 'ended' || status === 'error') && 'Directions finished. Proceeding to interview...'}
        </div>

        {showContinue && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button className="btn btn--primary" onClick={() => onFinishedRef.current?.()}>
              Continue Now {countdown !== null ? `(${countdown}s)` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
