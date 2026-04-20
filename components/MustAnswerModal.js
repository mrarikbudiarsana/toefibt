'use client';

/**
 * "Must Answer" modal  fires in Listening when Next is clicked without a selection.
 * Confirmed from ETS screenshots:
 * - Red triangle warning icon
 * - Text: "You must enter an answer before you can leave this question."
 * - Solid teal "Return to Question" button
 * - No Dismiss/Cancel option
 */
export default function MustAnswerModal({ onReturn }) {
  return (
    <div className="modal-overlay" style={{
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      background: 'rgba(0,0,0,0.4)',
      zIndex: 10000 
    }} role="dialog" aria-modal="true" aria-labelledby="must-answer-title">
      <div className="glass-card" style={{
        maxWidth: 400,
        padding: '40px 32px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{
          width: 64,
          height: 64,
          background: '#fee2e2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: '#ef4444'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        
        <h2 style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#1a1a2e',
          marginBottom: 12,
          letterSpacing: '-0.02em'
        }} id="must-answer-title">
          Must Answer
        </h2>
        
        <p style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 32
        }}>
          You must enter an answer before you can move to the next question.
        </p>
        
        <button
          className="btn-premium"
          style={{ width: '100%', padding: '16px' }}
          onClick={onReturn}
          autoFocus
        >
          Return to Question
        </button>
      </div>
    </div>
  );
}

