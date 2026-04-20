'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const STATUS_LABEL = {
  in_progress: { text: 'In Progress', cls: 'badge--warn' },
  submitted: { text: 'Submitted', cls: 'badge--teal' },
  graded: { text: 'Graded', cls: 'badge--green' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/'); return; }
      setUser(data.user);
      loadAssignments(supabase, data.user.id);
    });
  }, []);

  async function loadAssignments(supabase, userId) {
    setLoading(true);
    try {
      // Get assignments for this student
      const { data: assigns } = await supabase
        .from('test_assignments')
        .select(`
          id, available_from, due_at,
          tests (id, title, section_order),
          test_submissions (id, status, submitted_at, band_scores)
        `)
        .eq('student_id', userId)
        .order('created_at', { ascending: false });

      setAssignments(assigns ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  function getStatusInfo(assignment) {
    const subs = assignment.test_submissions ?? [];
    if (subs.length === 0) return { text: 'Not started', cls: 'badge--teal' };
    const latest = subs[subs.length - 1];
    return STATUS_LABEL[latest.status] ?? { text: latest.status, cls: 'badge--teal' };
  }

  function canTake(assignment) {
    const now = new Date();
    if (assignment.available_from && new Date(assignment.available_from) > now) return false;
    if (assignment.due_at && new Date(assignment.due_at) < now) return false;
    const subs = assignment.test_submissions ?? [];
    const hasGraded = subs.some(s => s.status === 'graded');
    return !hasGraded;
  }

  const name = user?.user_metadata?.name ?? user?.email ?? 'Student';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <header style={{
        background: 'var(--teal)',
        color: '#fff',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <strong style={{ fontSize: 15 }}>TOEFL iBT</strong>
          <span style={{ opacity: 0.6, fontSize: 13 }}>English with Arik</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, opacity: 0.9 }}>{name}</span>
          <button className="ets-navbar__btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">My Tests</h1>
          <p className="page-subtitle">Your assigned TOEFL iBT mock tests. Complete by the due date.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Loading your tests
          </div>
        ) : assignments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 28, marginBottom: 16, fontWeight: 700 }}>Test</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No tests assigned yet</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Your instructor will assign a TOEFL iBT mock test when you are ready.
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Available</th>
                <th>Due</th>
                <th>Status</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => {
                const status = getStatusInfo(a);
                const takeable = canTake(a);
                const latestSub = (a.test_submissions ?? []).slice(-1)[0];
                const scores = latestSub?.band_scores;
                const overall = scores
                  ? (((scores.reading ?? 0) + (scores.listening ?? 0) + (scores.writing ?? 0) + (scores.speaking ?? 0)) / 4).toFixed(1)
                  : null;

                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {a.tests?.title ?? 'TOEFL iBT Mock Test'}
                    </td>
                    <td>{a.available_from ? new Date(a.available_from).toLocaleDateString() : ''}</td>
                    <td>{a.due_at ? new Date(a.due_at).toLocaleDateString() : ''}</td>
                    <td><span className={`badge ${status.cls}`}>{status.text}</span></td>
                    <td>
                      {overall ? (
                        <span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 16 }}>
                          {overall} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>/ 6</span>
                        </span>
                      ) : ''}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {takeable && (
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => router.push(`/test/${a.id}/check`)}
                          >
                            {(a.test_submissions ?? []).length > 0 ? 'Continue' : 'Start Test'}
                          </button>
                        )}
                        {latestSub?.status === 'graded' && (
                          <button
                            className="btn btn--outline btn--sm"
                            onClick={() => router.push(`/test/${a.id}/results`)}
                          >
                            View Results
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

