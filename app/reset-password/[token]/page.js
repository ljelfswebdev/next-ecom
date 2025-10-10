'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ResetWithTokenPage(){
  const { token } = useParams();
  const router = useRouter();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [status, setStatus] = useState('');

  const submit = async (e)=>{
    e.preventDefault();
    if (!p1 || p1 !== p2) { setStatus('Passwords do not match'); return; }
    setStatus('Updating…');
    const r = await fetch('/api/auth/reset-password', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ token, password: p1 }),
    });
    if (r.ok) { setStatus('Password updated. Redirecting to login…'); setTimeout(()=>router.push('/login'), 1000); }
    else { setStatus(await r.text().catch(()=> 'Failed')); }
  };

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-4">Choose a new password</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">New password</label>
          <input type="password" className="input" value={p1} onChange={e=>setP1(e.target.value)} />
        </div>
        <div>
          <label className="label">Repeat new password</label>
          <input type="password" className="input" value={p2} onChange={e=>setP2(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full">Update password</button>
      </form>
      {status && <p className="text-sm mt-3">{status}</p>}
    </div>
  );
}