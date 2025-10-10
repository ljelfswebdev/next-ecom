// app/reset-password/page.js
'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const token = sp.get('token') || '';           // present when clicking from email
  const router = useRouter();

  // request form
  const [email, setEmail] = useState('');

  // reset form
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const requestLink = async (e) => {
    e.preventDefault();
    setBusy(true); setStatus('');
    try {
      const r = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) throw new Error(await r.text());
      setStatus('If that email exists, a reset link has been sent.');
    } catch (e) {
      setStatus(e.message || 'Something went wrong.');
    } finally { setBusy(false); }
  };

  const doReset = async (e) => {
    e.preventDefault();
    setBusy(true); setStatus('');
    try {
      if (!password || password.length < 8) throw new Error('Password must be at least 8 characters.');
      if (password !== confirm) throw new Error('Passwords do not match.');
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!r.ok) throw new Error(await r.text());
      setStatus('Password updated. Redirecting to login…');
      setTimeout(()=>router.push('/login'), 1500);
    } catch (e) {
      setStatus(e.message || 'Failed to reset password.');
    } finally { setBusy(false); }
  };

  // If a token is present → show "set new password"
  if (token) {
    return (
      <div className="max-w-md mx-auto card">
        <h1 className="text-xl font-semibold mb-4">Set a new password</h1>
        <form onSubmit={doReset} className="space-y-3">
          <div>
            <label className="label">New password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={e=>setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
        {status && <p className="text-sm mt-3">{status}</p>}
      </div>
    );
  }

  // No token → show "request link" form
  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-2">Reset your password</h1>
      <p className="text-sm text-gray-600 mb-3">
        Enter your account email and we’ll send you a password reset link.
      </p>
      <form onSubmit={requestLink} className="space-y-3">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {status && <p className="text-sm mt-3">{status}</p>}
    </div>
  );
}