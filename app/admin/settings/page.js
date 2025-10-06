
'use client';
import { useEffect, useState } from 'react';
export default function AdminSettingsPage(){
  const [s,setS]=useState(null);
  useEffect(()=>{ fetch('/api/admin/settings').then(r=>r.json()).then(setS); },[]);
  const update = async ()=>{ const r=await fetch('/api/admin/settings',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(s) }); if(r.ok) alert('Saved'); else alert('Error'); };
  if(!s) return <div>Loading...</div>;
  return (
    <div className="card space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="label">VAT %</label><input className="input" type="number" value={s.vatPercent} onChange={e=>setS({...s, vatPercent: parseFloat(e.target.value)})} /></div>
        <div><label className="label">Supported Currencies (read-only v1)</label><input className="input" value={s.supportedCurrencies?.join(', ')} readOnly /></div>
        <div className="sm:col-span-2">
          <h3 className="font-medium mt-2">FX Rates (GBP base)</h3>
          {['GBP','EUR','USD'].map(c=>(
            <div key={c} className="flex items-center gap-3 mt-2">
              <div className="w-16">{c}</div>
              <input className="input" type="number" step="0.0001" value={s.fx?.[c] ?? ''} onChange={e=>setS({...s, fx:{...s.fx, [c]: parseFloat(e.target.value)}})} />
            </div>
          ))}
        </div>
        <div className="sm:col-span-2">
          <h3 className="font-medium mt-2">Shipping (per currency)</h3>
          {['UK','EU','USA'].map(z => (
            <div key={z} className="border rounded-xl p-3 mt-2">
              <div className="font-medium mb-2">{z}</div>
              {['GBP','EUR','USD'].map(c=>(
                <div key={z+c} className="flex items-center gap-3 mt-2">
                  <div className="w-16">{c}</div>
                  <input className="input" type="number" step="0.01" value={s.shipping?.[z]?.[c] ?? 0} onChange={e=>setS({...s, shipping:{...s.shipping, [z]:{ ...(s.shipping?.[z]||{}), [c]: parseFloat(e.target.value) }}})} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" onClick={update}>Save Settings</button>
    </div>
  );
}
