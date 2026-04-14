'use client';

/**
 * Read Academic Passage Renderer
 * Split layout: scrollable passage left, question + MCQ right
 * ~200-word academic text from history/science/social science/business
 * Back button IS shown (only Reading section has Back)
 */
export default function ReadAcademicRenderer({ passage = '', question, options = [], selected, onSelect, questionNumber, totalQuestions }) {
  return (
    <div className="split-layout">
      {/* Left — passage */}
      <div className="split-pane split-pane--left">
        <div className="split-pane__label">Academic Passage</div>
        <div className="passage-text">
          {(passage || 'Academic reading passage will appear here. This text would typically be 175–200 words drawn from history, science, social science, or business topics.')
            .split('\n').map((para, i) => (
              <p key={i} style={{ marginBottom: 14 }}>{para}</p>
            ))}
        </div>
      </div>

      {/* Right — question */}
      <div className="split-pane split-pane--right">
        <div className="split-pane__label">
          Question {questionNumber} of {totalQuestions}
        </div>

        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, lineHeight: 1.55 }}>
          {question ?? 'According to the passage, what is the main idea?'}
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

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          You may use the Back button to return to a previous question in the Reading section.
        </p>
      </div>
    </div>
  );
}
