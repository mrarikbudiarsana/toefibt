'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AssignPage() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [availableFrom, setAvailableFrom] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Pre-fill testId from query string
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('testId');
    if (tid) setSelectedTest(tid);

    const sb = createClient();
    Promise.all([
      sb.from('tests').select('id, title').order('created_at', { ascending: false }),
      sb.from('student_profiles').select('id, email, full_name').order('full_name'),
    ]).then(([testsRes, studentsRes]) => {
      setTests(testsRes.data ?? []);
      setStudents(studentsRes.data ?? []);
    });
  }, []);

  function toggleStudent(id) {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  async function handleAssign() {
    if (!selectedTest) { setError('Please select a test.'); return; }
    if (selectedStudents.length === 0) { setError('Please select at least one student.'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const sb = createClient();
      const rows = selectedStudents.map(sid => ({
        test_id: selectedTest,
        student_id: sid,
        available_from: availableFrom || null,
        due_at: dueAt || null,
      }));
      const { error: e } = await sb.from('test_assignments').insert(rows);
      if (e) throw e;
      setSuccess(`Successfully assigned test to ${selectedStudents.length} student(s).`);
      setSelectedStudents([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Assign Test</h1>
        <p className="page-subtitle">Assign a TOEFL iBT mock test to one or more students.</p>
      </div>

      {error && <div className="login-form__error" style={{ marginBottom: 20 }}>{error}</div>}
      {success && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--success)', fontWeight: 600 }}>
          ✓ {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: Test + dates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>1. Select Test</h2>
            <label className="label" htmlFor="test-select">Test</label>
            <select id="test-select" className="input" value={selectedTest} onChange={e => setSelectedTest(e.target.value)}>
              <option value="">— Choose a test —</option>
              {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>2. Set Availability</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label" htmlFor="avail-from">Available From (optional)</label>
                <input id="avail-from" type="datetime-local" className="input" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="due-at">Due Date (optional)</label>
                <input id="due-at" type="datetime-local" className="input" value={dueAt} onChange={e => setDueAt(e.target.value)} />
              </div>
            </div>
          </div>

          <button className="btn btn--primary btn--lg btn--full" onClick={handleAssign} disabled={saving}>
            {saving ? 'Assigning…' : `Assign to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Right: Student selection */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>3. Select Students</h2>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setSelectedStudents(prev => prev.length === students.length ? [] : students.map(s => s.id))}
            >
              {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {students.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No students found. Add students via the Students page.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
              {students.map(s => {
                const sel = selectedStudents.includes(s.id);
                return (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      borderRadius: 8, cursor: 'pointer',
                      background: sel ? 'var(--teal-light)' : 'transparent',
                      border: `1px solid ${sel ? '#a7d7d9' : 'transparent'}`,
                      transition: 'all 0.1s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleStudent(s.id)}
                      style={{ accentColor: 'var(--teal)', width: 16, height: 16 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.full_name ?? 'Unnamed Student'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
