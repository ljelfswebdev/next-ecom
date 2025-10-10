// components/HeaderSearch.js
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HeaderSearch() {
  const router = useRouter();
  const [term, setTerm] = useState('');

  const go = (e) => {
    e.preventDefault();
    const q = term.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  return (
    <form onSubmit={go} className="hidden md:flex items-center gap-2">
      <input
        className="input w-56"
        placeholder="Search products…"
        value={term}
        onChange={(e)=>setTerm(e.target.value)}
        aria-label="Search products"
      />
      <button className="btn" type="submit">Search</button>
    </form>
  );
}