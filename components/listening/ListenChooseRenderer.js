'use client';
import { useEffect, useRef } from 'react';
import RadioOptionList from '@/components/shared/RadioOptionList';

/**
 * Listen and Choose a Response
 * - Audio plays automatically (NO question shown during audio)
 * - Written question NOT shown on screen during audio
 * - 4 written options appear after audio ends
 * - No Back allowed
 *
 * Props:
 *   audioUrl: string
 *   options: string[]   — 4 written reply options
 *   selected: string | null
 *   onSelect: (letter) => void
 *   onAudioEnd: () => void
 *   audioEnded: boolean
 */
export default function ListenChooseRenderer({ audioUrl, options = [], selected, onSelect, onAudioEnd, audioEnded }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    audioRef.current.src = audioUrl;
    audioRef.current.play().catch(() => {
      // Auto-play blocked — mark as ended so user can proceed
      onAudioEnd?.();
    });
  }, [audioUrl]);

  return (
    <div className="audio-screen">
      <audio
        ref={audioRef}
        onEnded={onAudioEnd}
        preload="auto"
        style={{ display: 'none' }}
      />

      {/* Instruction shown during audio */}
      {!audioEnded && (
        <>
          <div style={{ fontSize: 48 }}>🎧</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Listen carefully</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 320 }}>
              You will hear a question or statement. Choose the most appropriate response.
            </p>
          </div>
          <AudioWaveAnimation />
          <p className="audio-label">Audio playing — do not select until finished</p>
        </>
      )}

      {/* Options appear AFTER audio ends */}
      {audioEnded && (
        <div style={{ width: '100%', maxWidth: 560, padding: '0 24px' }}>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
            Choose the most appropriate response:
          </p>
          <RadioOptionList options={options.slice(0, 4)} selected={selected} onSelect={onSelect} gap={18} fontSize={15} />
        </div>
      )}
    </div>
  );
}

function AudioWaveAnimation() {
  return (
    <div className="audio-wave">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="audio-wave__bar" style={{ height: 8 + Math.random() * 24 }} />
      ))}
    </div>
  );
}
