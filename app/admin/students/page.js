'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileCheck,
  Mail,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Needs test' },
  { value: 'submitted', label: 'Submitted' },
];

export default function AdminStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [unassigningId, setUnassigningId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  async function fetchStudents() {
    const sb = createClient();
    try {
      setError(null);
      const { data: studentsData, error: studentsError } = await sb
        .from('student_profiles')
        .select('id, email, full_name, created_at, role')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (studentsError) throw studentsError;

      const studentIds = (studentsData || []).map(s => s.id);
      if (studentIds.length === 0) {
        setStudents(studentsData ?? []);
        return;
      }

      const { data: assignData, error: assignError } = await sb
        .from('test_assignments')
        .select('id, student_id, available_from, due_at, tests(id, title), test_submissions(id, status)')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (assignError) {
        console.warn('Stats fetch error:', assignError);
        setStudents(studentsData ?? []);
      } else {
        const enriched = (studentsData || []).map(student => ({
          ...student,
          test_assignments: (assignData || []).filter(assignment => assignment.student_id === student.id)
        }));
        setStudents(enriched);
      }
    } catch (err) {
      console.error('Final fetch error:', err);
      setError(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  async function handleUnassign(student, assignment) {
    const testTitle = assignment.tests?.title ?? 'Untitled Test';
    const submissionCount = assignment.test_submissions?.length ?? 0;
    const warning = submissionCount > 0
      ? ` This assignment has ${submissionCount} submission${submissionCount !== 1 ? 's' : ''}; removing it will also remove related submission data.`
      : '';

    if (!window.confirm(`Unassign "${testTitle}" from ${student.full_name || student.email}?${warning}`)) return;

    setUnassigningId(assignment.id);
    setError(null);
    setSuccess('');

    try {
      const sb = createClient();
      const { error: deleteError } = await sb
        .from('test_assignments')
        .delete()
        .eq('id', assignment.id);

      if (deleteError) throw deleteError;

      setStudents(prev => prev.map(studentItem => (
        studentItem.id === student.id
          ? {
            ...studentItem,
            test_assignments: (studentItem.test_assignments ?? []).filter(assignmentItem => assignmentItem.id !== assignment.id)
          }
          : studentItem
      )));
      setSuccess(`Unassigned "${testTitle}" from ${student.full_name || student.email}.`);
    } catch (err) {
      setError(err.message || JSON.stringify(err));
    } finally {
      setUnassigningId(null);
    }
  }

  const stats = useMemo(() => {
    const assignments = students.flatMap(student => student.test_assignments ?? []);
    const submissions = assignments.flatMap(assignment => assignment.test_submissions ?? []);

    return {
      total: students.length,
      assigned: students.filter(student => (student.test_assignments ?? []).length > 0).length,
      unassigned: students.filter(student => (student.test_assignments ?? []).length === 0).length,
      submitted: students.filter(student =>
        (student.test_assignments ?? []).some(assignment =>
          (assignment.test_submissions ?? []).some(submission => submission.status === 'submitted' || submission.status === 'graded')
        )
      ).length,
      submissions: submissions.length,
    };
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return students.filter(student => {
      const assignments = student.test_assignments ?? [];
      const submissions = assignments.flatMap(assignment => assignment.test_submissions ?? []);
      const matchesSearch = !q || (
        (student.full_name ?? '').toLowerCase().includes(q) ||
        (student.email ?? '').toLowerCase().includes(q)
      );
      const matchesFilter =
        filter === 'all' ||
        (filter === 'assigned' && assignments.length > 0) ||
        (filter === 'unassigned' && assignments.length === 0) ||
        (filter === 'submitted' && submissions.some(submission => submission.status === 'submitted' || submission.status === 'graded'));

      return matchesSearch && matchesFilter;
    });
  }, [filter, search, students]);

  return (
    <div className="dashboard students-page">
      <div className="students-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">Find students, review their assigned tests, and jump to the next action.</p>
        </div>
        <button className="btn btn--primary" onClick={() => router.push('/admin/assign')} style={{ borderRadius: 10 }}>
          <UserPlus size={16} />
          Assign Test
        </button>
      </div>

      <div className="students-stats" aria-label="Student summary">
        <SummaryCard label="Students" value={stats.total} icon={Users} />
        <SummaryCard label="Assigned" value={stats.assigned} icon={UserCheck} />
        <SummaryCard label="Need test" value={stats.unassigned} icon={UserPlus} />
        <SummaryCard label="Submissions" value={stats.submissions} icon={FileCheck} />
      </div>

      <div className="students-toolbar">
        <div className="students-search">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search students"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="students-filters" aria-label="Filter students">
          {FILTERS.map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={filter === item.value ? 'active' : ''}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {success && (
        <div className="login-form__success" style={{ marginBottom: 18 }}>
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {loading ? (
        <div className="students-loading">
          <div />
          <p>Loading students...</p>
        </div>
      ) : error ? (
        <div className="card students-error">
          <AlertCircle size={22} />
          <div>
            <strong>Database Error</strong>
            <span>{error}</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card glass-card students-empty">
          <div>{search ? <Search size={38} /> : <Users size={38} />}</div>
          <h2>{search || filter !== 'all' ? 'No matching students' : 'No students yet'}</h2>
          <p>
            {search || filter !== 'all'
              ? 'Adjust the search or filter to broaden the list.'
              : 'Students will appear here once they register.'}
          </p>
        </div>
      ) : (
        <div className="students-list">
          {filtered.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              unassigningId={unassigningId}
              onAssign={() => router.push(`/admin/assign?studentId=${student.id}`)}
              onSubmissions={() => router.push(`/admin/submissions?studentId=${student.id}`)}
              onUnassign={assignment => handleUnassign(student, assignment)}
            />
          ))}
        </div>
      )}

      <p className="students-count">
        <UserCheck size={14} />
        {filtered.length} of {students.length} student{students.length !== 1 ? 's' : ''} shown
      </p>

      <style jsx>{`
        .students-page {
          max-width: 1180px;
        }

        .students-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .students-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .students-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .students-search {
          position: relative;
          flex: 1;
          min-width: 260px;
          max-width: 480px;
        }

        .students-search svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .students-search input {
          width: 100%;
          height: 44px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
          color: var(--text-primary);
          font: inherit;
          outline: none;
          padding: 0 42px;
        }

        .students-search input:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(13, 115, 119, 0.12);
        }

        .students-search button {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }

        .students-filters {
          display: flex;
          gap: 6px;
          padding: 4px;
          border: 1px solid var(--border-light);
          border-radius: 10px;
          background: #e9eef2;
        }

        .students-filters button {
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 12px;
          white-space: nowrap;
        }

        .students-filters button.active {
          background: var(--surface);
          color: var(--teal-dark);
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
        }

        .students-list {
          display: grid;
          gap: 12px;
        }

        .students-loading {
          padding: 72px;
          text-align: center;
        }

        .students-loading div {
          width: 32px;
          height: 32px;
          border: 2px solid var(--teal-light);
          border-top-color: var(--teal);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        .students-loading p,
        .students-count {
          color: var(--text-muted);
          font-size: 13px;
        }

        .students-error {
          padding: 28px;
          border: 1px solid #fee2e2;
          background: #fef2f2;
          color: #991b1b;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .students-error strong {
          display: block;
        }

        .students-error span {
          display: block;
          font-size: 14px;
          opacity: 0.9;
        }

        .students-empty {
          text-align: center;
          padding: 72px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .students-empty div {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: var(--bg);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .students-empty h2 {
          font-size: 20px;
          margin: 0;
        }

        .students-empty p {
          color: var(--text-muted);
          margin: 0;
        }

        .students-count {
          margin-top: 18px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 980px) {
          .students-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .students-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .students-search {
            max-width: none;
          }

          .students-filters {
            overflow-x: auto;
          }
        }

        @media (max-width: 640px) {
          .students-header {
            flex-direction: column;
          }

          .students-header :global(.btn) {
            width: 100%;
          }

          .students-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="student-summary-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={20} />

      <style jsx>{`
        .student-summary-card {
          min-height: 86px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .student-summary-card span {
          display: block;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .student-summary-card strong {
          display: block;
          color: var(--text-primary);
          font-size: 26px;
          line-height: 1.1;
          margin-top: 4px;
        }

        .student-summary-card svg {
          color: var(--teal);
        }
      `}</style>
    </div>
  );
}

function StudentCard({ student, unassigningId, onAssign, onSubmissions, onUnassign }) {
  const assignments = student.test_assignments ?? [];
  const submissions = assignments.flatMap(assignment => assignment.test_submissions ?? []);
  const submitted = submissions.filter(submission => submission.status === 'submitted').length;
  const graded = submissions.filter(submission => submission.status === 'graded').length;
  const displayName = student.full_name || 'Unnamed Student';
  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <article className="student-card">
      <div className="student-main">
        <div className="student-avatar">{initial}</div>
        <div className="student-identity">
          <h2>{displayName}</h2>
          <p><Mail size={13} /> {student.email}</p>
          <p><Calendar size={13} /> Joined {formatDate(student.created_at)}</p>
        </div>
      </div>

      <div className="student-progress" aria-label="Student progress">
        <Metric value={assignments.length} label="Assigned" />
        <Metric value={submitted} label="Submitted" tone={submitted > 0 ? 'teal' : undefined} />
        <Metric value={graded} label="Graded" tone={graded > 0 ? 'green' : undefined} />
      </div>

      <div className="student-tests">
        <div className="student-tests__header">
          <span>Assigned Tests</span>
          {assignments.length === 0 && <em>No tests yet</em>}
        </div>
        {assignments.length > 0 && (
          <div className="student-test-list">
            {assignments.slice(0, 3).map(assignment => {
              const title = assignment.tests?.title ?? 'Untitled Test';
              const submissionCount = assignment.test_submissions?.length ?? 0;

              return (
                <div className="student-test-pill" key={assignment.id}>
                  <span title={title}>
                    {title}
                    {submissionCount > 0 && <small>{submissionCount} sub{submissionCount !== 1 ? 's' : ''}</small>}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUnassign(assignment)}
                    disabled={unassigningId === assignment.id}
                    aria-label={`Unassign ${title}`}
                    title={`Unassign ${title}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            {assignments.length > 3 && (
              <div className="student-test-more">+{assignments.length - 3} more assigned</div>
            )}
          </div>
        )}
      </div>

      <div className="student-actions">
        <button className="btn btn--primary btn--sm" onClick={onAssign}>
          <UserPlus size={14} />
          Assign
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onSubmissions}>
          Submissions
        </button>
      </div>

      <style jsx>{`
        .student-card {
          display: grid;
          grid-template-columns: minmax(260px, 1.1fr) minmax(180px, 0.7fr) minmax(280px, 1fr) auto;
          gap: 18px;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
          padding: 18px;
        }

        .student-main {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .student-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--teal-light);
          color: var(--teal-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .student-identity {
          min-width: 0;
        }

        .student-identity h2 {
          margin: 0 0 4px;
          color: var(--text-primary);
          font-size: 16px;
          line-height: 1.25;
        }

        .student-identity p {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .student-identity p:first-of-type {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-identity svg {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .student-progress {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .student-tests {
          min-width: 0;
        }

        .student-tests__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .student-tests__header span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .student-tests__header em {
          color: var(--text-muted);
          font-size: 13px;
          font-style: normal;
        }

        .student-test-list {
          display: grid;
          gap: 6px;
        }

        .student-test-pill {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 28px;
          align-items: center;
          gap: 8px;
          min-height: 36px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          background: #f8fafc;
          padding: 4px 4px 4px 10px;
        }

        .student-test-pill span {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-test-pill small {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
          margin-left: 6px;
        }

        .student-test-pill button {
          width: 28px;
          height: 28px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--surface);
          color: #991b1b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .student-test-pill button:disabled {
          cursor: wait;
          opacity: 0.5;
        }

        .student-test-more {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 700;
          padding-left: 2px;
        }

        .student-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        @media (max-width: 1120px) {
          .student-card {
            grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr);
          }

          .student-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 760px) {
          .student-card {
            grid-template-columns: 1fr;
          }

          .student-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </article>
  );
}

function Metric({ value, label, tone }) {
  return (
    <div className={`student-metric ${tone ? `student-metric--${tone}` : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>

      <style jsx>{`
        .student-metric {
          min-height: 48px;
          border-radius: 8px;
          background: var(--bg);
          padding: 8px;
        }

        .student-metric strong {
          display: block;
          color: var(--text-primary);
          font-size: 16px;
          line-height: 1;
        }

        .student-metric span {
          display: block;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          margin-top: 5px;
        }

        .student-metric--teal {
          background: var(--teal-light);
        }

        .student-metric--teal strong,
        .student-metric--teal span {
          color: var(--teal-dark);
        }

        .student-metric--green {
          background: var(--success-bg);
        }

        .student-metric--green strong,
        .student-metric--green span {
          color: var(--success);
        }
      `}</style>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
