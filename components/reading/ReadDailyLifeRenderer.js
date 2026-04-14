'use client';

/**
 * Read in Daily Life Renderer
 * Split layout: phone/document mockup on left, MCQ on right
 * Confirmed from ETS screenshots.
 */
export default function ReadDailyLifeRenderer({ passage = '', question, options = [], selected, onSelect, questionNumber, totalQuestions }) {
  return (
    <div className="split-layout">
      {/* Left — phone/document mockup */}
      <div className="split-pane split-pane--left">
        <div className="split-pane__label">Reading Passage</div>

        {/* Phone mockup container */}
        <div style={{
          border: '3px solid #1f2937',
          borderRadius: 20,
          overflow: 'hidden',
          maxWidth: 340,
          margin: '0 auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>
          {/* Phone notch */}
          <div style={{ background: '#1f2937', padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 60, height: 6, background: '#374151', borderRadius: 3 }} />
          </div>
          {/* Phone screen */}
          <div style={{ background: '#fff', padding: '20px 18px', minHeight: 400 }}>
            {/* Simulated app bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 14 }}>✉</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Mail</div>
            </div>
            <div className="passage-text" style={{ fontSize: 13 }}>
              {passage || 'Sample daily life reading passage will appear here.'}
            </div>
          </div>
        </div>
      </div>

      {/* Right — MCQ */}
      <div className="split-pane split-pane--right">
        <div className="split-pane__label">
          Question {questionNumber} of {totalQuestions}
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, lineHeight: 1.55 }}>
          {question ?? 'What is the main purpose of this text?'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(options.length ? options : ['Option A', 'Option B', 'Option C', 'Option D'])
            .slice(0, 4)
            .map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = selected === letter;
              return (
                <button
                  key={letter}
                  className={`mcq-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelect(letter)}
                >
                  <span className="mcq-option__letter">{letter}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
