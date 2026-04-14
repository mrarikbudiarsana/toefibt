'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  getReadingBand, getListeningBand, getWritingBand, getSpeakingBand,
  getOverallBand, getCEFR, getBand120Range
} from '@/lib/scoring';

const SECTION_ICONS = { reading: '📖', listening: '🎧', writing: '✍️', speaking: '🗣️' };

export default function SubmissionReviewPage() {
  const { submissionId } = useParams();
  const router = useRouter();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiScoring, setAiScoring] = useState(false);
  const [manualBands, setManualBands] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const sb = createClient();
    sb.from('test_submissions')
      .select(`
        *,
        test_assignments (
          tests (title, test_sections (
            section_type,
            test_questions (id, task_type, prompt, correct_answer, is_scored)
          ))
        )
      `)
      .eq('id', submissionId)
      .single()
      .then(({ data }) => {
        setSub(data);
        if (data?.band_scores) setManualBands(data.band_scores);
        setLoading(false);
      });
  }, [submissionId]);

  async function runAIScoring() {
    if (!sub) return;
    setAiScoring(true);
    try {
      const writing = sub.writing_responses ?? {};
      const speaking = sub.speaking_recording_urls ?? {};
      const aiResults = {};

      // Score writing tasks
      for (const [qId, response] of Object.entries(writing)) {
        if (!response?.trim()) continue;
        // Find question
        const sections = sub.test_assignments?.tests?.test_sections ?? [];
        let taskType = 'write_discussion';
        let prompt = '';
        for (const sec of sections) {
          const q = (sec.test_questions ?? []).find(q => q.id === qId);
          if (q) { taskType = q.task_type; prompt = q.prompt; break; }
        }
        const res = await fetch('/api/score-writing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: qId, taskType, prompt, response }),
        });
        const data = await res.json();
        aiResults[qId] = { type: 'writing', ...data };
      }

      // Score speaking tasks
      for (const [qId, audioUrl] of Object.entries(speaking)) {
        if (!audioUrl) continue;
        const sections = sub.test_assignments?.tests?.test_sections ?? [];
        let taskType = 'take_interview';
        let prompt = '';
        for (const sec of sections) {
          const q = (sec.test_questions ?? []).find(q => q.id === qId);
          if (q) { taskType = q.task_type; prompt = q.prompt; break; }
        }
        const res = await fetch('/api/score-speaking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: qId, taskType, prompt, audioUrl }),
        });
        const data = await res.json();
        aiResults[qId] = { type: 'speaking', ...data };
      }

      // Compute band scores from AI
      const writingScores = Object.values(aiResults).filter(r => r.type === 'writing').map(r => r.score ?? 0);
      const speakingScores = Object.values(aiResults).filter(r => r.type === 'speaking').map(r => r.score ?? 0);

      const newBands = { ...manualBands };
      if (writingScores.length >= 2) {
        newBands.writing = getWritingBand(writingScores[0], writingScores[1]);
      } else if (writingScores.length === 1) {
        newBands.writing = getWritingBand(writingScores[0], writingScores[0]);
      }
      if (speakingScores.length >= 2) {
        newBands.speaking = getSpeakingBand(speakingScores[0], speakingScores[1]);
      } else if (speakingScores.length === 1) {
        newBands.speaking = getSpeakingBand(speakingScores[0], speakingScores[0]);
      }

      setManualBands(newBands);

      // Save AI scores to DB
      const sb = createClient();
      await sb.from('test_submissions').update({
        ai_scores: aiResults,
        band_scores: newBands,
      }).eq('id', submissionId);

      setSub(prev => ({ ...prev, ai_scores: aiResults, band_scores: newBands }));
    } catch (err) {
      console.error(err);
    } finally {
      setAiScoring(false);
    }
  }

  async function handleSaveGrade() {
    setSaving(true);
    try {
      const allBands = Object.values(manualBands).filter(b => b != null);
      const overall = allBands.length > 0
        ? allBands.reduce((a, b) => a + b, 0) / allBands.length
        : null;

      const cefrLevels = {};
      for (const [sec, band] of Object.entries(manualBands)) {
        cefrLevels[sec] = getCEFR(band);
      }

      const sb = createClient();
      await sb.from('test_submissions').update({
        band_scores: manualBands,
        cefr_levels: cefrLevels,
        status: 'graded',
        grade_released: true,
      }).eq('id', submissionId);

      setSuccess('Grades saved and released to student!');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading submission…</div>;
  if (!sub) return <div style={{ padding: 40, color: 'var(--danger)' }}>Submission not found.</div>;

  const answers = sub.answers_json ?? {};
  const writing = sub.writing_responses ?? {};
  const speaking = sub.speaking_recording_urls ?? {};
  const aiScores = sub.ai_scores ?? {};
  const bands = manualBands;
  const allBandValues = Object.values(bands).filter(b => b != null);
  const overall = allBandValues.length > 0
    ? (allBandValues.reduce((a, b) => a + b, 0) / allBandValues.length).toFixed(1)
    : null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => router.push('/admin/submissions')}>← Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{sub.test_assignments?.tests?.title ?? 'TOEFL iBT Submission'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Submitted: {new Date(sub.submitted_at).toLocaleString()} · Status: <strong>{sub.status}</strong>
          </p>
        </div>
        <button
          className="btn btn--outline"
          onClick={runAIScoring}
          disabled={aiScoring}
        >
          {aiScoring ? '⏳ Scoring with AI…' : '🤖 Run AI Scoring'}
        </button>
        <button className="btn btn--primary" onClick={handleSaveGrade} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save & Release Grade'}
        </button>
      </div>

      {success && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--success)', fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}

      {/* Band score editors */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Band Scores (1–6)</h2>
          {overall && (
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal)' }}>
              Overall: {overall} · CEFR {getCEFR(Math.round(parseFloat(overall)))}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {['reading', 'listening', 'writing', 'speaking'].map(sec => (
            <div key={sec}>
              <label className="label" htmlFor={`band-${sec}`}>
                {SECTION_ICONS[sec]} {sec.charAt(0).toUpperCase() + sec.slice(1)}
              </label>
              <select
                id={`band-${sec}`}
                className="input"
                value={bands[sec] ?? ''}
                onChange={e => setManualBands(prev => ({ ...prev, [sec]: e.target.value ? parseInt(e.target.value) : null }))}
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6].map(b => (
                  <option key={b} value={b}>{b} — {getCEFR(b)}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Writing responses */}
      {Object.keys(writing).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>✍️ Writing Responses</h2>
          {Object.entries(writing).map(([qId, response]) => {
            const ai = aiScores[qId];
            return (
              <div key={qId} style={{ marginBottom: 20, padding: '16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 8 }}>Question ID: {qId}</div>
                <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{response}</div>
                {ai && (
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--teal)' }}>AI Score: {ai.score}/5</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ai.feedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Speaking recordings */}
      {Object.keys(speaking).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🗣️ Speaking Recordings</h2>
          {Object.entries(speaking).map(([qId, url]) => {
            const ai = aiScores[qId];
            return (
              <div key={qId} style={{ marginBottom: 20, padding: '16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 8 }}>Question ID: {qId}</div>
                <audio controls src={url} style={{ width: '100%', marginBottom: 12 }} />
                {ai && (
                  <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--teal)', marginBottom: 6 }}>AI Score: {ai.score}/5</div>
                    {ai.transcript && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>
                        Transcript: "{ai.transcript}"
                      </div>
                    )}
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ai.feedback}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
