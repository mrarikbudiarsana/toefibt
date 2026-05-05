'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, Clock, User, LogOut, Search, AlertCircle, RefreshCcw } from 'lucide-react';
import ToeflNavbar from '@/components/ToeflNavbar';

export default function MonitorPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [endingId, setEndingId] = useState(null);
  const supabase = createClient();

  async function fetchActiveAssignments() {
    const { data, error } = await supabase
      .from('test_assignments')
      .select(`
        id, status, last_active_at, progress_json,
        student_profiles (full_name, email),
        tests (title)
      `)
      .neq('status', 'completed')
      .order('last_active_at', { ascending: false, nullsFirst: false });

    if (!error) {
      setAssignments(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchActiveAssignments();
    const interval = setInterval(fetchActiveAssignments, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  async function endSession(id) {
    if (!confirm('Are you sure you want to force-end this session? The student will be immediately stopped.')) return;
    setEndingId(id);
    const { error } = await supabase
      .from('test_assignments')
      .update({ status: 'terminated' })
      .eq('id', id);
    
    if (error) alert('Failed to end session: ' + error.message);
    setEndingId(null);
    fetchActiveAssignments();
  }

  const filtered = assignments.filter(a => {
    const name = a.student_profiles?.full_name ?? '';
    const email = a.student_profiles?.email ?? '';
    const test = a.tests?.title ?? '';
    const query = search.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || test.toLowerCase().includes(query);
  });

  return (
    <div className="dashboard">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Live Monitor</h1>
          <p className="page-subtitle">Track active test sessions and manage stuck progress.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
             <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
             <input 
              className="input" 
              placeholder="Search students..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38, borderRadius: 10, width: 260 }}
             />
          </div>
          <button className="btn btn--ghost" onClick={fetchActiveAssignments} style={{ borderRadius: 10 }}>
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      {loading && assignments.length === 0 ? (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading active sessions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Activity size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.5 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>No active sessions</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>All students are currently inactive or have completed their tests.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filtered.map(a => {
            const lastActive = a.last_active_at ? new Date(a.last_active_at) : null;
            const diffSec = lastActive ? Math.floor((new Date() - lastActive) / 1000) : null;
            const isInactive = diffSec > 60; // Inactive if no heartbeat for > 60s
            const progress = a.progress_json ?? {};

            return (
              <div key={a.id} className="card glass-card" style={{ padding: 20, border: isInactive ? '1px solid var(--warning)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: '50%', 
                      background: isInactive ? 'var(--warning-bg)' : 'var(--teal-light)',
                      color: isInactive ? 'var(--warning)' : 'var(--teal)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <User size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.student_profiles?.full_name || 'Unknown Student'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.student_profiles?.email}</div>
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                    background: a.status === 'terminated' ? 'var(--error-bg)' : (isInactive ? 'var(--warning-bg)' : 'var(--success-bg)'),
                    color: a.status === 'terminated' ? 'var(--error)' : (isInactive ? 'var(--warning)' : 'var(--success)')
                  }}>
                    {a.status === 'terminated' ? 'TERMINATED' : (isInactive ? 'INACTIVE' : 'LIVE')}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Current Progress</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {progress.section ? `${progress.section} - Q${progress.questionIdx || '?'}` : 'Initializing...'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.tests?.title}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isInactive ? 'var(--warning)' : 'var(--text-muted)' }}>
                    <Clock size={14} />
                    {lastActive ? `Active ${diffSec}s ago` : 'Never active'}
                  </div>
                  {a.status !== 'terminated' && (
                    <button 
                      className="btn btn--sm" 
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8 }}
                      onClick={() => endSession(a.id)}
                      disabled={endingId === a.id}
                    >
                      {endingId === a.id ? 'Ending...' : 'End Session'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 32, height: 32, border: 2px solid var(--teal-light), borderTopColor: var(--teal), borderRadius: 50%, animation: spin 1s linear infinite }
      `}</style>
    </div>
  );
}
