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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="must-answer-title">
      <div className="modal">
        <div className="modal__icon" aria-hidden="true">a</div>
        <h2 className="modal__title" id="must-answer-title">Must Answer</h2>
        <p className="modal__body">
          You must enter an answer before you can leave this question.
        </p>
        <button
          className="btn btn--primary btn--full"
          onClick={onReturn}
          autoFocus
        >
          Return to Question
        </button>
      </div>
    </div>
  );
}

