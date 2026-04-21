'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  LayoutDashboard, 
  BookOpen, 
  UserPlus, 
  FileCheck, 
  Users, 
  LogOut,
  User,
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
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
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--teal-light)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}>Initializing Admin Panel</span>
      </div>
      <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );

  const NAV = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Tests', href: '/admin/tests', icon: BookOpen },
    { label: 'Assign', href: '/admin/assign', icon: UserPlus },
    { label: 'Submissions', href: '/admin/submissions', icon: FileCheck },
    { label: 'Students', href: '/admin/students', icon: Users },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: '#0f172a', color: '#fff',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)' }}></div>
            TOEFL iBT
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Administrator Portal
          </div>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px' }}>
          {NAV.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="sidebar-link"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  fontSize: 14, fontWeight: 500, 
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                  background: isActive ? 'rgba(13, 115, 119, 0.15)' : 'transparent',
                  borderRadius: 10,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  textDecoration: 'none',
                  marginBottom: 4,
                  borderLeft: isActive ? '3px solid var(--teal)' : '3px solid transparent'
                }}
              >
                <Icon size={18} style={{ opacity: isActive ? 1 : 0.7 }} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ 
              width: 32, height: 32, borderRadius: 8, 
              background: 'var(--teal)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff' 
            }}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Admin
              </div>
              <div style={{ fontSize: 11, opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: 'none', color: 'var(--teal)', 
              padding: '10px', borderRadius: 8, 
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer', width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s',
              marginBottom: 8
            }}
          >
            <User size={16} />
            Switch to Student
          </button>
          <button
            onClick={handleLogout}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: 'none', color: 'rgba(255,255,255,0.6)', 
              padding: '10px', borderRadius: 8, 
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer', width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.2s'
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 240, background: 'var(--bg)', minHeight: '100vh' }}>
        {children}
      </main>

      <style jsx global>{`
        .sidebar-link:hover {
          background: rgba(255,255,255,0.05) !important;
          color: #fff !important;
        }
        .sidebar-link:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}

