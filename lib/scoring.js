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
  return BAND_TO_CEFR[Math.round(band)] ?? 'A1';
}

// ---------- Reading ----------
// Source: ETS Sample Test Answer Key (Jan 2026)
// Module 1: 35 total shown (20 scored + 15 unscored)
// Module 2: 15 scored
// Max raw = 35 (20 M1 + 15 M2)
const READING_BAND_TABLE = [
  { min: 33, band: 6 },
  { min: 28, band: 5 },
  { min: 22, band: 4 },
  { min: 16, band: 3 },
  { min: 9,  band: 2 },
  { min: 0,  band: 1 },
];

export function getReadingBand(raw) {
  for (const row of READING_BAND_TABLE) {
    if (raw >= row.min) return row.band;
  }
  return 1;
}

// ---------- Listening ----------
// Max raw = scored questions in both modules
const LISTENING_BAND_TABLE = [
  { minPct: 0.94, band: 6 },
  { minPct: 0.78, band: 5 },
  { minPct: 0.61, band: 4 },
  { minPct: 0.44, band: 3 },
  { minPct: 0.28, band: 2 },
  { minPct: 0,    band: 1 },
];

export function getListeningBand(raw, total) {
  if (!total) return 1;
  const pct = raw / total;
  for (const row of LISTENING_BAND_TABLE) {
    if (pct >= row.minPct) return row.band;
  }
  return 1;
}

// ---------- Writing ----------
// Two tasks: Write an Email (0–5) + Write for Academic Discussion (0–5)
// Average → convert to band
export function getWritingBand(emailScore, discussionScore) {
  const avg = ((emailScore ?? 0) + (discussionScore ?? 0)) / 2;
  if (avg >= 4.5) return 6;
  if (avg >= 3.5) return 5;
  if (avg >= 2.5) return 4;
  if (avg >= 1.5) return 3;
  if (avg >= 0.5) return 2;
  return 1;
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
