'use client';
import { useEffect, useRef, useState } from 'react';

const blankAddr = { fullName:'', line1:'', line2:'', city:'', region:'', postcode:'', country:'', phone:'' };

export default function AccountPage(){
  // Local form state (separate from server “me”)
  const [form,setForm] = useState({
    name: '',
    email: '',
    addresses: { billing: {...blankAddr}, shipping: {...blankAddr} },
    sameAsBilling: false,
  });

  const [orders,setOrders] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');

  // Load once
  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try {
        // Load profile
        const rMe = await fetch('/api/me', { cache: 'no-store' });
        if (!rMe.ok) {
          if (rMe.status === 401) { setError('Please log in to view your account.'); return; }
          throw new Error('Failed to load profile');
        }
        const me = await rMe.json();

        // Seed local form (ONCE)
        const billing = { ...blankAddr, ...(me.addresses?.billing || {}) };
        const shipping = { ...blankAddr, ...(me.addresses?.shipping || {}) };
        const same = JSON.stringify(billing) === JSON.stringify(shipping);

        if (!cancelled) {
          setForm({
            name: me.name || '',
            email: me.email || '',
            addresses: { billing, shipping },
            sameAsBilling: same,
          });
        }

        // Load orders (don’t crash UI if it fails)
        const rOrders = await fetch('/api/account/orders', { cache:'no-store' });
        if (rOrders.ok) {
          const list = await rOrders.json();
          if (!cancelled) setOrders(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Error loading account');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return ()=>{ cancelled = true; };
  }, []);

  const setBilling = (k,v)=>setForm(p=>({ ...p, addresses:{ ...p.addresses, billing:{ ...p.addresses.billing, [k]: v }}}));
  const setShipping = (k,v)=>setForm(p=>({ ...p, addresses:{ ...p.addresses, shipping:{ ...p.addresses.shipping, [k]: v }}}));
  const toggleSame = (checked)=>setForm(p=>({
    ...p,
    sameAsBilling: checked,
    addresses: {
      ...p.addresses,
      shipping: checked ? { ...p.addresses.billing } : p.addresses.shipping,
    }
  }));

  const save = async ()=>{
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        addresses: {
          billing: form.addresses.billing,
          shipping: form.sameAsBilling ? form.addresses.billing : form.addresses.shipping,
        },
      };
      const r = await fetch('/api/me', {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Failed to save changes');
      // Optionally re-sync name/email from server response
      const updated = await r.json();
      setForm(f=>({
        ...f,
        name: updated.name || f.name,
        email: updated.email || f.email,
      }));
    } catch (e) {
      setError(e.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n,c='GBP') => (n??0).toLocaleString(undefined,{style:'currency',currency:c});

  if (loading) return <div className="card">Loading…</div>;
  if (error) return <div className="card text-red-600">{error}</div>;

  const { billing, shipping } = form.addresses;

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="card">
        <h2 className="font-semibold mb-3">Profile</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Name" value={form.name} onChange={v=>setForm(p=>({...p, name:v}))} autoComplete="name" />
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} disabled />
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Billing address</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Full name" value={billing.fullName} onChange={v=>setBilling('fullName',v)} autoComplete="name"/>
            <Field label="Phone" value={billing.phone} onChange={v=>setBilling('phone',v)} autoComplete="tel"/>
            <Field label="Address line 1" value={billing.line1} onChange={v=>setBilling('line1',v)} autoComplete="address-line1"/>
            <Field label="Address line 2" value={billing.line2} onChange={v=>setBilling('line2',v)} autoComplete="address-line2"/>
            <Field label="City" value={billing.city} onChange={v=>setBilling('city',v)} autoComplete="address-level2"/>
            <Field label="Region/State" value={billing.region} onChange={v=>setBilling('region',v)} autoComplete="address-level1"/>
            <Field label="Postcode" value={billing.postcode} onChange={v=>setBilling('postcode',v)} autoComplete="postal-code"/>
            <Field label="Country" value={billing.country} onChange={v=>setBilling('country',v)} autoComplete="country-name"/>
          </div>

          <label className="flex items-center gap-2 mt-3">
            <input
              type="checkbox"
              checked={form.sameAsBilling}
              onChange={e=>toggleSame(e.target.checked)}
            />
            <span>Shipping address is the same as billing</span>
          </label>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Shipping address</h3>
          {form.sameAsBilling ? (
            <p className="text-sm text-gray-600">Using billing address.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Full name" value={shipping.fullName} onChange={v=>setShipping('fullName',v)} autoComplete="name"/>
              <Field label="Phone" value={shipping.phone} onChange={v=>setShipping('phone',v)} autoComplete="tel"/>
              <Field label="Address line 1" value={shipping.line1} onChange={v=>setShipping('line1',v)} autoComplete="address-line1"/>
              <Field label="Address line 2" value={shipping.line2} onChange={v=>setShipping('line2',v)} autoComplete="address-line2"/>
              <Field label="City" value={shipping.city} onChange={v=>setShipping('city',v)} autoComplete="address-level2"/>
              <Field label="Region/State" value={shipping.region} onChange={v=>setShipping('region',v)} autoComplete="address-level1"/>
              <Field label="Postcode" value={shipping.postcode} onChange={v=>setShipping('postcode',v)} autoComplete="postal-code"/>
              <Field label="Country" value={shipping.country} onChange={v=>setShipping('country',v)} autoComplete="country-name"/>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Orders */}
{/* Orders */}
      <div className="card">
        <h2 className="font-semibold mb-3">Past orders</h2>
        {orders.length===0 ? <div>No orders yet.</div> : (
          <ul className="divide-y">
            {orders.map(o=>(
              <li key={o._id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xs break-all">{o._id}</div>
                  <div className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">
                      {(o.totals?.grandTotalDisplay ?? o.totals?.grandTotalGBP)?.toLocaleString(
                        undefined, { style:'currency', currency: o.currency || 'GBP' }
                      )}
                    </div>
                    <div className="text-sm capitalize">{o.status}</div>
                  </div>
                  <a className="btn" href={`/account/orders/${o._id}`}>View</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, autoComplete }){
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={value ?? ''}               // always a string
        onChange={e=>onChange(e.target.value)}
        autoComplete={autoComplete}
      />
    </div>
  );
}