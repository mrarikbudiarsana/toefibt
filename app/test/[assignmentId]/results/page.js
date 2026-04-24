'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCEFR, getBand120Range } from '@/lib/scoring';

const SECTION_ICONS = { reading: 'R', listening: 'L', writing: 'W', speaking: 'S' };
const SECTION_LABELS = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

export default function ResultsPage() {
  const { assignmentId } = useParams();
  const router = useRouter();
  const [submission, setSubmission] = useState(null);
  const [testTitle, setTestTitle] = useState('TOEFL iBT Mock Test');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from('test_submissions')
        .select(`
          id, status, submitted_at,
          band_scores, cefr_levels, raw_scores, ai_scores,
          test_assignments (
            tests (title)
          )
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSubmission(data);
        setTestTitle(data.test_assignments?.tests?.title ?? 'TOEFL iBT Mock Test');
      }
      setLoading(false);
    })();
  }, [assignmentId]);

  if (loading) return <LoadingScreen />;
  if (!submission) return <NoResultsScreen router={router} />;

  // Parse scores
  const bands = submission.band_scores ?? {};
  const raw = submission.raw_scores ?? {};
  const ai = submission.ai_scores ?? {};

  const rBand = bands.reading ?? null;
  const lBand = bands.listening ?? null;
  const wBand = bands.writing ?? null;
  const sBand = bands.speaking ?? null;
  const allBands = [rBand, lBand, wBand, sBand].filter(b => b != null);
  const hasFullScore = submission.status === 'graded' && [rBand, lBand, wBand, sBand].every(b => b != null);
  const overallBand = hasFullScore
    ? (allBands.reduce((a, b) => a + b, 0) / allBands.length).toFixed(1)
    : null;
  const overallCEFR = overallBand ? getCEFR(Math.round(parseFloat(overallBand))) : null;

  const sections = ['reading', 'listening', 'writing', 'speaking'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <header style={{
        background: 'var(--teal)', color: '#fff',
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <strong style={{ fontSize: 15 }}>TOEFL iBT Score Report</strong>
        <button className="ets-navbar__btn" onClick={() => router.push('/dashboard')}>
            My Tests
        </button>
      </header>

      <div className="score-report">
        {/* Header */}
        <div className="score-report__header">
          <h1 className="score-report__title">{testTitle}</h1>
          <p className="score-report__subtitle">
            Submitted {new Date(submission.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            &nbsp;&middot;&nbsp;Status:&nbsp;<strong style={{ color: submission.status === 'graded' ? 'var(--success)' : 'var(--teal)' }}>{submission.status === 'graded' ? 'Graded' : 'Submitted'}</strong>
          </p>
        </div>

        {submission.status !== 'graded' && (
          <div
            className="card"
            style={{
              marginBottom: 24,
              border: '1px solid rgba(13, 115, 119, 0.28)',
              background: '#ecfeff',
              color: '#0f172a',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)', marginBottom: 6 }}>
              Unofficial Scores Available
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
              Your unofficial Reading and Listening scores are shown below. Your full score report, including Writing and Speaking, will be available in three days. Please monitor your dashboard for the released scores.
            </p>
          </div>
        )}

        {/* Overall score */}
        {overallBand && (
          <div className="score-overall">
            <div className="score-overall__label">Overall Score</div>
            <div className="score-overall__value">{overallBand}</div>
            <div className="score-overall__cefr">CEFR Level: {overallCEFR}</div>
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
              0-120 equivalent: {getBand120Range(Math.round(parseFloat(overallBand)))}
              &nbsp;&middot;&nbsp;Scale transitioning to 1-6 bands (2026-2028)
            </div>
          </div>
        )}

        {/* Section scores */}
        <div className="score-grid">
          {sections.map(sec => {
            const band = bands[sec];
            if (band == null) return null;
            const cefr = getCEFR(band);
            const rawData = raw[sec];
            const aiData = ai[sec];
            const isUnofficial = submission.status !== 'graded' && (sec === 'reading' || sec === 'listening');

            return (
              <div key={sec} className="score-card">
                <div className="score-card__label">
                  {SECTION_ICONS[sec]} {SECTION_LABELS[sec]}
                </div>
                <div className="score-card__band">{band}</div>
                <div className="score-card__cefr">
                  CEFR {cefr}{isUnofficial ? ' - Unofficial' : ''}
                </div>
                {rawData && (
                  <div className="score-card__raw">
                    Raw score: {rawData.raw} / {rawData.total}
                  </div>
                )}
                {getBand120Range(band) && (
                  <div className="score-card__raw" style={{ marginTop: 4 }}>
                    0-120: {getBand120Range(band)}
                  </div>
                )}
                {/* AI feedback snippet */}
                {aiData?.feedback && (
                  <div style={{
                    marginTop: 12, padding: '10px 12px',
                    background: 'var(--bg)', borderRadius: 8,
                    fontSize: 13, color: 'var(--text-secondary)',
                    textAlign: 'left', lineHeight: 1.6,
                    border: '1px solid var(--border-light)',
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Feedback</div>
                    {aiData.feedback}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CEFR Reference table */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text-primary)' }}>
            Score Scale Reference
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Band</th>
                  <th>CEFR Level</th>
                  <th>0-120 Equivalent</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [6, 'C2', '114-120', 'Mastery / Proficiency'],
                  [5, 'C1', '94-113', 'Advanced'],
                  [4, 'B2', '72-93', 'Upper Intermediate'],
                  [3, 'B1', '42-71', 'Intermediate'],
                  [2, 'A2', '18-41', 'Elementary'],
                  [1, 'A1', '0-17', 'Beginner'],
                ].map(([band, cefr, scale, desc]) => (
                  <tr key={band} style={{
                    background: overallBand && Math.round(parseFloat(overallBand)) === band
                      ? 'var(--teal-light)' : undefined,
                  }}>
                    <td style={{ fontWeight: 800, fontSize: 18, color: 'var(--teal)' }}>{band}</td>
                    <td style={{ fontWeight: 700 }}>{cefr}</td>
                    <td>{scale}</td>
                    <td>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            * During the 2026-2028 transition period, ETS reports both the 1-6 band scale and the legacy 0-120 scale.
            After 2028, only the 1-6 band scale will be reported.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn--primary" onClick={() => router.push('/dashboard')}>
            Back to My Tests
          </button>
          <button className="btn btn--ghost" onClick={() => window.print()}>
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)' }}>
      Loading your results
    </div>
  );
}

function NoResultsScreen({ router }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>Info</div>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>No results yet</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your score report will appear here once graded.</p>
      <button className="btn btn--primary" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
    </div>
  );
}

