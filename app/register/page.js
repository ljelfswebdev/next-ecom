
'use client';
import { useState } from 'react'; import { useRouter } from 'next/navigation';
export default function RegisterPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [name,setName]=useState(''); const router = useRouter();
  async function onSubmit(e){ e.preventDefault(); const r = await fetch('/api/auth/register',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email,password,name }) }); if(r.ok) router.push('/login'); else alert('Error'); }
  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-4">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><label className="label">Name</label><input className="input" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div><label className="label">Email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <button className="btn btn-primary w-full">Register</button>
      </form>
    </div>
  );
}
