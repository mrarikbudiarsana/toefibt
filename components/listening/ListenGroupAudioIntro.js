'use client';

import { useEffect, useRef, useState } from 'react';

export default function ListenGroupAudioIntro({ audioUrl, speakerPhotoUrl, onFinished }) {
  const audioRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | playing | ended | error

  useEffect(() => {
    if (!audioRef.current) return;
    if (!audioUrl) {
      onFinished?.();
      return;
    }

    audioRef.current.src = audioUrl;
    audioRef.current.play()
      .then(() => setStatus('playing'))
      .catch(() => {
        setStatus('error');
      });
  }, [audioUrl, onFinished]);

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
        onEnded={() => {
          setStatus('ended');
          setTimeout(() => onFinished?.(), 250);
        }}
        onError={() => setStatus('error')}
        style={{ display: 'none' }}
      />

      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>
          Conversation Audio
        </div>

        {speakerPhotoUrl ? (
          <img
            src={speakerPhotoUrl}
            alt="Conversation speakers"
            style={{ width: 320, maxWidth: '100%', height: 380, objectFit: 'contain', margin: '0 auto 18px' }}
          />
        ) : null}

        {status === 'loading' && <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Preparing audio...</p>}
        {status === 'playing' && <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Listen carefully. Questions will appear after the audio.</p>}
        {status === 'ended' && <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Audio finished. Loading questions...</p>}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--danger)' }}>Audio could not be played. Continue to questions.</p>
            <button className="btn btn--primary" onClick={() => onFinished?.()}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
