'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { writeSession, type UserRole } from '../lib/auth';
import { apiLogin, apiRegister } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [role, setRole] = useState<UserRole>('admin');
  const [name, setName] = useState('');
  const [staffId, setStaffId] = useState('admin01');
  const [password, setPassword] = useState('SeedPass123!');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const roleHint = useMemo(
    () => (role === 'admin' ? 'Use admin01 / SeedPass123!' : 'Use staff01 / SeedPass123!'),
    [role]
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        const session = await apiLogin(staffId, password);
        if (session.role !== role) {
          setError('Selected role does not match credentials.');
          return;
        }
        writeSession({ token: session.token, role: session.role, staffId });
        router.replace('/');
        return;
      }

      if (mode === 'register') {
        if (role === 'admin') {
          setError('Admin cannot register directly. Please contact system administrator.');
          return;
        }

        await apiRegister({
          staffId,
          name: name.trim() || staffId,
          role,
          password
        });
        setMessage('Registration successful. Please login with your new account.');
        setMode('login');
        setPassword('');
        return;
      }
    } catch (err) {
      if (mode === 'register' && err instanceof Error && err.message.includes('admin_register_not_allowed')) {
        setError('Admin cannot register directly. Please contact system administrator.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <section className="section" style={{ width: 'min(560px, 100%)', background: 'var(--surface-container-low)' }}>
        <h1 style={{ marginTop: 0, marginBottom: '0.4rem', fontSize: '2rem' }}>Farm Ops Login</h1>
        <p style={{ marginTop: 0, color: 'var(--on-surface-variant)' }}>Choose role and continue.</p>

        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.8rem' }}>
          <button type="button" className={mode === 'login' ? 'primary-button' : 'secondary-button'} onClick={() => setMode('login')}>
            Login
          </button>
          <button type="button" className={mode === 'register' ? 'primary-button' : 'secondary-button'} onClick={() => setMode('register')}>
            Register
          </button>
          <button type="button" className={mode === 'forgot' ? 'primary-button' : 'secondary-button'} onClick={() => setMode('forgot')}>
            Forgot Password
          </button>
        </div>

        {mode === 'forgot' ? (
          <div className="panel" style={{ fontSize: '0.95rem' }}>
            Password reset is currently handled by system administrators. Please contact system administrator to reset your password.
          </div>
        ) : null}

        {mode !== 'forgot' ? (
          <form onSubmit={submit} style={{ display: 'grid', gap: '0.8rem' }}>
          <div className="grid-2">
            <button
              type="button"
              className={role === 'admin' ? 'primary-button' : 'secondary-button'}
              onClick={() => {
                setRole('admin');
                setStaffId('admin01');
              }}
            >
              Admin
            </button>
            <button
              type="button"
              className={role === 'staff' ? 'primary-button' : 'secondary-button'}
              onClick={() => {
                setRole('staff');
                setStaffId('staff01');
              }}
            >
              Staff
            </button>
          </div>

          {mode === 'register' ? (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          ) : null}
          <input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Staff ID" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />

          <button className="primary-button" type="submit">
            {mode === 'login' ? 'Login' : 'Create Account'}
          </button>

          <div className="panel" style={{ fontSize: '0.86rem' }}>
            {mode === 'login'
              ? roleHint
              : role === 'admin'
                ? 'Admin cannot self-register. Please contact system administrator.'
                : 'Staff can self-register and then login.'}
          </div>
          {message ? <p style={{ color: 'var(--primary)', margin: 0 }}>{message}</p> : null}
          {error ? <p style={{ color: 'var(--error)', margin: 0 }}>{error}</p> : null}
          </form>
        ) : null}
      </section>
    </main>
  );
}
