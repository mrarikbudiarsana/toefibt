'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCEFR, getWritingBand, getSpeakingBand, getReadingBand, getListeningBand } from '@/lib/scoring';

export default function SubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | submitted | graded

  useEffect(() => {
    const sb = createClient();
    sb.from('test_submissions')
      .select(`
        id, status, submitted_at, band_scores, ai_scores, student_id,
        test_assignments (
          student_id,
          tests (title)
        )
      `)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => { setSubmissions(data ?? []); setLoading(false); });
  }, []);

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter);

  return (
    <div className="dashboard">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Submissions</h1>
          <p className="page-subtitle">Review and grade student TOEFL iBT submissions.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'submitted', 'graded'].map(f => (
            <button
              key={f}
              className={`btn btn--sm ${filter === f ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading submissions</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>x</div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>No submissions</h2>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Submitted</th>
              <th>Reading</th>
              <th>Listening</th>
              <th>Writing</th>
              <th>Speaking</th>
              <th>Overall</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(sub => {
              const bands = sub.band_scores ?? {};
              const allBands = [bands.reading, bands.listening, bands.writing, bands.speaking].filter(b => b != null);
              const overall = allBands.length > 0
                ? (allBands.reduce((a, b) => a + b, 0) / allBands.length).toFixed(1)
                : null;

              return (
                <tr key={sub.id}>
                  <td style={{ fontWeight: 600 }}>{sub.test_assignments?.tests?.title ?? ''}</td>
                  <td>{new Date(sub.submitted_at).toLocaleDateString()}</td>
                  {['reading', 'listening', 'writing', 'speaking'].map(sec => (
                    <td key={sec}>
                      {bands[sec] != null ? (
                        <span style={{ fontWeight: 700, color: 'var(--teal)' }}>{bands[sec]}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}></span>
                      )}
                    </td>
                  ))}
                  <td>
                    {overall ? (
                      <span style={{ fontWeight: 800, color: 'var(--teal)', fontSize: 16 }}>{overall}</span>
                    ) : ''}
                  </td>
                  <td>
                    <span className={`badge ${sub.status === 'graded' ? 'badge--green' : sub.status === 'submitted' ? 'badge--teal' : 'badge--warn'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn--ghost btn--sm" onClick={() => router.push(`/admin/submissions/${sub.id}`)}>
                      Review  
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

