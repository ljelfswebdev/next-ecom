'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminMenusPage(){
  const [list,setList] = useState([]);

  const load = async ()=>{
    const r = await fetch('/api/admin/menus', { cache:'no-store' });
    if (r.ok) setList(await r.json());
  };
  useEffect(()=>{ load(); },[]);

  const create = async ()=>{
    const r = await fetch('/api/admin/menus', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title:'Main Menu', slug:'main', status:'published', items:[] })
    });
    if (r.ok){
      const m = await r.json();
      window.location.href = `/admin/menus/${m._id}`;
    } else {
      alert('Failed to create');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Menus</h1>
        <button className="btn btn-primary" onClick={create}>+ New menu</button>
      </div>
      {list.length===0 ? <p>No menus yet.</p> : (
        <ul className="divide-y">
          {list.map(m=>(
            <li key={m._id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{m.title}</div>
                <div className="text-sm text-gray-500">{m.slug} • {m.status}</div>
              </div>
              <Link href={`/admin/menus/${m._id}`} className="btn">Edit</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}