'use client';

/**
 * Read in Daily Life Renderer
 * Split layout: phone/document mockup on left, MCQ on right
 * Confirmed from ETS screenshots.
 */
export default function ReadDailyLifeRenderer({ passage = '', question, options = [], selected, onSelect, questionNumber, totalQuestions }) {
  return (
    <div className="split-layout">
      {/* Left — generic document/notice mockup */}
      <div className="split-pane split-pane--left">
        <div className="split-pane__label">Reading Document</div>

        {/* Generic Document Container */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '32px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          width: '100%',
          minHeight: 400,
          overflowX: 'auto',
          color: '#1f2937'
        }}>
          <div className="passage-text" style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>
            {passage || 'Sample daily life reading passage will appear here (e.g. schedule, flyer, email, or announcement).'}
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
