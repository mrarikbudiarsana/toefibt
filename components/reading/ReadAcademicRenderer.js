'use client';

import RadioOptionList from '@/components/shared/RadioOptionList';
import HighlightedText from '@/components/shared/HighlightedText';

function parseAcademicPassage(passage) {
  const nonEmptyLines = (passage || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (nonEmptyLines.length === 0) {
    return {
      title: '',
      paragraphs: [
        'Academic reading passage will appear here. This text would typically be 175-200 words drawn from history, science, social science, or business topics.',
      ],
    };
  }

  if (nonEmptyLines.length === 1) {
    return {
      title: '',
      paragraphs: nonEmptyLines,
    };
  }

  return {
    title: nonEmptyLines[0],
    paragraphs: nonEmptyLines.slice(1),
  };
}

export default function ReadAcademicRenderer({ passage = '', question, options = [], selected, onSelect, questionNumber, totalQuestions }) {
  const { title, paragraphs } = parseAcademicPassage(passage);
  const choices = (options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D']).slice(0, 4);

  return (
    <div className="split-layout" style={{ height: 'calc(100vh - 96px)', background: '#fff' }}>
      <div 
        className="split-pane split-pane--left"
        style={{
          background: '#fff',
          borderRight: '1px solid #eef2f6',
          padding: '60px 80px',
          overflowY: 'auto'
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          {title && (
            <h2 style={{ margin: '0 0 28px 0', fontSize: 28, lineHeight: 1.25, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>
              <HighlightedText text={title} />
            </h2>
          )}

          <div className="passage-text" style={{ fontSize: 17, lineHeight: 1.9, color: '#2d3748', fontFamily: 'var(--font-test)' }}>
            {paragraphs.map((paragraph, index) => (
              <p key={index} style={{ marginBottom: 24 }}>
                <HighlightedText text={paragraph} />
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="split-pane split-pane--right" style={{ background: '#f9fafb', padding: '60px 80px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '540px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', padding: '4px 10px', background: 'var(--teal-light)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Question {questionNumber}
            </span>
          </div>

          <p style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 36, lineHeight: 1.5 }}>
            {question ?? 'According to the passage, what is the main idea?'}
          </p>

          <RadioOptionList options={choices} selected={selected} onSelect={onSelect} gap={20} fontSize={16} />
        </div>
      </div>
    </div>
  );
}
