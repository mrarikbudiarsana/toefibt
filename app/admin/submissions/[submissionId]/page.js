'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  getReadingBand, getListeningBand, getWritingBandFromTaskScores, getSpeakingBandFromTaskScores,
  getOverallBand, getCEFR, getBand120Range
} from '@/lib/scoring';

const SECTION_ICONS = { reading: 'R', listening: 'L', writing: 'W', speaking: 'S' };
const BAND_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

function normalizeBuildSentencePart(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function parseBuildSentenceAnswer(value) {
  if (Array.isArray(value)) return value.map(normalizeBuildSentencePart);
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(normalizeBuildSentencePart);
    } catch {}
  }
  return String(value ?? '')
    .split('|')
    .map(normalizeBuildSentencePart)
    .filter(Boolean);
}

function scoreBuildSentence(response, correctAnswer) {
  const actual = parseBuildSentenceAnswer(response);
  const expected = parseBuildSentenceAnswer(correctAnswer);
  const actualSentence = normalizeBuildSentencePart(actual.join(' '));
  const expectedSentence = normalizeBuildSentencePart(expected.join(' '));
  const isCorrect = Boolean(expectedSentence) &&
    (
      actualSentence === expectedSentence ||
      (
        actual.length === expected.length &&
        expected.every((part, index) => actual[index] === part)
      )
    );

  return {
    score: isCorrect ? 1 : 0,
    maxScore: 1,
    feedback: isCorrect
      ? 'Correct sentence order.'
      : 'Incorrect sentence order.',
    rubric: {
      scoring: 'Binary scoring: 1 point for the exact correct sentence, 0 points otherwise.',
    },
  };
}

export default function SubmissionReviewPage() {
  const { submissionId } = useParams();
  const router = useRouter();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiScoring, setAiScoring] = useState(false);
  const [manualBands, setManualBands] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [taskScores, setTaskScores] = useState({});

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
        
        const scores = data?.ai_scores || {};
        const writing = data?.writing_responses || {};
        const sections = data?.test_assignments?.tests?.test_sections || [];
        for (const [qId, response] of Object.entries(writing)) {
          if (scores[qId]) continue;
          
          let question = null;
          for (const sec of sections) {
            const q = (sec.test_questions || []).find(q => q.id === qId);
            if (q) { question = q; break; }
          }
          
          if (question?.task_type === 'build_sentence') {
            scores[qId] = {
              type: 'writing',
              taskType: 'build_sentence',
              ...scoreBuildSentence(response, question.correct_answer),
            };
          }
        }
        
        setTaskScores(scores);
        setLoading(false);
      });
  }, [submissionId]);

  useEffect(() => {
    if (loading) return;
    
    const writingScores = Object.values(taskScores)
      .filter(r => r.type === 'writing')
      .map(r => ({ score: r.score ?? 0, maxScore: r.maxScore ?? 5 }));
      
    const speakingScores = Object.values(taskScores)
      .filter(r => r.type === 'speaking')
      .map(r => ({ score: r.score ?? 0, maxScore: r.maxScore ?? 5 }));
      
    const newBands = { ...manualBands };
    if (writingScores.length > 0) {
      newBands.writing = getWritingBandFromTaskScores(writingScores);
    }
    if (speakingScores.length > 0) {
      newBands.speaking = getSpeakingBandFromTaskScores(speakingScores);
    }
    
    if (JSON.stringify(newBands) !== JSON.stringify(manualBands)) {
      setManualBands(newBands);
    }
  }, [taskScores]);

  async function runAIScoring() {
    if (!sub) return;
    setAiScoring(true);
    try {
      const writing = sub.writing_responses ?? {};
      const speaking = sub.speaking_recording_urls ?? {};
      const aiResults = { ...taskScores };

      for (const [qId, response] of Object.entries(writing)) {
        const sections = sub.test_assignments?.tests?.test_sections ?? [];
        let taskType = 'write_discussion';
        let prompt = '';
        let question = null;
        for (const sec of sections) {
          const q = (sec.test_questions ?? []).find(q => q.id === qId);
          if (q) { question = q; taskType = q.task_type; prompt = q.prompt; break; }
        }

        if (taskType === 'build_sentence') {
          aiResults[qId] = {
            type: 'writing',
            taskType,
            ...scoreBuildSentence(response, question?.correct_answer),
          };
          continue;
        }

        if (!String(response ?? '').trim()) {
          aiResults[qId] = {
            type: 'writing',
            taskType,
            score: 0,
            maxScore: 5,
            feedback: 'No response provided.',
            rubric: {},
          };
          continue;
        }

        const res = await fetch('/api/score-writing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: qId, taskType, prompt, response }),
        });
        const data = await res.json();
        aiResults[qId] = { type: 'writing', taskType, maxScore: 5, ...data };
      }

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
        aiResults[qId] = { type: 'speaking', taskType, maxScore: 5, ...data };
      }

      setTaskScores(aiResults);
      setAiScoring(false);
    } catch (err) {
      console.error(err);
      setAiScoring(false);
    }
  }

  async function handleSaveGrade() {
    setSaving(true);
    try {
      const cefrLevels = {};
      for (const [sec, band] of Object.entries(manualBands)) {
        cefrLevels[sec] = getCEFR(band);
      }

      const sb = createClient();
      await sb.from('test_submissions').update({
        band_scores: manualBands,
        cefr_levels: cefrLevels,
        ai_scores: taskScores,
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

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading submission</div>;
  if (!sub) return <div style={{ padding: 40, color: 'var(--danger)' }}>Submission not found.</div>;

  const writing = sub.writing_responses ?? {};
  const speaking = sub.speaking_recording_urls ?? {};
  const bands = manualBands;
  const allBandValues = Object.values(bands).filter(b => b != null);
  const overall = allBandValues.length > 0
    ? getOverallBand(bands.reading, bands.listening, bands.writing, bands.speaking).toFixed(1)
    : null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => router.push('/admin/submissions')}>Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{sub.test_assignments?.tests?.title ?? 'TOEFL iBT Submission'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Submitted: {new Date(sub.submitted_at).toLocaleString()} - Status: <strong>{sub.status}</strong>
          </p>
        </div>
        <button
          className="btn btn--outline"
          onClick={runAIScoring}
          disabled={aiScoring}
        >
          {aiScoring ? 'Scoring with AI' : 'Run AI Scoring'}
        </button>
        <button className="btn btn--primary" onClick={handleSaveGrade} disabled={saving}>
          {saving ? 'Saving' : 'Save & Release Grade'}
        </button>
      </div>

      {success && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--success)', fontWeight: 600 }}>
          {success}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Band Scores (1-6)</h2>
          {overall && (
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal)' }}>
              Overall: {overall} - CEFR {getCEFR(overall)}
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
                onChange={e => setManualBands(prev => ({ ...prev, [sec]: e.target.value ? parseFloat(e.target.value) : null }))}
              >
                <option value=""></option>
                {BAND_OPTIONS.map(b => (
                  <option key={b} value={b}>{b} - {getCEFR(b)}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(writing).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Writing Responses</h2>
          {Object.entries(writing).map(([qId, response]) => {
            const displayedResponse = Array.isArray(response) ? response.join(' | ') : response;
            return (
              <div key={qId} style={{ marginBottom: 20, padding: '16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 8 }}>Question ID: {qId}</div>
                <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{displayedResponse}</div>
                {taskScores[qId]?.taskType === 'build_sentence' && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, padding: '8px', background: 'rgba(5, 150, 105, 0.05)', borderRadius: 4 }}>
                    <strong>Correct Answer:</strong> {sub.test_assignments?.tests?.test_sections?.flatMap(s => s.test_questions || []).find(q => q.id === qId)?.correct_answer?.replace(/\[\[|\]\]/g, '')}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', borderRadius: 8, padding: '12px', border: '1px solid var(--border-light)' }}>
                  <div style={{ flexShrink: 0 }}>
                    <label className="label" style={{ marginBottom: 4, fontSize: 11 }}>Task Score</label>
                    <select
                      className="input"
                      style={{ width: 100, height: 38 }}
                      value={taskScores[qId]?.score ?? ''}
                      onChange={e => {
                        const val = e.target.value ? parseFloat(e.target.value) : 0;
                        setTaskScores(prev => ({
                          ...prev,
                          [qId]: {
                            ...prev[qId],
                            score: val,
                            maxScore: prev[qId]?.maxScore ?? 5,
                            type: 'writing'
                          }
                        }));
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  {taskScores[qId]?.feedback && (
                    <div style={{ flex: 1 }}>
                      <label className="label" style={{ marginBottom: 4, fontSize: 11 }}>AI Feedback</label>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{taskScores[qId].feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(speaking).length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Speaking Recordings</h2>
          {Object.entries(speaking).map(([qId, url]) => {
            const scoreData = taskScores[qId];
            return (
              <div key={qId} style={{ marginBottom: 20, padding: '16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', marginBottom: 8 }}>Question ID: {qId}</div>
                <audio controls src={url} style={{ width: '100%', marginBottom: 12 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', borderRadius: 8, padding: '12px', border: '1px solid var(--border-light)' }}>
                  <div style={{ flexShrink: 0 }}>
                    <label className="label" style={{ marginBottom: 4, fontSize: 11 }}>Task Score</label>
                    <select
                      className="input"
                      style={{ width: 100, height: 38 }}
                      value={taskScores[qId]?.score ?? ''}
                      onChange={e => {
                        const val = e.target.value ? parseFloat(e.target.value) : 0;
                        setTaskScores(prev => ({
                          ...prev,
                          [qId]: {
                            ...prev[qId],
                            score: val,
                            maxScore: prev[qId]?.maxScore ?? 5,
                            type: 'speaking'
                          }
                        }));
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    {scoreData?.transcript && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 4 }}>
                        Transcript: &quot;{scoreData.transcript}&quot;
                      </div>
                    )}
                    {scoreData?.feedback && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{scoreData.feedback}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
