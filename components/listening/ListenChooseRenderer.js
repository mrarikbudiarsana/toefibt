'use client';
import { useEffect, useRef } from 'react';
import RadioOptionList from '@/components/shared/RadioOptionList';

/**
 * Listen and Choose a Response
 * - Audio plays automatically
 * - Options remain visible while audio plays
 * - Optional speaker photo can be shown
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
export default function ListenChooseRenderer({ audioUrl, speakerPhotoUrl, options = [], selected, onSelect, onAudioEnd, audioEnded }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    audioRef.current.src = audioUrl;
    audioRef.current.play().catch(() => {
      // Auto-play blocked — mark as ended so user can proceed
      onAudioEnd?.();
    });
  }, [audioUrl, onAudioEnd]);

  return (
    <div className="audio-screen">
      <audio
        ref={audioRef}
        onEnded={onAudioEnd}
        preload="auto"
        style={{ display: 'none' }}
      />

      <div style={{ width: '100%', maxWidth: 700, padding: '24px 24px 16px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          {speakerPhotoUrl ? (
            <img
              src={speakerPhotoUrl}
              alt="Speaker"
              style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--teal)' }}
            />
          ) : (
            <div style={{ fontSize: 36 }}>🎧</div>
          )}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Listen and choose a response</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
              Audio and options are shown together.
            </p>
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border-light)', marginBottom: 18 }}>
          {!audioEnded ? (
            <>
              <AudioWaveAnimation />
              <p className="audio-label" style={{ marginTop: 8 }}>Audio playing...</p>
            </>
          ) : (
            <p className="audio-label" style={{ margin: 0 }}>Audio ended. You can still review your selected answer.</p>
          )}
        </div>

        <div style={{ width: '100%' }}>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
            Choose the most appropriate response:
          </p>
          <RadioOptionList options={(options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D']).slice(0, 4)} selected={selected} onSelect={onSelect} gap={18} fontSize={15} />
        </div>
      </div>
    </div>
  );
}

function AudioWaveAnimation() {
  const heights = [18, 26, 34, 24, 30];
  return (
    <div className="audio-wave">
      {heights.map((height, i) => (
        <div key={i} className="audio-wave__bar" style={{ height }} />
      ))}
    </div>
  );
}
