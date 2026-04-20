'use client';

export default function CTestRenderer({ qId, passage = '', instruction, answers = {}, onAnswer, questionRange = [1, 10], totalQuestions }) {
  const parts = buildRenderableParts(parsePassage(passage));

  return (
    <div style={{ padding: '60px 32px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--teal)', padding: '4px 10px', background: 'var(--teal-light)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Questions {questionRange[0]}{questionRange[1]}
          </span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 8px 0', letterSpacing: '-0.01em', whiteSpace: 'pre-wrap' }}>
          {instruction || 'Fill in the missing letters in the paragraph.'}
        </h2>
      </div>

      <div className="ctest-text" style={{ fontSize: 18, lineHeight: 2.4, color: '#1a202c', fontFamily: 'var(--font-test)' }}>
        {parts.map((part, i) => {
          if (part.type === 'text') {
            return <span key={i}>{part.content}</span>;
          }

          const prefix = part.type === 'word_blank' ? part.prefix : '';
          const blankKey = `${qId}_${part.blank.id}`;
          const val = answers[blankKey] ?? '';
          const blankLength = Math.max(part.blank.len ?? 4, 1);
          const slotWidthPx = 18;

          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                margin: '0 6px 0 2px',
                verticalAlign: 'baseline',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: '#111', fontWeight: 600 }}>{prefix}</span>
              <input
                type="text"
                className={`ctest-blank ${val ? 'filled' : ''}`}
                value={val}
                onChange={e => {
                  const nextValue = e.target.value.replace(/[^A-Za-z]/g, '').slice(0, blankLength);
                  onAnswer(blankKey, nextValue);
                }}
                style={{
                  width: `${blankLength * slotWidthPx}px`,
                  '--ctest-slot-width': `${slotWidthPx}px`,
                  '--ctest-text-offset': blankLength === 1 ? '0px' : `calc((${slotWidthPx}px - 1ch) / 2)`,
                  '--ctest-letter-spacing': blankLength === 1 ? '0px' : `calc(${slotWidthPx}px - 1ch)`,
                  '--ctest-text-align': blankLength === 1 ? 'center' : 'left',
                }}
                aria-label={`Blank ${i + 1}`}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={blankLength}
                size={blankLength}
                placeholder=""
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

function buildRenderableParts(parts) {
  const rendered = [];

  for (const part of parts) {
    if (part.type === 'text') {
      rendered.push(part);
      continue;
    }

    const previous = rendered[rendered.length - 1];
    if (previous?.type === 'text') {
      const match = previous.content.match(/([A-Za-z]+)$/);
      if (match) {
        const prefix = match[1];
        previous.content = previous.content.slice(0, -prefix.length);
        if (!previous.content) {
          rendered.pop();
        }
        rendered.push({ type: 'word_blank', prefix, blank: part.blank });
        continue;
      }
    }

    rendered.push(part);
  }

  return rendered;
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
      blank: { id: `b${blankIndex}`, answer: answerStr, len: answerStr.length },
    });

    blankIndex += 1;
    cursor = regex.lastIndex;
  }

  if (cursor < passage.length) {
    parts.push({ type: 'text', content: passage.slice(cursor) });
  }

  return parts;
}
