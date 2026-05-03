'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  return (
    <main className="login-page">
      {/* Left Brand panel */}
      <div className="login-page__left">
        <img
          src="https://res.cloudinary.com/english-tests-platform/image/upload/v1776770186/4_beadeh.png"
          alt="English with Arik Logo"
          style={{ height: '180px', marginBottom: '-20px', zIndex: 10 }}
        />

        <h1 className="login-page__title" style={{ zIndex: 10 }}>TOEFL iBT<br />Mock Test Platform</h1>
        <p className="login-page__sub" style={{ zIndex: 10 }}>
          Practice the official format - Reading, Listening, Writing &amp; Speaking - with adaptive scoring and AI feedback.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 32, justifyContent: 'center', zIndex: 10 }}>
          {['Reading', 'Listening', 'Writing', 'Speaking'].map(s => (
            <span key={s} style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 100,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              {s}
            </span>
          ))}
        </div>

        <div style={{
          marginTop: 48,
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 16,
          padding: '20px 24px',
          maxWidth: 360,
          fontSize: 14,
          lineHeight: 1.6,
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          zIndex: 10
        }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GraduationCap size={24} color="#fff" />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: 15, marginBottom: 2 }}>Institutional Grade</strong>
            <span style={{ opacity: 0.85 }}>Aligned to CEFR (A1 - C2). Designed for Jan 2026 format preparation.</span>
          </div>
        </div>
      </div>

      {/* Right Auth panel */}
      <div className="login-page__right">
        <div className="login-form">
          <div style={{
            display: 'flex',
            marginBottom: 28,
            borderBottom: '1px solid var(--border-light)',
          }}>
            {[
              { key: 'login', label: 'Sign In' },
              { key: 'signup', label: 'Create Account' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                type="button"
                style={{
                  flex: 1,
                  padding: '0 0 12px 0',
                  fontSize: 15,
                  fontWeight: 600,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t.key ? '2px solid var(--teal)' : '2px solid transparent',
                  color: tab === t.key ? 'var(--teal-dark)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '-1px',
                  outline: 'none'
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
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [notice, setNotice] = useState('');

  function isEmailNotConfirmed(err) {
    return err?.code === 'email_not_confirmed'
      || /email not confirmed/i.test(err?.message ?? '');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    setNeedsConfirmation(false);
    try {
      const supabase = createClient();
      const normalizedEmail = email.trim();
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (authErr) throw authErr;

      const role = data.user?.user_metadata?.role ?? 'student';
      router.push(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      if (isEmailNotConfirmed(err)) {
        setNeedsConfirmation(true);
        setError('Your account exists, but your email is not verified yet. Please check your email inbox or spam folder for the confirmation link.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter your email address first, then resend the confirmation link.');
      setNeedsConfirmation(true);
      return;
    }

    setResending(true);
    setNotice('');
    try {
      const supabase = createClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (resendErr) throw resendErr;
      setNotice(`Confirmation email resent to ${normalizedEmail}.`);
    } catch (err) {
      setError(err.message || 'Could not resend the confirmation email. Please try again.');
      setNeedsConfirmation(true);
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <h2 className="login-form__title">Welcome back</h2>
      <p className="login-form__sub">Sign in to access your assigned mock tests.</p>

      {error && (
        <div className="login-form__error">
          <AlertCircle size={18} />
          <div style={{ flex: 1 }}>
            <div>{error}</div>
            {needsConfirmation && (
              <button
                type="button"
                className="login-form__link-button"
                onClick={handleResendConfirmation}
                disabled={resending}
              >
                {resending ? 'Sending confirmation email...' : 'Resend confirmation email'}
              </button>
            )}
          </div>
        </div>
      )}

      {notice && (
        <div className="login-form__success">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}

      <div className="login-form__group">
        <label className="label" htmlFor="login-email">Email Address</label>
        <div className="input-group">
          <Mail size={18} className="input-icon" />
          <input
            id="login-email"
            type="email"
            className="input-with-icon"
            placeholder="you@example.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setNotice('');
            }}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="login-form__group">
        <label className="label" htmlFor="login-password">Password</label>
        <div className="input-group">
          <Lock size={18} className="input-icon" />
          <input
            id="login-password"
            type="password"
            className="input-with-icon"
            placeholder="••••••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn-premium btn--full"
        style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}
        disabled={loading}
      >
        {loading ? 'Signing in...' : (
          <>
            Sign in
            <ArrowRight size={18} />
          </>
        )}
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
          emailRedirectTo: window.location.origin,
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
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
        }}>
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>Account Created</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          We sent a confirmation link to <strong>{email}</strong>.<br />
          Please check your email inbox or spam folder, then click the link to verify your account.
        </p>
        <button className="btn btn--outline btn--full" onClick={onSuccess}>
          Back to Sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignup}>
      <h2 className="login-form__title" style={{ fontSize: 22 }}>Create account</h2>
      <p className="login-form__sub" style={{ marginBottom: 24, fontSize: 14 }}>Register to access your assigned mock tests.</p>

      {error && (
        <div className="login-form__error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="login-form__group" style={{ marginBottom: 16 }}>
        <label className="label" htmlFor="signup-name">Full Name</label>
        <div className="input-group">
          <User size={18} className="input-icon" />
          <input
            id="signup-name"
            type="text"
            className="input-with-icon"
            placeholder="Jane Doe"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
      </div>

      <div className="login-form__group" style={{ marginBottom: 16 }}>
        <label className="label" htmlFor="signup-email">Email Address</label>
        <div className="input-group">
          <Mail size={18} className="input-icon" />
          <input
            id="signup-email"
            type="email"
            className="input-with-icon"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="label" htmlFor="signup-password">Password</label>
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              id="signup-password"
              type="password"
              className="input-with-icon"
              placeholder="Min. 8 char"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="signup-confirm">Confirm</label>
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              id="signup-confirm"
              type="password"
              className="input-with-icon"
              placeholder="Repeat"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="btn-premium btn--full"
        style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}
        disabled={loading}
      >
        {loading ? 'Creating...' : (
          <>
            Create Account
            <ArrowRight size={18} />
          </>
        )}
      </button>

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
        By registering, you agree to use this platform solely for your enrolled preparation course.
      </p>
    </form>
  );
}
