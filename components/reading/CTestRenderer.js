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
export default function CTestRenderer({ passage = '', blanks = [], answers = {}, onAnswer, questionRange = [1, 10], totalScored = 20 }) {
  // Split passage into parts — text nodes and blank nodes
  const parts = parsePassage(passage, blanks);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 800, margin: '0 auto' }}>
      <div className="split-pane__label" style={{ marginBottom: 20 }}>
        Questions {questionRange[0]}–{questionRange[1]} of {totalScored}
      </div>

      <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <strong>Directions:</strong> Read the following text. Some words have had their endings removed. 
        Type the missing letters or word parts in each blank to complete the word.
      </div>

      <div className="ctest-text">
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return <span key={i}>{part.content}</span>;
          }
          const blankId = part.blank.id;
          const val = answers[blankId] ?? '';
          return (
            <input
              key={i}
              type="text"
              className={`ctest-blank ${val ? 'filled' : ''}`}
              value={val}
              onChange={e => onAnswer(blankId, e.target.value)}
              style={{ width: Math.max(60, (part.blank.answer?.length ?? 4) * 12) + 'px' }}
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

function parsePassage(passage, blanks) {
  if (!blanks || blanks.length === 0) return [{ type: 'text', content: passage }];

  // Build sorted positions
  const sorted = [...blanks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const parts = [];
  let cursor = 0;

  for (const blank of sorted) {
    const pos = blank.position ?? 0;
    const len = blank.blank_length ?? 5; // characters replaced
    if (pos > cursor) {
      parts.push({ type: 'text', content: passage.slice(cursor, pos) });
    }
    parts.push({ type: 'blank', blank });
    cursor = pos + len;
  }

  if (cursor < passage.length) {
    parts.push({ type: 'text', content: passage.slice(cursor) });
  }

  return parts;
}
