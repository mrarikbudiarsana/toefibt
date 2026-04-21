'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users, Search, UserPlus, Mail, Calendar, ArrowRight, UserCheck } from 'lucide-react';

export default function AdminStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const sb = createClient();
    sb.from('student_profiles')
      .select(`
        id, email, full_name, created_at,
        test_assignments (
          id,
          test_submissions (id, status)
        )
      `)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setStudents(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.full_name ?? '').toLowerCase().includes(q) ||
      (s.email ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">All registered student accounts on the platform.</p>
        </div>
        <div style={{ position: 'relative', width: 300 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={16} />
          </div>
          <input
            className="input"
            style={{ paddingLeft: 36, width: '100%', borderRadius: 12 }}
            placeholder="Search by name or email"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--teal-light)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading students...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card glass-card" style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: '50%', 
            background: 'var(--bg)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {search ? <Search size={40} /> : <Users size={40} />}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {search ? 'No matches' : 'No students yet'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 4 }}>
              {search ? `Your search for "${search}" didn't return any results.` : 'Students will appear here once they register.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table className="table" style={{ border: 'none', borderRadius: 0 }}>
            <thead>
              <tr>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Student Name</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Email</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Joined Date</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Performance</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const assignments = s.test_assignments ?? [];
                const allSubs = assignments.flatMap(a => a.test_submissions ?? []);
                const submitted = allSubs.filter(sub => sub.status === 'submitted').length;
                const graded = allSubs.filter(sub => sub.status === 'graded').length;

                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '50%', 
                          background: 'var(--teal-light)', color: 'var(--teal)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700
                        }}>
                          {s.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        {s.full_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unnamed</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={12} style={{ opacity: 0.5 }} />
                        {s.email}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} style={{ opacity: 0.5 }} />
                        {s.created_at ? new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div title={`${assignments.length} Assignments`}>
                          <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>{assignments.length}A</span>
                        </div>
                        {submitted > 0 && <span className="badge badge--teal" title={`${submitted} Submitted`}>{submitted}S</span>}
                        {graded > 0 && <span className="badge badge--green" title={`${graded} Graded`}>{graded}G</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => router.push(`/admin/assign?studentId=${s.id}`)}
                          style={{ gap: 6 }}
                        >
                          <UserPlus size={14} /> Assign
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => router.push(`/admin/submissions?studentId=${s.id}`)}
                        >
                          Submissions
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <UserCheck size={14} />
        {filtered.length} student{filtered.length !== 1 ? 's' : ''} shown
        {search ? ` matching "${search}"` : ''}
      </p>
      <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );
}

