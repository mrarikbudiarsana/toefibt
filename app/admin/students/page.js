'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">All registered student accounts on the platform.</p>
        </div>
        <input
          className="input"
          style={{ width: 260 }}
          placeholder="Search by name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading students</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>x</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {search ? 'No students match your search.' : 'No students yet.'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Students appear here once they sign in to the platform.
          </p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Assignments</th>
              <th>Submitted</th>
              <th>Graded</th>
              <th>Actions</th>
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
                    {s.full_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unnamed</span>}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{s.email}</td>
                  <td style={{ fontSize: 13 }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700 }}>{assignments.length}</span>
                  </td>
                  <td>
                    {submitted > 0
                      ? <span className="badge badge--teal">{submitted}</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}></span>}
                  </td>
                  <td>
                    {graded > 0
                      ? <span className="badge badge--green">{graded}</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}></span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => router.push(`/admin/assign?studentId=${s.id}`)}
                      >
                        Assign Test
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => router.push(`/admin/submissions?studentId=${s.id}`)}
                      >
                        View Submissions
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        {filtered.length} student{filtered.length !== 1 ? 's' : ''} shown
        {search ? ` matching "${search}"` : ''}
      </p>
    </div>
  );
}

