'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  ClipboardList, 
  Calendar, 
  CheckSquare, 
  UserPlus, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  Search,
  X
} from 'lucide-react';

export default function AssignPage() {
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [availableFrom, setAvailableFrom] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const selectedStudentSet = useMemo(() => new Set(selectedStudents), [selectedStudents]);
  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const filteredStudents = useMemo(() => {
    if (!normalizedStudentSearch) return students;

    return students.filter(student => {
      const name = student.full_name ?? '';
      const email = student.email ?? '';
      return `${name} ${email}`.toLowerCase().includes(normalizedStudentSearch);
    });
  }, [students, normalizedStudentSearch]);
  const visibleSelectedCount = filteredStudents.filter(student => selectedStudentSet.has(student.id)).length;
  const allVisibleSelected = filteredStudents.length > 0 && visibleSelectedCount === filteredStudents.length;

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

  function toggleVisibleStudents() {
    const visibleIds = filteredStudents.map(student => student.id);

    setSelectedStudents(prev => {
      if (allVisibleSelected) {
        return prev.filter(id => !visibleIds.includes(id));
      }

      return Array.from(new Set([...prev, ...visibleIds]));
    });
  }

  function clearSelectedStudents() {
    setSelectedStudents([]);
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
        <p className="page-subtitle">Choose a test, find the right students, and assign it in one batch.</p>
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

      <div className="assign-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Select Students</h2>
                <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
                  {selectedStudents.length} selected from {students.length} student{students.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {selectedStudents.length > 0 && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={clearSelectedStudents}
                style={{ borderRadius: 8, border: 'none', background: 'var(--bg)' }}
              >
                Clear
              </button>
            )}
          </div>

          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', border: '2px dashed var(--border)', borderRadius: 12 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No students found.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    value={studentSearch}
                    onChange={event => setStudentSearch(event.target.value)}
                    placeholder="Search by name or email"
                    style={{ borderRadius: 10, paddingLeft: 38, paddingRight: studentSearch ? 38 : 14 }}
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      aria-label="Clear search"
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 28,
                        height: 28,
                        border: 'none',
                        borderRadius: 6,
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={toggleVisibleStudents}
                  disabled={filteredStudents.length === 0}
                  style={{ borderRadius: 10 }}
                >
                  {allVisibleSelected ? 'Deselect Visible' : 'Select Visible'}
                </button>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '8px 2px 12px',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}>
                <span>
                  Showing {filteredStudents.length} of {students.length}
                </span>
                {normalizedStudentSearch && (
                  <span>
                    {visibleSelectedCount} selected in results
                  </span>
                )}
              </div>

              {filteredStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', border: '2px dashed var(--border)', borderRadius: 12 }}>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: 14 }}>No matching students</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Try a different name or email.</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: 6,
                  maxHeight: 480,
                  overflowY: 'auto',
                  paddingRight: 8,
                }}>
                  {filteredStudents.map(s => {
                    const sel = selectedStudentSet.has(s.id);
                    const displayName = s.full_name || 'Unnamed Student';

                    return (
                      <label
                        key={s.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '24px minmax(0, 1fr) 20px',
                          alignItems: 'center',
                          gap: 12,
                          minHeight: 64,
                          padding: '10px 12px',
                          borderRadius: 10,
                          cursor: 'pointer',
                          background: sel ? 'var(--teal-light)' : '#f8fafc',
                          border: `1px solid ${sel ? 'var(--teal)' : 'var(--border-light)'}`,
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleStudent(s.id)}
                          style={{ width: 18, height: 18, accentColor: 'var(--teal)', cursor: 'pointer' }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: sel ? 'var(--teal-dark)' : 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {displayName}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {s.email}
                          </div>
                        </div>
                        {sel ? <CheckSquare size={16} style={{ color: 'var(--teal)' }} /> : <span />}
                      </label>
                    );
                  })}
                </div>
              )}

              <div style={{
                marginTop: 14,
                padding: '10px 12px',
                borderRadius: 10,
                background: selectedStudents.length > 0 ? 'var(--teal-light)' : 'var(--bg)',
                color: selectedStudents.length > 0 ? 'var(--teal-dark)' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}>
                <span>{selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected</span>
                {selectedStudents.length > 0 && (
                  <span>{filteredStudents.length !== students.length ? `${visibleSelectedCount} visible` : 'Ready to assign'}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .assign-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
