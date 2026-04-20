'use client';
import { useEffect, useRef, useState } from 'react';
import RadioOptionList from '@/components/shared/RadioOptionList';

/**
 * Shared audio-first renderer for:
 *   - Listen to a Conversation
 *   - Listen to an Announcement
 *   - Listen to an Academic Talk
 *
 * Architecture (confirmed from ETS screenshots):
 * 1. AUDIO SCREEN: Speaker photo only (large, centered), audio plays, no question visible
 * 2. After audio ends   QUESTION SCREEN: same speaker photo (smaller, left-aligned), question + MCQ
 *
 * No Back button. Audio plays ONE TIME only.
 *
 * Props:
 *   audioUrl: string
 *   speakerPhotoUrl: string | null
 *   taskType: 'listen_conversation' | 'listen_announcement' | 'listen_academic_talk'
 *   question: string
 *   options: string[]
 *   selected: string | null
 *   onSelect: (letter) => void
 *   questionNumber: number
 *   totalInGroup: number    how many Qs share this audio
 *   questionInGroup: number  which Q within this group (1-based)
 */
export default function ListenAudioFirstRenderer({
  audioUrl,
  speakerPhotoUrl,
  taskType = 'listen_conversation',
  question,
  options = [],
  selected,
  onSelect,
  questionNumber,
  totalInGroup = 1,
  questionInGroup = 1,
}) {
  const audioRef = useRef(null);
  const [phase, setPhase] = useState('audio'); // 'audio' | 'question'
  const [audioStatus, setAudioStatus] = useState('loading'); // loading | playing | ended | error

  const TASK_LABELS = {
    listen_conversation: 'Conversation',
    listen_announcement: 'Announcement',
    listen_academic_talk: 'Academic Talk',
  };
  const taskLabel = TASK_LABELS[taskType] ?? 'Listening';

  useEffect(() => {
    if (!audioRef.current) return;
    if (questionInGroup === 1) {
      // First question in group  play audio, then show question
      setPhase('audio');
      setAudioStatus('loading');
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.play()
          .then(() => setAudioStatus('playing'))
          .catch(() => {
            setAudioStatus('error');
            setPhase('question');
          });
      } else {
        setAudioStatus('ended');
        setPhase('question');
      }
    } else {
      // Subsequent questions for the same audio  go straight to question
      setPhase('question');
      setAudioStatus('ended');
    }
  }, [audioUrl, questionInGroup]);

  function handleAudioEnd() {
    setAudioStatus('ended');
    // Short pause before showing question (mimics ETS UX)
    setTimeout(() => setPhase('question'), 600);
  }

  //  AUDIO PHASE 
  if (phase === 'audio') {
    return (
      <div className="audio-screen">
        <audio
          ref={audioRef}
          preload="auto"
          onEnded={handleAudioEnd}
          onError={() => { setAudioStatus('error'); setPhase('question'); }}
          style={{ display: 'none' }}
        />

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal)', marginBottom: 8 }}>
          {taskLabel}
        </div>

        {/* Speaker photo */}
        {speakerPhotoUrl ? (
          <img
            src={speakerPhotoUrl}
            alt="Speaker"
            className="speaker-photo"
          />
        ) : (
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--teal-light), #a7d7d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 64, border: '4px solid var(--teal)',
          }}>
            x
          </div>
        )}

        {/* Status */}
        {audioStatus === 'loading' && <p className="audio-label">Preparing audio</p>}
        {audioStatus === 'playing' && (
          <>
            <div className="audio-wave">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="audio-wave__bar" />
              ))}
            </div>
            <p className="audio-label">Listening  answer choices will appear when audio ends</p>
          </>
        )}
        {audioStatus === 'error' && (
          <p style={{ color: 'var(--danger)', fontSize: 14 }}>
            Audio could not load. Proceeding to question
          </p>
        )}
      </div>
    );
  }

  //  QUESTION PHASE 
  return (
    <div style={{
      maxWidth: 720, margin: '0 auto', padding: '32px 32px',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Header row: small speaker photo + task label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {speakerPhotoUrl ? (
          <img src={speakerPhotoUrl} alt="Speaker" className="speaker-photo speaker-photo--sm" />
        ) : (
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--teal-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, flexShrink: 0,
            border: '2px solid var(--teal)',
          }}>x</div>
        )}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--teal)' }}>
            {taskLabel}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Question {questionNumber}
            {totalInGroup > 1 ? ` (${questionInGroup} of ${totalInGroup} for this audio)` : ''}
          </div>
        </div>
      </div>

      {/* Question */}
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55 }}>
        {question ?? 'What is the main topic of the conversation?'}
      </p>

      {/* MCQ options */}
      <RadioOptionList
        options={(options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D']).slice(0, 4)}
        selected={selected}
        onSelect={onSelect}
        gap={18}
        fontSize={15}
      />

    </div>
  );
}

