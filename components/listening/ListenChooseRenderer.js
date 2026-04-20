'use client';

import { useEffect, useRef } from 'react';

/**
 * Listen and Choose a Response
 * - Audio plays automatically
 * - Screen shows speaker image + options at the same time
 * - No question prompt text shown
 */
export default function ListenChooseRenderer({ audioUrl, speakerPhotoUrl, options = [], selected, onSelect, onAudioEnd }) {
  const audioRef = useRef(null);
  const choices = (options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D']).slice(0, 4);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    audioRef.current.src = audioUrl;
    audioRef.current.play().catch(() => {
      // Auto-play blocked; still allow answering.
      onAudioEnd?.();
    });
  }, [audioUrl, onAudioEnd]);

  return (
    <div style={{ minHeight: 'calc(100vh - var(--navbar-height) - var(--subbar-height))', background: '#ececec', padding: '24px 24px' }}>
      <audio ref={audioRef} onEnded={onAudioEnd} preload="auto" style={{ display: 'none' }} />

      <div style={{ width: '100%', maxWidth: 980, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 14px', fontFamily: 'Arial, sans-serif' }}>
          Choose the best response.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 34, alignItems: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {speakerPhotoUrl ? (
              <img
                src={speakerPhotoUrl}
                alt="Speaker"
                style={{ width: 230, height: 300, objectFit: 'cover', objectPosition: 'center top' }}
              />
            ) : (
              <div style={{ width: 230, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 24 }}>
                Audio
              </div>
            )}
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {choices.map((option, i) => {
              const letter = String.fromCharCode(65 + i);
              const cleanOption = String(option).replace(/^[A-D][\.\)\:\-\s]+/i, '');
              const isSelected = selected === letter;

              return (
                <label
                  key={letter}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 15,
                    color: isSelected ? 'var(--teal)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="radio"
                    name="listen-choose-option"
                    checked={isSelected}
                    onChange={() => onSelect(letter)}
                    style={{ width: 18, height: 18, accentColor: 'var(--teal)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ lineHeight: 1.45 }}>{cleanOption}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
