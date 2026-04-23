'use client';

import { useEffect, useRef, useState } from 'react';

export default function ListenRepeatIntro({ contextText = '', introAudioUrl = '', introImageUrl = '', onFinished }) {
  const audioRef = useRef(null);
  const onFinishedRef = useRef(onFinished);
  const hasIntroAudio = String(introAudioUrl || '').trim().length > 0;
  const [status, setStatus] = useState(hasIntroAudio ? 'loading' : 'ended'); // loading | playing | ended | error

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const audio = audioRef.current;
    const url = String(introAudioUrl || '').trim();
    if (!audio || !url) return;
    audio.src = url;
    audio.play()
      .then(() => setStatus('playing'))
      .catch(() => setStatus('error'));
  }, [introAudioUrl]);

  function handleAudioEnd() {
    setStatus('ended');
  }

  const showContinue = status === 'ended' || status === 'error';

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--navbar-height) - var(--subbar-height))',
        background: '#ececec',
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
          {contextText || 'Listen to the speaker and repeat what she says. Repeat only once.'}
        </div>

        {introImageUrl ? (
          <img
            src={introImageUrl}
            alt="Speaking context"
            style={{ width: 420, maxWidth: '100%', height: 300, objectFit: 'contain', display: 'block', margin: '0 auto 14px', border: '1px solid #9ca3af' }}
          />
        ) : null}

        <div style={{ fontSize: 15, color: '#374151', textAlign: 'center' }}>
          {status === 'loading' && 'Preparing audio...'}
          {status === 'playing' && 'Listen carefully.'}
          {status === 'ended' && 'Audio finished. Continue to the question.'}
          {status === 'error' && 'Audio could not be played. Continue to the question.'}
        </div>

        {showContinue && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button className="btn btn--primary" onClick={() => onFinishedRef.current?.()}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
