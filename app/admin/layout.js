'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.user_metadata?.role !== 'admin') {
        router.replace('/dashboard');
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-muted)' }}>Loading admin panel…</span>
    </div>
  );

  const NAV = [
    { label: '📊 Dashboard', href: '/admin' },
    { label: '📝 Tests', href: '/admin/tests' },
    { label: '👥 Assign', href: '/admin/assign' },
    { label: '📈 Submissions', href: '/admin/submissions' },
    { label: '👤 Students', href: '/admin/students' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#111827', color: '#fff',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)' }}>TOEFL iBT</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>Admin Panel</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'block', padding: '10px 20px',
                fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)',
                borderLeft: '3px solid transparent',
                transition: 'all 0.15s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'transparent'; }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>{user?.email}</div>
          <button
            onClick={handleLogout}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', width: '100%' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 220, background: 'var(--bg)', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
