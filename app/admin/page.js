'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ tests: 0, assignments: 0, submissions: 0, students: 0 });
  const [recentSubs, setRecentSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const [testsRes, assignRes, subsRes] = await Promise.all([
        sb.from('tests').select('id', { count: 'exact', head: true }),
        sb.from('test_assignments').select('id', { count: 'exact', head: true }),
        sb.from('test_submissions').select(`
          id, status, submitted_at,
          test_assignments ( tests (title) )
        `).order('submitted_at', { ascending: false }).limit(8),
      ]);

      setStats({
        tests: testsRes.count ?? 0,
        assignments: assignRes.count ?? 0,
        submissions: subsRes.data?.length ?? 0,
      });
      setRecentSubs(subsRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const STAT_CARDS = [
    { label: 'Tests', value: stats.tests, icon: '📝', href: '/admin/tests' },
    { label: 'Assignments', value: stats.assignments, icon: '📋', href: '/admin/assign' },
    { label: 'Submissions', value: stats.submissions, icon: '📤', href: '/admin/submissions' },
  ];

  return (
    <div className="dashboard">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">TOEFL iBT Platform — English with Arik</p>
        </div>
        <button className="btn btn--primary" onClick={() => router.push('/admin/tests/create')}>
          + Create New Test
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {STAT_CARDS.map(s => (
          <div
            key={s.label}
            className="card"
            style={{ textAlign: 'center', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onClick={() => router.push(s.href)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,115,119,0.15)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--teal)' }}>
              {loading ? '…' : s.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent submissions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Submissions</h2>
          <button className="btn btn--ghost btn--sm" onClick={() => router.push('/admin/submissions')}>
            View all →
          </button>
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
        ) : recentSubs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No submissions yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentSubs.map(sub => (
                <tr key={sub.id}>
                  <td style={{ fontWeight: 600 }}>{sub.test_assignments?.tests?.title ?? '—'}</td>
                  <td>{new Date(sub.submitted_at).toLocaleDateString()}</td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
