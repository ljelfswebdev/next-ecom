'use client';
import { useEffect, useMemo, useState } from 'react';

export default function AdminCustomersPage(){
  const [data,setData]=useState({ customers:[], total:0, page:1, limit:20 });
  const [loading,setLoading]=useState(true);
  const [q,setQ]=useState('');

  async function load(page=1){
    setLoading(true);
    const params = new URLSearchParams({ page, limit:'20' });
    if(q) params.set('q', q);
    const r = await fetch(`/api/admin/customers?`+params.toString());
    const j = await r.json(); setData(j); setLoading(false);
  }
  useEffect(()=>{ load(1); },[]);

  const pages = useMemo(()=>Math.max(1, Math.ceil((data.total||0)/(data.limit||20))),[data.total,data.limit]);

  function csvEscape(s){ s = (s??'').toString(); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
  function toRow(u){
    const b = u.addresses?.billing || {};
    const s = u.addresses?.shipping || {};
    return [
      u._id, u.name||'', u.email||'', u.role||'user', new Date(u.createdAt).toISOString(),
      b.fullName||'', b.line1||'', b.line2||'', b.city||'', b.region||'', b.postcode||'', b.country||'', b.phone||'',
      s.fullName||'', s.line1||'', s.line2||'', s.city||'', s.region||'', s.postcode||'', s.country||'', s.phone||'',
    ];
  }
  async function exportCSV(){
    const params = new URLSearchParams({ page:'1', limit:'200' }); if(q) params.set('q', q);
    let p=1, all=[];
    while(true){
      params.set('page', String(p));
      const r = await fetch('/api/admin/customers?'+params.toString());
      const j = await r.json(); all.push(...(j.customers||[]));
      const totalPages = Math.max(1, Math.ceil((j.total||0)/(j.limit||20)));
      if(p>=totalPages) break; p++;
    }
    const header = [
      'id','name','email','role','created_at',
      'bill_name','bill_line1','bill_line2','bill_city','bill_region','bill_postcode','bill_country','bill_phone',
      'ship_name','ship_line1','ship_line2','ship_city','ship_region','ship_postcode','ship_country','ship_phone'
    ];
    const rows = [header, ...all.map(toRow)];
    const csv = rows.map(r=>r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download='customers.csv'; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers</h1>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Search (name/email)</label>
          <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. alice or alice@example.com"/>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={()=>load(1)}>Apply</button>
          <button className="btn" onClick={()=>{ setQ(''); load(1); }}>Reset</button>
        </div>
        <div className="ml-auto"><button className="btn btn-primary" onClick={exportCSV}>Export CSV</button></div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <div>Loading…</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Billing city</th>
                <th className="py-2">Shipping city</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map(u=>(
                <tr key={u._id} className="border-b">
                  <td className="py-2">{u.name || '—'}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.addresses?.billing?.city || '—'}</td>
                  <td className="py-2">{u.addresses?.shipping?.city || '—'}</td>
                  <td className="py-2">{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages>1 && (
        <div className="flex gap-2">
          <button className="btn" disabled={data.page<=1} onClick={()=>load(data.page-1)}>Prev</button>
          <div className="px-3 py-2 border rounded-xl text-sm">Page {data.page} / {pages}</div>
          <button className="btn" disabled={data.page>=pages} onClick={()=>load(data.page+1)}>Next</button>
        </div>
      )}
    </div>
  );
}