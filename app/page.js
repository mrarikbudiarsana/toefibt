'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  return (
    <main className="login-page">
      {/* Left — Brand panel */}
      <div className="login-page__left">
        <p className="login-page__brand">English with Arik</p>
        <h1 className="login-page__title">TOEFL iBT<br />Mock Test Platform</h1>
        <p className="login-page__sub">
          Practice the official January 2026 format — Reading, Listening, Writing &amp; Speaking — with adaptive scoring and AI feedback.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 28, justifyContent: 'center' }}>
          {['Reading', 'Listening', 'Writing', 'Speaking'].map(s => (
            <span key={s} style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 100,
              padding: '5px 14px',
              fontSize: 13,
              fontWeight: 600,
            }}>{s}</span>
          ))}
        </div>

        <div style={{
          marginTop: 40,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 10,
          padding: '16px 20px',
          maxWidth: 320,
          fontSize: 13,
          lineHeight: 1.7,
          opacity: 0.9,
        }}>
          <strong>1–6 Band Scale</strong> aligned to CEFR<br />
          (A1 → C2) · January 2026 Format
        </div>
      </div>

      {/* Right — Auth panel */}
      <div className="login-page__right">
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            marginBottom: 28,
            borderBottom: '2px solid var(--border)',
          }}>
            {[
              { key: 'login', label: 'Sign in' },
              { key: 'signup', label: 'Create account' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t.key ? '3px solid var(--teal)' : '3px solid transparent',
                  color: tab === t.key ? 'var(--teal)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <LoginForm router={router} />
          ) : (
            <SignupForm onSuccess={() => setTab('login')} />
          )}
        </div>
      </div>
    </main>
  );
}

function LoginForm({ router }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;

      const role = data.user?.user_metadata?.role ?? 'student';
      router.push(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleLogin}>
      <h2 className="login-form__title">Welcome back</h2>
      <p className="login-form__sub">Sign in to access your assigned tests.</p>

      {error && <div className="login-form__error">{error}</div>}

      <div className="login-form__group">
        <label className="label" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          className="input"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="login-form__group">
        <label className="label" htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          className="input"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        className="btn btn--primary btn--full"
        style={{ marginTop: 8 }}
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        Trouble signing in? Contact your instructor.
      </p>
    </form>
  );
}

function SignupForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: 'student' },
        },
      });
      if (authErr) throw authErr;
      setDone(true);
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="login-form" style={{ textAlign: 'center', paddingTop: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✉️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Check your email</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          We sent a confirmation link to <strong>{email}</strong>.<br />
          Click it to activate your account, then sign in.
        </p>
        <button className="btn btn--primary btn--full" onClick={onSuccess}>
          Back to Sign in
        </button>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={handleSignup}>
      <h2 className="login-form__title">Create account</h2>
      <p className="login-form__sub">Register to access your TOEFL iBT mock tests.</p>

      {error && <div className="login-form__error">{error}</div>}

      <div className="login-form__group">
        <label className="label" htmlFor="signup-name">Full Name</label>
        <input
          id="signup-name"
          type="text"
          className="input"
          placeholder="Your full name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="login-form__group">
        <label className="label" htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          className="input"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="login-form__group">
        <label className="label" htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          className="input"
          placeholder="Min. 8 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <div className="login-form__group">
        <label className="label" htmlFor="signup-confirm">Confirm Password</label>
        <input
          id="signup-confirm"
          type="password"
          className="input"
          placeholder="Repeat your password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        className="btn btn--primary btn--full"
        style={{ marginTop: 8 }}
        disabled={loading}
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
        By creating an account, you agree to use this platform solely for your enrolled TOEFL iBT preparation course with English with Arik.
      </p>
    </form>
  );
}
