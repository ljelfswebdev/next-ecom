'use client';
import { useEffect, useState } from 'react';

const RATES = [1,2,3,4,5];

export default function AdminReviewsPage(){
  const [q,setQ] = useState('');
  const [rating,setRating] = useState('');
  const [slug,setSlug] = useState('');
  const [from,setFrom] = useState('');
  const [to,setTo] = useState('');
  const [items,setItems] = useState([]);
  const [cursor,setCursor] = useState(null);
  const [loading,setLoading] = useState(false);

  const fetchPage = async (append=false, cur=null)=>{
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (rating) params.set('rating', rating);
    if (slug) params.set('slug', slug);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (cur) params.set('cursor', cur);
    params.set('limit', '20');

    const r = await fetch(`/api/admin/reviews?`+params.toString(), { cache:'no-store' });
    setLoading(false);
    if (!r.ok) { alert('Failed to load'); return; }
    const j = await r.json();
    setCursor(j.nextCursor);
    setItems(prev => append ? [...prev, ...j.items] : j.items);
  };

  useEffect(()=>{ fetchPage(false, null); /* initial */ },[]);

  const applyFilters = (e)=>{
    e?.preventDefault();
    fetchPage(false, null);
  };

  const loadMore = ()=> cursor && fetchPage(true, cursor);

  const del = async (id)=>{
    if (!confirm('Delete this review?')) return;
    const r = await fetch(`/api/admin/reviews/${id}`, { method:'DELETE' });
    if (r.ok) setItems(prev => prev.filter(x=>x._id !== id));
    else alert('Failed to delete');
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">Reviews</h1>
        <form onSubmit={applyFilters} className="grid md:grid-cols-5 gap-3">
          <input className="input md:col-span-2" placeholder="Search text or name" value={q} onChange={e=>setQ(e.target.value)} />
          <input className="input" placeholder="Product slug" value={slug} onChange={e=>setSlug(e.target.value)} />
          <select className="input" value={rating} onChange={e=>setRating(e.target.value)}>
            <option value="">Any rating</option>
            {RATES.map(r=><option key={r} value={r}>{r}★</option>)}
          </select>
          <div className="md:col-span-5 grid grid-cols-2 gap-3">
            <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
            <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div className="md:col-span-5 flex gap-2 justify-end">
            <button type="button" className="btn" onClick={()=>{
              setQ(''); setRating(''); setSlug(''); setFrom(''); setTo(''); fetchPage(false, null);
            }}>Clear</button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">When</th>
              <th>Product</th>
              <th>By</th>
              <th>Rating</th>
              <th>Comment</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td className="py-4 text-gray-500" colSpan={6}>No reviews found.</td></tr>
            ) : items.map(r=>(
              <tr key={r._id} className="border-t align-top">
                <td className="py-2">{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  {r.productTitle ? (
                    <>
                      <div className="font-medium">{r.productTitle}</div>
                      <div className="text-xs text-gray-500">/{r.productSlug}</div>
                    </>
                  ) : <span className="text-xs text-gray-500">[deleted product]</span>}
                </td>
                <td>
                  <div className="font-medium">{r.userName || 'Customer'}</div>
                </td>
                <td>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</td>
                <td className="max-w-md pr-2 whitespace-pre-wrap break-words">{r.comment || <span className="text-gray-400">—</span>}</td>
                <td className="text-right">
                  <button className="text-red-600 underline" onClick={()=>del(r._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {cursor && (
          <div className="mt-3 flex justify-center">
            <button className="btn" onClick={loadMore} disabled={loading}>
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}