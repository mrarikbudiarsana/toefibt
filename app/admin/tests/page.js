'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ClipboardX, Plus, FileText, Trash2, Edit3, UserPlus, ArrowRight } from 'lucide-react';

export default function AdminTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.from('tests')
      .select('id, title, created_at, test_sections(id, test_questions(id, is_scored))')
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
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Tests</h1>
          <p className="page-subtitle">Manage TOEFL iBT mock tests and question banks.</p>
        </div>
        <button className="btn btn--primary" onClick={() => router.push('/admin/tests/create')} style={{ gap: 8 }}>
          <Plus size={18} />
          <span>Create Test</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid var(--teal-light)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="card glass-card" style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: '50%', 
            background: 'var(--bg)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ClipboardX size={40} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>No tests yet</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 4, marginBottom: 20 }}>
              Create your first TOEFL iBT mock test to get started.
            </p>
            <button className="btn btn--primary" onClick={() => router.push('/admin/tests/create')}>Create Test</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table className="table" style={{ border: 'none', borderRadius: 0 }}>
            <thead>
              <tr>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Title</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Composition</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}>Created</th>
                <th style={{ background: '#f8fafc', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={16} style={{ color: 'var(--teal)', opacity: 0.7 }} />
                      {t.title}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <span className="badge badge--ghost" style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b' }}>
                        {t.test_sections?.length ?? 0} Sections
                      </span>
                      {(() => {
                        const scored = t.test_sections?.reduce((acc, s) => acc + (s.test_questions?.filter(q => q.is_scored).length ?? 0), 0) ?? 0;
                        const unscored = t.test_sections?.reduce((acc, s) => acc + (s.test_questions?.filter(q => !q.is_scored).length ?? 0), 0) ?? 0;
                        return (
                          <>
                            <span className="badge badge--green" style={{ fontSize: 11 }}>
                              {scored} Scored
                            </span>
                            {unscored > 0 && (
                              <span className="badge badge--warn" style={{ fontSize: 11 }}>
                                {unscored} Unscored
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => router.push(`/admin/tests/${t.id}/edit`)} title="Edit Test">
                        <Edit3 size={14} />
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => router.push(`/admin/assign?testId=${t.id}`)} title="Assign Test">
                        <UserPlus size={14} />
                      </button>
                      <button className="btn btn--sm" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }} onClick={() => deleteTest(t.id)} title="Delete Test">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );
}

