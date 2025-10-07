// app/admin/categories/page.js
'use client';
import { useEffect, useState } from 'react';

export default function AdminCategoriesPage(){
  const [list,setList] = useState([]);
  const [form,setForm] = useState({ title:'', slug:'', description:'', status:'published' });
  const [editing,setEditing] = useState(null);

  const load = async ()=>{
    const r = await fetch('/api/admin/categories', { cache:'no-store' });
    const j = await r.json(); setList(j);
  };
  useEffect(()=>{ load(); },[]);

  const save = async ()=>{
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/admin/categories/${editing}` : '/api/admin/categories';
    const r = await fetch(url, {
      method, headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    });
    if (r.ok) {
      setForm({ title:'', slug:'', description:'', status:'published' });
      setEditing(null);
      load();
    } else alert('Save failed');
  };

  const startEdit = (c)=>{
    setEditing(c._id);
    setForm({ title: c.title, slug: c.slug, description: c.description || '', status: c.status || 'published' });
  };

  const del = async (id)=>{
    if (!confirm('Delete this category?')) return;
    const r = await fetch(`/api/admin/categories/${id}`, { method:'DELETE' });
    if (r.ok) load(); else alert('Delete failed');
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card space-y-3">
        <h2 className="font-semibold">{editing ? 'Edit category' : 'Create category'}</h2>
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
        </div>
        <div>
          <label className="label">Slug</label>
          <input className="input" value={form.slug} onChange={e=>setForm({...form, slug:e.target.value.replace(/^\//,'')})} />
          <p className="text-xs text-gray-500 mt-1">Used for filtering (e.g. <code>?category={form.slug||'slug'}</code>).</p>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[120px]" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e=>setForm({...form, status:e.target.value})}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={save}>{editing ? 'Update' : 'Create'}</button>
          {editing && <button className="btn btn-secondary" onClick={()=>{ setEditing(null); setForm({ title:'', slug:'', description:'', status:'published' }); }}>Cancel</button>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Categories</h2>
        <ul className="space-y-2">
          {list.map(c=>(
            <li key={c._id} className="border rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-sm text-gray-500">{c.slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn" onClick={()=>startEdit(c)}>Edit</button>
                <button className="btn btn-secondary" onClick={()=>del(c._id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}