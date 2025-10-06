
'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  async function onSubmit(e){ e.preventDefault(); await signIn('credentials',{ email,password, redirect:true, callbackUrl:'/' }); }
  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div><label className="label">Email</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <button className="btn btn-primary w-full">Login</button>
      </form>
      <p className="text-sm mt-3">No account? <Link className="underline" href="/register">Register</Link></p>
    </div>
  );
}
