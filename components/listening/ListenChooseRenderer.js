'use client';

import { useEffect, useRef } from 'react';
import RadioOptionList from '@/components/shared/RadioOptionList';

/**
 * Listen and Choose a Response
 * - Audio plays automatically
 * - Options are visible while listening
 * - Layout adapts:
 *   - with image: image left, question + options right
 *   - without image: compact question card above options
 */
export default function ListenChooseRenderer({ audioUrl, speakerPhotoUrl, options = [], selected, onSelect, onAudioEnd }) {
  const audioRef = useRef(null);
  const onAudioEndRef = useRef(onAudioEnd);
  const choices = (options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D'])
    .slice(0, 4)
    .map(option => String(option).replace(/^[A-D][\.\)\:\-\s]+/i, ''));

  useEffect(() => {
    onAudioEndRef.current = onAudioEnd;
  }, [onAudioEnd]);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    audioRef.current.src = audioUrl;
    audioRef.current.play().catch(() => {
      // Auto-play blocked; still allow answering.
      onAudioEndRef.current?.();
    });
  }, [audioUrl]);

  return (
    <div style={{ minHeight: 'calc(100vh - var(--navbar-height) - var(--subbar-height))', background: '#ffffff', padding: '40px 24px' }}>
      <audio ref={audioRef} onEnded={onAudioEnd} preload="auto" style={{ display: 'none' }} />

      <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#000', marginBottom: 40, letterSpacing: '-0.01em' }}>
          Choose the best response.
        </div>

        {speakerPhotoUrl ? (
          <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 40, alignItems: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
              <img
                src={speakerPhotoUrl}
                alt="Speaker"
                style={{ width: 300, maxWidth: '100%', height: 420, objectFit: 'contain', objectPosition: 'center top' }}
              />
            </div>

            <div style={{ width: '100%' }}>
              <RadioOptionList
                options={choices}
                selected={selected}
                onSelect={onSelect}
                gap={14}
                fontSize={15}
              />
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <RadioOptionList
              options={choices}
              selected={selected}
              onSelect={onSelect}
              gap={14}
              fontSize={15}
            />
          </div>
        )}
      </div>
    </div>
  );
}
