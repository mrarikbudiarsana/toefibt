'use client';

import { useEffect, useRef, useState } from 'react';

export default function ListenGroupAudioIntro({ directionsAudioUrl, contentAudioUrl, speakerPhotoUrl, onFinished }) {
  const audioRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | playing | ended | error
  const [phase, setPhase] = useState(() => (String(directionsAudioUrl || '').trim() ? 'directions' : 'content')); // directions | content
  const queueRef = useRef([]);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (!audioRef.current) return;
    const directions = String(directionsAudioUrl || '').trim();
    const content = String(contentAudioUrl || '').trim();
    const queue = [directions, content].filter(Boolean);
    if (!queue.length) {
      onFinishedRef.current?.();
      return;
    }
    queueRef.current = queue;
    const firstUrl = queue[0];
    audioRef.current.src = firstUrl;
    audioRef.current.play()
      .then(() => setStatus('playing'))
      .catch(() => {
        setStatus('error');
      });
  }, [directionsAudioUrl, contentAudioUrl]);

  function playNextOrFinish() {
    const queue = queueRef.current;
    const currentIndex = phase === 'directions' ? 0 : 1;
    const nextIndex = currentIndex + 1;
    if (!queue[nextIndex]) {
      setStatus('ended');
      setTimeout(() => onFinishedRef.current?.(), 250);
      return;
    }
    setPhase('content');
    audioRef.current.src = queue[nextIndex];
    audioRef.current.play()
      .then(() => setStatus('playing'))
      .catch(() => setStatus('error'));
  }

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
        onEnded={playNextOrFinish}
        onError={() => setStatus('error')}
        style={{ display: 'none' }}
      />

      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>
          {phase === 'directions' ? 'Directions Audio' : 'Main Audio'}
        </div>

        {speakerPhotoUrl ? (
          <img
            src={speakerPhotoUrl}
            alt="Conversation speakers"
            style={{ width: 320, maxWidth: '100%', height: 380, objectFit: 'contain', margin: '0 auto 18px' }}
          />
        ) : null}

        {status === 'loading' && <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Preparing audio...</p>}
        {status === 'playing' && (
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
            {phase === 'directions'
              ? 'Listen to the directions.'
              : 'Listen carefully. Questions will appear after this audio.'}
          </p>
        )}
        {status === 'ended' && <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Audio finished. Loading questions...</p>}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--danger)' }}>Audio could not be played. Continue to questions.</p>
            <button className="btn btn--primary" onClick={() => onFinishedRef.current?.()}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
