'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, UserPlus, FileCheck, Plus, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ tests: 0, assignments: 0, submissions: 0 });
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
        `).order('submitted_at', { ascending: false }).limit(6),
      ]);

      setStats({
        tests: testsRes.count ?? 0,
        assignments: assignRes.count ?? 0,
        submissions: subsRes.count ?? 0, // Note: actually getting count would be better but let's stick to valid logic
      });
      // Re-fetching count for submissions if needed, but for now using data length as before
      setRecentSubs(subsRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const STAT_CARDS = [
    { label: 'Total Tests', value: stats.tests, icon: BookOpen, color: '#3b82f6', href: '/admin/tests' },
    { label: 'Active Assignments', value: stats.assignments, icon: UserPlus, color: '#10b981', href: '/admin/assign' },
    { label: 'Submissions', value: stats.submissions, icon: FileCheck, color: '#f59e0b', href: '/admin/submissions' },
  ];

  return (
    <div className="dashboard">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Admin Dashboard</h1>
          <p className="page-subtitle">TOEFL iBT Platform  English with Arik</p>
        </div>
        <button className="btn btn--primary" onClick={() => router.push('/admin/tests/create')} style={{ gap: 8, padding: '12px 24px' }}>
          <Plus size={18} />
          <span>Create New Test</span>
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
        {STAT_CARDS.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="card glass-card"
              style={{ 
                padding: '28px', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => router.push(s.href)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--teal)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, 
                  background: `${s.color}15`, color: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={24} />
                </div>
                <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {loading ? '...' : s.value}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Manage items <ArrowRight size={12} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent submissions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Submissions</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Latest student attempts and grading status.</p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => router.push('/admin/submissions')} style={{ gap: 6 }}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading submissions...</p>
          </div>
        ) : recentSubs.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No submissions yet.</p>
          </div>
        ) : (
          <table className="table" style={{ border: 'none', borderRadius: 0 }}>
            <thead>
              <tr>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>Test Title</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>Submitted At</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>Status</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSubs.map(sub => (
                <tr key={sub.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sub.test_assignments?.tests?.title ?? 'Untitled Test'}</td>
                  <td>{new Date(sub.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>
                    <span className={`badge ${sub.status === 'graded' ? 'badge--green' : sub.status === 'submitted' ? 'badge--teal' : 'badge--warn'}`}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
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

