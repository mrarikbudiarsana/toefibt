'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Inbox, Filter, ArrowRight, Search, FileText } from 'lucide-react';

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
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Submissions</h1>
          <p className="page-subtitle">Review and grade student TOEFL iBT submissions.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: '6px', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ padding: '0 8px', color: 'var(--text-muted)' }}>
            <Filter size={16} />
          </div>
          {['all', 'submitted', 'graded'].map(f => (
            <button
              key={f}
              className={`btn btn--sm ${filter === f ? 'btn--primary' : 'btn--ghost'}`}
              style={{ border: 'none', borderRadius: 8 }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--teal-light)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading submissions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card glass-card" style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: '50%', 
            background: 'var(--bg)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Inbox size={40} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>No submissions found</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 4 }}>
              {filter === 'all' ? "Students haven't submitted any tests yet." : `No submissions found with status "${filter}".`}
            </p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table className="table" style={{ border: 'none', borderRadius: 0 }}>
            <thead>
              <tr>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Test Title</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Submitted</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Scores (R/L/W/S)</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Overall</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
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
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sub.test_assignments?.tests?.title ?? 'Untitled Test'}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {new Date(sub.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['reading', 'listening', 'writing', 'speaking'].map(sec => (
                          <div key={sec} style={{ 
                            fontSize: 12, fontWeight: 600, padding: '2px 6px',
                            background: bands[sec] != null ? 'var(--bg)' : 'transparent',
                            borderRadius: 4, color: bands[sec] != null ? 'var(--teal)' : 'var(--text-muted)'
                          }}>
                            {bands[sec] ?? '-'}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      {overall ? (
                        <span style={{ fontWeight: 800, color: 'var(--teal)', fontSize: 16 }}>{overall}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${sub.status === 'graded' ? 'badge--green' : sub.status === 'submitted' ? 'badge--teal' : 'badge--warn'}`}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => router.push(`/admin/submissions/${sub.id}`)} style={{ gap: 6 }}>
                        Review <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );
}

