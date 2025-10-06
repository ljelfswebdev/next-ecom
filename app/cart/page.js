
'use client';
import { useEffect, useState } from 'react';
export default function CartPage(){
  const [items,setItems]=useState([]); const [email,setEmail]=useState('');
  const [currency,setCurrency]=useState('GBP'); const [zone,setZone]=useState('UK'); const [status,setStatus]=useState('');
  useEffect(()=>{ setItems(JSON.parse(localStorage.getItem('cart')||'[]')); },[]);
  const remove = (i)=>{ const c = items.slice(); c.splice(i,1); setItems(c); localStorage.setItem('cart', JSON.stringify(c)); };
  const checkout = async ()=>{
    setStatus('Processing...');
    const r = await fetch('/api/orders', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, items, currency, zone }) });
    if(r.ok){ setStatus('Success! Confirmation email sent.'); localStorage.removeItem('cart'); setItems([]); } else setStatus('Error creating order');
  };
  const subtotal = items.reduce((a,b)=> a + (b.unitPriceExVatGBP||0)*b.qty, 0);
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 card">
        <h1 className="text-xl font-semibold mb-3">Cart</h1>
        {items.length===0 ? <p>Your cart is empty.</p> : (
          <ul className="divide-y">{items.map((it,i)=>(<li key={i} className="py-3 flex items-center justify-between"><div><div className="font-medium">{it.title}</div><div className="text-sm text-gray-500">Qty {it.qty} {it.variant?.size && `• ${it.variant.size}`} {it.variant?.color && `• ${it.variant.color}`}</div></div><button className="text-sm underline" onClick={()=>remove(i)}>Remove</button></li>))}</ul>
        )}
      </div>
      <div className="card space-y-3">
        <div><label className="label">Email for confirmation</label><input className="input" value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div><label className="label">Currency</label><select className="input" value={currency} onChange={e=>setCurrency(e.target.value)}><option>GBP</option><option>EUR</option><option>USD</option></select></div>
        <div><label className="label">Shipping Zone</label><select className="input" value={zone} onChange={e=>setZone(e.target.value)}><option>UK</option><option>EU</option><option>USA</option></select></div>
        <div className="text-sm text-gray-600">Subtotal (ex VAT, GBP): £{subtotal.toFixed(2)}</div>
        <button className="btn btn-primary w-full" onClick={checkout}>Checkout (email only)</button>
        <div className="text-sm">{status}</div>
      </div>
    </div>
  );
}
