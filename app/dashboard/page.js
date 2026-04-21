'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, 
  LogOut, 
  Clock, 
  GraduationCap, 
  ChevronRight, 
  Calendar,
  Layers,
  Award
} from 'lucide-react';

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
      const { data: assigns } = await supabase
        .from('test_assignments')
        .select(`
          id, available_from, due_at, created_at,
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
        background: '#111827',
        color: '#fff',
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, 
            background: 'var(--teal)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16
          }}>T</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: 14, letterSpacing: '0.02em' }}>TOEFL iBT</strong>
            <span style={{ opacity: 0.5, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Area</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <GraduationCap size={16} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user?.user_metadata?.role === 'admin' && (
              <button 
                onClick={() => router.push('/admin')}
                style={{ 
                  background: 'var(--teal)', border: 'none', 
                  color: '#fff', padding: '8px 16px', borderRadius: 8, 
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(13,115,119,0.3)'
                }}
              >
                Return to Admin
              </button>
            )}
            <button 
              onClick={handleLogout}
              style={{ 
                background: 'rgba(255,255,255,0.08)', border: 'none', 
                color: '#fff', padding: '8px 16px', borderRadius: 8, 
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard" style={{ maxWidth: 1000, padding: '40px 24px' }}>
        <div className="page-header" style={{ marginBottom: 40 }}>
          <h1 className="page-title" style={{ fontSize: 32, fontWeight: 800 }}>Welcome back, {name.split(' ')[0]}!</h1>
          <p className="page-subtitle" style={{ fontSize: 15, marginTop: 8 }}>You have {assignments.length} test{assignments.length !== 1 ? 's' : ''} assigned to your account.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--teal-light)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1.5s linear infinite', margin: '0 auto 20px' }}></div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading your personalized dashboard...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="card glass-card" style={{ textAlign: 'center', padding: '100px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ 
              width: 80, height: 80, borderRadius: '50%', 
              background: 'var(--bg)', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <BookOpen size={40} />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700 }}>No tests assigned yet</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>
                Your instructor will assign a TOEFL iBT mock test when you are ready to begin your practice.
              </p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 16, background: '#fff' }}>
            <table className="table" style={{ border: 'none', borderRadius: 0 }}>
              <thead>
                <tr>
                  <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', padding: '18px 24px' }}>Practice Test</th>
                  <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Deadlines</th>
                  <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Score</th>
                  <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', textAlign: 'right', padding: '18px 24px' }}>Actions</th>
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
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--teal-light)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Layers size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{a.tests?.title ?? 'TOEFL iBT Mock Test'}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Full Practice Exam</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${status.cls}`} style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>{status.text.toUpperCase()}</span></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                             <Calendar size={12} style={{ opacity: 0.5 }} />
                             {a.available_from ? new Date(a.available_from).toLocaleDateString() : 'Immediate'}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                             <Clock size={12} style={{ opacity: 0.8 }} />
                             {a.due_at ? new Date(a.due_at).toLocaleDateString() : 'No limit'}
                          </div>
                        </div>
                      </td>
                      <td>
                        {overall ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ 
                              width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--teal)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 800, color: 'var(--teal)'
                            }}>
                              {Math.round(overall)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weighted</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{overall} Avg</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>Pending</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '20px 24px' }}>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          {takeable && (
                            <button
                              className="btn btn--primary btn--sm"
                              onClick={() => router.push(`/test/${a.id}/check`)}
                              style={{ gap: 8, padding: '10px 20px', borderRadius: 10, boxShadow: '0 4px 12px rgba(13,115,119,0.2)' }}
                            >
                              {(a.test_submissions ?? []).length > 0 ? 'Resume' : 'Start Test'}
                              <ChevronRight size={16} />
                            </button>
                          )}
                          {latestSub?.status === 'graded' && (
                            <button
                              className="btn btn--outline btn--sm"
                              onClick={() => router.push(`/test/${a.id}/results`)}
                              style={{ gap: 8, padding: '10px 20px', borderRadius: 10 }}
                            >
                              <Award size={16} /> Results
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );
}

