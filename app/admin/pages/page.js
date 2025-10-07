'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminPagesList(){
  const [list,setList]=useState(null);

  const load = async ()=>{
    const r = await fetch('/api/admin/pages', { cache:'no-store' });
    const j = await r.json();
    setList(j);
  };
  useEffect(()=>{ load(); },[]);

  if(!list) return <div className="card">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pages</h1>
        <Link href="/admin/pages/new" className="btn btn-primary">New Page</Link>
      </div>
      <ul className="space-y-2">
        {list.map(p=>(
          <li key={p._id} className="border rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.title}</div>
              <div className="text-sm text-gray-500">/{p.slug} • {p.status}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link className="btn" href={`/admin/pages/${p._id}`}>Edit</Link>
              <a className="btn" href={`/pages/${p.slug}`} target="_blank" rel="noreferrer">View</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}