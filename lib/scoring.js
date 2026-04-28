/**
 * TOEFL iBT Scoring — January 2026 Format
 * Scale: 1–6 bands (CEFR-aligned)
 *
 * Reading:  Raw 0–35 → Band 1–6
 * Listening: Raw 0–(module total) → Band 1–6
 * Writing:  Rubric 0–5 per task → Band 1–6
 * Speaking: Rubric 0–5 per task → Band 1–6
 */

// ---------- CEFR Map ----------
export const BAND_TO_CEFR = {
  6: 'C2',
  5: 'C1',
  4: 'B2',
  3: 'B1',
  2: 'A2',
  1: 'A1',
};

export function getCEFR(band) {
  const score = Number(band);
  if (score >= 6) return 'C2';
  if (score >= 5) return 'C1';
  if (score >= 4) return 'B2';
  if (score >= 3) return 'B1';
  if (score >= 2) return 'A2';
  return 'A1';
}

// ---------- Reading ----------
// Source: Reading Practice Section Scale Score Conversion Table
// Raw 0-35 -> Scale Score 1-6, including half-band scores.
const READING_SCALE_TABLE = {
  35: 6,
  34: 6,
  33: 5.5,
  32: 5.5,
  31: 5,
  30: 5,
  29: 5,
  28: 5,
  27: 4.5,
  26: 4.5,
  25: 4.5,
  24: 4,
  23: 4,
  22: 4,
  21: 4,
  20: 4,
  19: 4,
  18: 4,
  17: 3.5,
  16: 3.5,
  15: 3.5,
  14: 3.5,
  13: 3.5,
  12: 3.5,
  11: 3,
  10: 3,
  9: 3,
  8: 3,
  7: 2.5,
  6: 2,
  5: 1,
  4: 1,
  3: 1,
  2: 1,
  1: 1,
  0: 1,
};

export function getReadingBand(raw) {
  const normalizedRaw = Math.max(0, Math.min(35, Math.trunc(Number(raw) || 0)));
  return READING_SCALE_TABLE[normalizedRaw] ?? 1;
}

// ---------- Listening ----------
// Source: Listening Practice Section Scale Score Conversion Table
// Raw 0-35 -> Scale Score 1-6, including half-band scores.
const LISTENING_SCALE_TABLE = {
  35: 6,
  34: 6,
  33: 5.5,
  32: 5.5,
  31: 5,
  30: 5,
  29: 5,
  28: 4.5,
  27: 4.5,
  26: 4.5,
  25: 4.5,
  24: 4,
  23: 4,
  22: 3.5,
  21: 3.5,
  20: 3.5,
  19: 3.5,
  18: 3.5,
  17: 3,
  16: 3,
  15: 3,
  14: 3,
  13: 3,
  12: 2.5,
  11: 2.5,
  10: 2,
  9: 2,
  8: 2,
  7: 1.5,
  6: 1.5,
  5: 1,
  4: 1,
  3: 1,
  2: 1,
  1: 1,
  0: 1,
};

export function getListeningBand(raw) {
  const normalizedRaw = Math.max(0, Math.min(35, Math.trunc(Number(raw) || 0)));
  return LISTENING_SCALE_TABLE[normalizedRaw] ?? 1;
}

// ---------- Writing ----------
// Two tasks: Write an Email (0–5) + Write for Academic Discussion (0–5)
// Average → convert to band
function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

export function getWritingBandFromTaskScores(taskScores) {
  const validScores = taskScores
    .map(task => ({
      score: Number(task?.score),
      maxScore: Number(task?.maxScore ?? 5),
    }))
    .filter(task => Number.isFinite(task.score) && Number.isFinite(task.maxScore) && task.maxScore > 0);

  if (validScores.length === 0) return 1;

  const earned = validScores.reduce((sum, task) => sum + Math.max(0, Math.min(task.score, task.maxScore)), 0);
  const possible = validScores.reduce((sum, task) => sum + task.maxScore, 0);
  const band = 1 + (earned / possible) * 5;

  return Math.max(1, Math.min(6, roundToHalf(band)));
}

export function getWritingBand(emailScore, discussionScore) {
  return getWritingBandFromTaskScores([
    { score: emailScore ?? 0, maxScore: 5 },
    { score: discussionScore ?? 0, maxScore: 5 },
  ]);
}

// ---------- Speaking ----------
// Two tasks: Listen and Repeat (0–5) + Take an Interview (0–5)
export function getSpeakingBand(repeatScore, interviewScore) {
  const avg = ((repeatScore ?? 0) + (interviewScore ?? 0)) / 2;
  if (avg >= 4.5) return 6;
  if (avg >= 3.5) return 5;
  if (avg >= 2.5) return 4;
  if (avg >= 1.5) return 3;
  if (avg >= 0.5) return 2;
  return 1;
}

export function getSpeakingBandFromTaskScores(taskScores) {
  return getWritingBandFromTaskScores(taskScores);
}

// ---------- Overall ----------
export function getOverallBand(readingBand, listeningBand, writingBand, speakingBand) {
  const avg = (readingBand + listeningBand + writingBand + speakingBand) / 4;
  return Math.round(avg * 10) / 10; // one decimal
}

// ---------- Legacy dual scale (2026–2028 transition) ----------
// Approximate 0–120 equivalent for each band
const BAND_TO_120 = {
  6: '114–120',
  5: '94–113',
  4: '72–93',
  3: '42–71',
  2: '18–41',
  1: '0–17',
};

export function getBand120Range(band) {
  return BAND_TO_120[Math.round(band)] ?? '0–17';
}
