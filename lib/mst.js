/**
 * MST (Multistage Adaptive Testing) routing logic
 *
 * Reading:
 *   Module 1 = 35 shown (20 scored + 15 unscored)
 *   Threshold to Hard path: 13+ correct scored answers
 *   Hard Module 2: 10 C-test + 5 Academic Passage
 *   Easy Module 2: 10 C-test + 5 Daily Life
 *
 * Listening:
 *   Module 1 = 18 shown (some unscored)
 *   Threshold to Hard path: ≥ 70% of scored answers correct
 *   Hard Module 2: harder conversation/talk content
 *   Easy Module 2: simpler content
 */

/**
 * Determines which Reading Module 2 path the student gets.
 * @param {Object[]} module1Questions - Array of question objects with `is_scored` and `question_id`
 * @param {Object} answers - keyed by question_id → selected letter
 * @param {number} threshold - custom threshold (default 13)
 * @returns {'hard' | 'easy'}
 */
export function getReadingMSTPath(module1Questions, answers, threshold = 13) {
  const scored = module1Questions.filter(q => q.is_scored !== false);
  let correct = 0;
  scored.forEach(q => {
    if (q.task_type === 'c_test') {
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      let bIndex = 0;
      while ((match = regex.exec(q.prompt)) !== null) {
        const expected = match[1];
        const actual = answers[`${q.id}_b${bIndex}`];
        if (actual != null && isCorrect(actual, expected)) correct++;
        bIndex++;
      }
    } else {
      const answer = answers[q.id];
      if (answer != null && isCorrect(answer, q.correct_answer)) {
        correct++;
      }
    }
  });
  return correct >= threshold ? 'hard' : 'easy';
}

/**
 * Determines which Listening Module 2 path the student gets.
 * @param {Object[]} module1Questions
 * @param {Object} answers
 * @param {number} thresholdPct - 0–1 (default 0.70)
 * @returns {'hard' | 'easy'}
 */
export function getListeningMSTPath(module1Questions, answers, thresholdPct = 0.70) {
  const scored = module1Questions.filter(q => q.is_scored !== false);
  if (scored.length === 0) return 'easy';
  let correct = 0;
  scored.forEach(q => {
    const answer = answers[q.id];
    if (answer != null && isCorrect(answer, q.correct_answer)) {
      correct++;
    }
  });
  return (correct / scored.length) >= thresholdPct ? 'hard' : 'easy';
}

/**
 * Filter questions for a specific module and section.
 * @param {Object[]} questions - all questions for a test section
 * @param {'module1' | 'module2_easy' | 'module2_hard'} module
 * @returns {Object[]}
 */
export function getModuleQuestions(questions, module) {
  return questions
    .filter(q => q.module === module)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

/**
 * Compute raw score from answered questions (scored only).
 * @param {Object[]} questions
 * @param {Object} answers  keyed by question_id
 * @returns {{ raw: number, total: number }}
 */
export function computeRawScore(questions, answers) {
  const scored = questions.filter(q => q.is_scored !== false);
  let raw = 0;
  let total = 0;
  scored.forEach(q => {
    if (q.task_type === 'c_test') {
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      let bIndex = 0;
      while ((match = regex.exec(q.prompt)) !== null) {
        total++;
        const expected = match[1];
        const actual = answers[`${q.id}_b${bIndex}`];
        if (actual != null && isCorrect(actual, expected)) raw++;
        bIndex++;
      }
    } else {
      total++;
      const answer = answers[q.id];
      if (answer != null && isCorrect(answer, q.correct_answer)) raw++;
    }
  });
  return { raw, total };
}

// ---- helpers ----
function isCorrect(answer, correct) {
  if (answer == null || correct == null) return false;
  if (typeof correct === 'string' && correct.startsWith('[')) {
    try {
      const arr = JSON.parse(correct);
      if (Array.isArray(arr)) return arr.map(String).includes(String(answer).trim());
    } catch {}
  }
  return String(answer).trim() === String(correct).trim();
}
