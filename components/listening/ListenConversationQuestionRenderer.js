'use client';

import RadioOptionList from '@/components/shared/RadioOptionList';

export default function ListenConversationQuestionRenderer({
  speakerPhotoUrl,
  question,
  options = [],
  selected,
  onSelect,
}) {
  const choices = (options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D'])
    .slice(0, 4)
    .map(option => String(option).replace(/^[A-D][\.\)\:\-\s]+/i, ''));

  return (
    <div style={{ minHeight: 'calc(100vh - var(--navbar-height) - var(--subbar-height))', background: '#ececec', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 1060, margin: '0 auto', paddingTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {speakerPhotoUrl ? (
              <img
                src={speakerPhotoUrl}
                alt="Conversation speakers"
                style={{ width: 340, maxWidth: '100%', height: 440, objectFit: 'contain', objectPosition: 'center top' }}
              />
            ) : (
              <div style={{ width: 340, height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 22 }}>
                Conversation
              </div>
            )}
          </div>

          <div style={{ paddingTop: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.45, color: '#111', marginBottom: 12 }}>
              {question?.trim() || 'What is the main point of the conversation?'}
            </div>
            <RadioOptionList options={choices} selected={selected} onSelect={onSelect} gap={14} fontSize={15} />
          </div>
        </div>
      </div>
    </div>
  );
}
