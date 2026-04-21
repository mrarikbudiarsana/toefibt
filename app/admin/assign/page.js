'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  ClipboardList, 
  Users, 
  Calendar, 
  CheckSquare, 
  UserPlus, 
  Clock, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';

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
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('testId');
    if (tid) setSelectedTest(tid);
    
    const sid = params.get('studentId');
    if (sid) setSelectedStudents([sid]);

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
      <div className="page-header" style={{ marginBottom: 32 }}>
        <h1 className="page-title">Assign Test</h1>
        <p className="page-subtitle">Assign a TOEFL iBT mock test to one or more students.</p>
      </div>

      {error && (
        <div className="login-form__error" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          background: 'var(--success-bg)', border: '1px solid #86efac', 
          borderRadius: 12, padding: '16px', marginBottom: 24, 
          color: 'var(--success)', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
           <CheckCircle2 size={18} />
           {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* Left: Test + dates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Select Test</h2>
            </div>
            <label className="label" htmlFor="test-select" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClipboardList size={14} /> Available Tests
            </label>
            <select id="test-select" className="input" value={selectedTest} onChange={e => setSelectedTest(e.target.value)} style={{ borderRadius: 10 }}>
              <option value=""> Choose a test </option>
              {tests.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          <div className="card glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Set Schedule</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label" htmlFor="avail-from" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> Available From (optional)
                </label>
                <input id="avail-from" type="datetime-local" className="input" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} style={{ borderRadius: 10 }} />
              </div>
              <div>
                <label className="label" htmlFor="due-at" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> Due Date (optional)
                </label>
                <input id="due-at" type="datetime-local" className="input" value={dueAt} onChange={e => setDueAt(e.target.value)} style={{ borderRadius: 10 }} />
              </div>
            </div>
          </div>

          <button className="btn btn--primary btn--lg btn--full" onClick={handleAssign} disabled={saving} style={{ gap: 10, borderRadius: 12, height: 52 }}>
            <UserPlus size={20} />
            {saving ? 'Assigning...' : `Assign to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Right: Student selection */}
        <div className="card glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Select Students</h2>
            </div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setSelectedStudents(prev => prev.length === students.length ? [] : students.map(s => s.id))}
              style={{ borderRadius: 8, border: 'none', background: 'var(--bg)' }}
            >
              {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', border: '2px dashed var(--border)', borderRadius: 12 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No students found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 440, overflowY: 'auto', paddingRight: 8 }}>
              {students.map(s => {
                const sel = selectedStudents.includes(s.id);
                return (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                      borderRadius: 12, cursor: 'pointer',
                      background: sel ? 'var(--teal-light)' : 'var(--bg)',
                      border: `1px solid ${sel ? 'var(--teal)' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleStudent(s.id)}
                        style={{ width: 18, height: 18, accentColor: 'var(--teal)', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: sel ? 'var(--teal-dark)' : 'var(--text-primary)' }}>
                        {s.full_name ?? 'Unnamed Student'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                    </div>
                    {sel && <CheckSquare size={16} style={{ color: 'var(--teal)' }} />}
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
