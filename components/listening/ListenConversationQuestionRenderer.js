'use client';

import RadioOptionList from '@/components/shared/RadioOptionList';
import { stripChoiceLabel } from '@/components/shared/choiceLabels';

export default function ListenConversationQuestionRenderer({
  speakerPhotoUrl,
  question,
  options = [],
  selected,
  onSelect,
}) {
  const choices = (options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D'])
    .slice(0, 4)
    .map(stripChoiceLabel);

  return (
    <div style={{ 
      minHeight: 'calc(100vh - var(--navbar-height) - var(--subbar-height))', 
      background: '#ffffff', 
      padding: '40px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: 1040 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.25fr', gap: 60, alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {speakerPhotoUrl ? (
              <img
                src={speakerPhotoUrl}
                alt="Conversation speakers"
                style={{ width: 340, maxWidth: '100%', height: 'auto', maxHeight: 440, objectFit: 'contain' }}
              />
            ) : (
              <div style={{ width: 340, height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 22, background: '#f8fafc', borderRadius: 16 }}>
                Conversation
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.45, color: '#000', marginBottom: 24, letterSpacing: '-0.01em' }}>
              {question?.trim() || 'What is the main point of the conversation?'}
            </div>
            <RadioOptionList options={choices} selected={selected} onSelect={onSelect} gap={16} fontSize={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
