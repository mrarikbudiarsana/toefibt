'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.from('tests')
      .select('id, title, created_at, test_sections(id)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTests(data ?? []); setLoading(false); });
  }, []);

  async function deleteTest(id) {
    if (!confirm('Delete this test? This cannot be undone.')) return;
    const sb = createClient();
    await sb.from('tests').delete().eq('id', id);
    setTests(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="dashboard">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Tests</h1>
          <p className="page-subtitle">Manage TOEFL iBT mock tests and question banks.</p>
        </div>
        <button className="btn btn--primary" onClick={() => router.push('/admin/tests/create')}>
          + Create Test
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading tests</p>
      ) : tests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>x</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No tests yet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Create your first TOEFL iBT mock test.</p>
          <button className="btn btn--primary" onClick={() => router.push('/admin/tests/create')}>Create Test</button>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Sections</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</td>
                <td>{t.test_sections?.length ?? 0} sections</td>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => router.push(`/admin/tests/${t.id}/edit`)}>
                      Edit
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => router.push(`/admin/assign?testId=${t.id}`)}>
                      Assign
                    </button>
                    <button className="btn btn--sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #fca5a5' }} onClick={() => deleteTest(t.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

