// app/admin/settings/page.js
'use client';
import { useEffect, useState } from 'react';

export default function AdminSettingsPage(){
  const [s,setS]=useState(null);

  useEffect(()=>{
    fetch('/api/admin/settings')
      .then(r=>r.json())
      .then(setS)
      .catch(()=>setS({ vatPercent:20, shipping:{ UK:{ GBP:0 } }, storeName:'MyStore' }));
  },[]);

  const update = async ()=>{
    const r = await fetch('/api/admin/settings', {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(s)
    });
    if(r.ok) alert('Saved'); else alert('Error saving settings');
  };

  if(!s) return <div>Loading...</div>;

  return (
    <div className="card space-y-6">
      <h1 className="text-xl font-semibold">Store Settings (UK only)</h1>

      {/* Store details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Store name</label>
          <input className="input" value={s.storeName || ''} onChange={e=>setS({...s, storeName: e.target.value})} />
        </div>
        <div>
          <label className="label">Contact email</label>
          <input className="input" type="email" value={s.supportEmail || ''} onChange={e=>setS({...s, supportEmail: e.target.value})} />
        </div>
        <div>
          <label className="label">Contact number</label>
          <input className="input" value={s.contactNumber || ''} onChange={e=>setS({...s, contactNumber: e.target.value})} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Store address</label>
          <textarea className="input min-h-[110px]" value={s.storeAddress || ''} onChange={e=>setS({...s, storeAddress: e.target.value})} />
        </div>
      </div>

      {/* Tax & shipping */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">VAT %</label>
          <input className="input" type="number" step="0.1"
                 value={typeof s.vatPercent === 'number' ? s.vatPercent : 20}
                 onChange={e=>setS({...s, vatPercent: parseFloat(e.target.value || '0')})} />
        </div>

        <div>
          <h3 className="label">Shipping (UK, GBP)</h3>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-16">GBP</div>
            <input
              className="input" type="number" step="0.01"
              value={s.shipping?.UK?.GBP ?? 0}
              onChange={e=>setS({
                ...s,
                shipping: {
                  ...(s.shipping || {}),
                  UK: { ...(s.shipping?.UK || {}), GBP: parseFloat(e.target.value || '0') }
                }
              })}
            />
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={update}>Save Settings</button>
    </div>
  );
}