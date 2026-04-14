'use client';

/**
 * C-Test Renderer
 * Task: Read a passage with every second half of every second word removed.
 * Student types in the blanks inline within the text.
 *
 * Counter format: "Questions 1–10 of 20" (range, confirmed from ETS screenshots)
 *
 * Props:
 *   passage: string — text with ___ placeholders for blanks
 *   blanks: [{id, position, answer}] — blank metadata
 *   answers: {[blankId]: string}
 *   onAnswer: (blankId, value) => void
 *   questionRange: [start, end] — for counter display
 *   totalScored: number
 */
export default function CTestRenderer({ qId, passage = '', instruction, answers = {}, onAnswer, questionRange = [1, 10], totalScored = 20 }) {
  // Split passage into parts — text nodes and blank nodes based on {{answer}}
  const parts = parsePassage(passage);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#000', margin: '0 0 4px 0', letterSpacing: '-0.02em', whiteSpace: 'pre-wrap' }}>
          {instruction || 'Fill in the missing letters in the paragraph.'}
        </h2>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#000', margin: 0, letterSpacing: '-0.02em' }}>
          (Questions {questionRange[0]}-{questionRange[1]})
        </h2>
      </div>

      <div className="ctest-text">
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return <span key={i}>{part.content}</span>;
          }
          const blankKey = `${qId}_${part.blank.id}`;
          const val = answers[blankKey] ?? '';
          return (
            <input
              key={i}
              type="text"
              className={`ctest-blank ${val ? 'filled' : ''}`}
              value={val}
              onChange={e => onAnswer(blankKey, e.target.value)}
              style={{ width: Math.max(60, (part.blank.len ?? 4) * 12) + 'px' }}
              aria-label={`Blank ${i + 1}`}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          );
        })}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
        Tip: Type only the missing part of the word, not the whole word.
      </p>
    </div>
  );
}

function parsePassage(passage) {
  if (!passage) return [];
  const regex = /\{\{([^}]+)\}\}/g;
  const parts = [];
  let cursor = 0;
  let match;
  let blankIndex = 0;

  while ((match = regex.exec(passage)) !== null) {
    const start = match.index;
    const answerStr = match[1];

    if (start > cursor) {
      parts.push({ type: 'text', content: passage.slice(cursor, start) });
    }

    parts.push({ 
      type: 'blank', 
      blank: { id: `b${blankIndex}`, answer: answerStr, len: answerStr.length } 
    });

    blankIndex++;
    cursor = regex.lastIndex;
  }

  if (cursor < passage.length) {
    parts.push({ type: 'text', content: passage.slice(cursor) });
  }

  return parts;
}
