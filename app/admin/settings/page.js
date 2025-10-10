// app/admin/settings/page.js
'use client';

import { useEffect, useState } from 'react';

const ZONES = ['UK'];
const CURRS = ['GBP'];

const newCoupon = () => ({
  code: '',
  type: 'percent',          // 'percent' | 'fixed'
  amount: 10,               // number
  appliesTo: { scope: 'all', ids: [] }, // scope: 'all' | 'categories' | 'products'
  validFrom: '',
  validTo: '',
  usageLimit: 0,            // 0 = unlimited
  enabled: true,
});

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    vatPercent: 20,
    fx: { GBP: 1, EUR: 1.15, USD: 1.28 },
    shipping: { UK:{GBP:2.99}, EU:{GBP:0}, USA:{GBP:0} },  // base amounts in GBP; server can derive others
    freeOverGBP: { UK: 50, EU: 0, USA: 0 },
    supportedCurrencies: ['GBP'],
    storeName: '',
    supportEmail: '',
    storeAddress: '',
    contactNumber: '',
    coupons: [],
  });

  // load current settings (admin endpoint)
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await fetch('/api/admin/settings', { cache: 'no-store' });
        if (!r.ok) throw new Error(await r.text());
        const s = await r.json();

        if (dead) return;
        setForm({
          vatPercent: typeof s?.vatPercent === 'number' ? s.vatPercent : 20,
          fx: s?.fx || { GBP:1, EUR:1.15, USD:1.28 },
          shipping: s?.shipping || { UK:{GBP:2.99}, EU:{GBP:0}, USA:{GBP:0} },
          freeOverGBP: s?.freeOverGBP || { UK:50, EU:0, USA:0 },
          supportedCurrencies: s?.supportedCurrencies || ['GBP','EUR','USD'],
          storeName: s?.storeName || '',
          supportEmail: s?.supportEmail || '',
          storeAddress: s?.storeAddress || '',
          contactNumber: s?.contactNumber || '',
          coupons: Array.isArray(s?.coupons) ? s.coupons : [],
        });
      } catch (e) {
        setError(e.message || 'Failed to load settings');
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, []);

  const setShip = (zone, curr, val) =>
    setForm(p => ({
      ...p,
      shipping: {
        ...p.shipping,
        [zone]: { ...(p.shipping?.[zone] || {}), [curr]: safeNum(val) },
      },
    }));

  const setFreeOver = (zone, val) =>
    setForm(p => ({
      ...p,
      freeOverGBP: { ...(p.freeOverGBP || {}), [zone]: safeNum(val) },
    }));

  const updateCoupon = (i, patch) =>
    setForm(p => {
      const next = [...(p.coupons || [])];
      next[i] = { ...next[i], ...patch };
      return { ...p, coupons: next };
    });

  const removeCoupon = (i) =>
    setForm(p => {
      const next = [...(p.coupons || [])];
      next.splice(i, 1);
      return { ...p, coupons: next };
    });

  const addCoupon = () =>
    setForm(p => ({ ...p, coupons: [...(p.coupons || []), newCoupon()] }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = sanitize(form);
      const r = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      alert('Settings saved');
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card">Loading…</div>;
  if (error) return <div className="card text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">Store settings</h1>

        {/* Store info */}
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Store name" value={form.storeName} onChange={v=>setForm(p=>({...p, storeName:v}))} />
          <Field label="Support email (from/reply-to)" value={form.supportEmail} onChange={v=>setForm(p=>({...p, supportEmail:v}))} />
          <Field label="Phone" value={form.contactNumber} onChange={v=>setForm(p=>({...p, contactNumber:v}))} />
          <div className="md:col-span-2">
            <label className="label">Store address (for emails/invoices)</label>
            <textarea className="input" rows={3} value={form.storeAddress} onChange={e=>setForm(p=>({...p, storeAddress:e.target.value}))} />
          </div>
        </div>

        {/* VAT */}
        <div className="mt-4">
          <label className="label">VAT percent</label>
          <input type="number" step="0.1" className="input w-40" value={form.vatPercent}
                 onChange={e=>setForm(p=>({...p, vatPercent: safeNum(e.target.value)}))}/>
        </div>

        {/* Shipping + Free over */}
        <div className="mt-4 grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-semibold mb-2">Flat delivery (base amounts)</div>
            <div className="space-y-2">
              {ZONES.map(z => (
                <div key={z} className="grid grid-cols-[70px_repeat(3,1fr)] gap-2 items-center">
                  <div className="text-sm text-gray-500">{z}</div>
                  {CURRS.map(c => (
                    <div key={c} className="flex items-center gap-2">
                      <span className="text-xs w-10">{c}</span>
                      <input
                        type="number" step="0.01"
                        className="input"
                        value={form.shipping?.[z]?.[c] ?? ''}
                        onChange={e=>setShip(z, c, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">Free delivery threshold (GBP)</div>
            <div className="space-y-2">
              {ZONES.map(z => (
                <div key={z} className="flex items-center gap-3">
                  <div className="text-sm text-gray-500 w-12">{z}</div>
                  <input
                    type="number" step="0.01"
                    className="input"
                    value={form.freeOverGBP?.[z] ?? 0}
                    onChange={e=>setFreeOver(z, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coupons */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Coupons</h2>
            <button className="btn" onClick={addCoupon}>+ Add coupon</button>
          </div>

          {(!form.coupons || form.coupons.length === 0) ? (
            <p className="text-sm text-gray-500 mt-2">No coupons yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {form.coupons.map((c, i) => (
                <div key={i} className="border rounded-xl p-3">
                  <div className="grid md:grid-cols-4 gap-2">
                    <Field label="Code" value={c.code} onChange={v=>updateCoupon(i, { code: v.toUpperCase().replace(/\s+/g,'') })} />
                    <div>
                      <label className="label">Type</label>
                      <select className="input" value={c.type} onChange={e=>updateCoupon(i, { type: e.target.value })}>
                        <option value="percent">Percent %</option>
                        <option value="fixed">Fixed £</option>
                      </select>
                    </div>
                    <Field label={c.type==='percent' ? 'Amount %' : 'Amount £'}
                           type="number" step="0.01"
                           value={c.amount}
                           onChange={v=>updateCoupon(i, { amount: safeNum(v) })} />
                    <div className="flex items-end">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={!!c.enabled}
                               onChange={e=>updateCoupon(i, { enabled: e.target.checked })}/>
                        Enabled
                      </label>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-2 mt-2">
                    <div>
                      <label className="label">Applies to</label>
                      <select
                        className="input"
                        value={c.appliesTo?.scope || 'all'}
                        onChange={e=>updateCoupon(i, { appliesTo: { scope: e.target.value, ids: [] } })}
                      >
                        <option value="all">All products</option>
                        <option value="categories">Categories (IDs)</option>
                        <option value="products">Products (IDs)</option>
                      </select>
                    </div>
                    {(c.appliesTo?.scope === 'categories' || c.appliesTo?.scope === 'products') && (
                      <Field
                        label="IDs (comma separated)"
                        value={(c.appliesTo?.ids || []).join(',')}
                        onChange={v=>updateCoupon(i, { appliesTo: { ...c.appliesTo, ids: v.split(',').map(s=>s.trim()).filter(Boolean) } })}
                      />
                    )}
                    <Field label="Usage limit (0 = unlimited)"
                           type="number"
                           value={c.usageLimit ?? 0}
                           onChange={v=>updateCoupon(i, { usageLimit: Math.max(0, parseInt(v||'0', 10)) })}/>
                  </div>

                  <div className="grid md:grid-cols-2 gap-2 mt-2">
                    <Field label="Valid from (YYYY-MM-DD)" value={c.validFrom || ''} onChange={v=>updateCoupon(i, { validFrom: v })}/>
                    <Field label="Valid to (YYYY-MM-DD)" value={c.validTo || ''} onChange={v=>updateCoupon(i, { validTo: v })}/>
                  </div>

                  <div className="flex justify-end mt-2">
                    <button className="btn" onClick={()=>removeCoupon(i)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type='text', step, ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        step={step}
        value={value ?? ''}
        onChange={(e)=>onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

function safeNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// --- add this helper ---
function sanitize(f) {
  const norms = (n) => (Number.isFinite(n) ? n : 0);

  // ensure objects exist
  const fxIn = f?.fx || {};
  const shipIn = f?.shipping || {};
  const freeIn = f?.freeOverGBP || {};
  const couponsIn = Array.isArray(f?.coupons) ? f.coupons : [];

  // normalize coupons
  const coupons = couponsIn
    .map((c) => ({
      code: String(c?.code || '').toUpperCase().replace(/\s+/g, ''),
      type: c?.type === 'fixed' ? 'fixed' : 'percent',
      amount: parseFloat(c?.amount) || 0,
      appliesTo: {
        scope: ['all', 'categories', 'products'].includes(c?.appliesTo?.scope)
          ? c.appliesTo.scope
          : 'all',
        ids: Array.isArray(c?.appliesTo?.ids)
          ? c.appliesTo.ids.map(String).filter(Boolean)
          : [],
      },
      validFrom: c?.validFrom || '',
      validTo: c?.validTo || '',
      usageLimit: Math.max(0, parseInt(c?.usageLimit || 0, 10)),
      enabled: !!c?.enabled,
    }))
    .filter((c) => c.code && c.amount > 0);

  // normalize shipping per ZONE/CURR constants from this file
  const shipping = {};
  for (const z of ZONES) {
    shipping[z] = shipping[z] || {};
    for (const c of CURRS) {
      const v = parseFloat(shipIn?.[z]?.[c]);
      if (Number.isFinite(v)) shipping[z][c] = +v.toFixed(2);
    }
  }

  const freeOverGBP = {};
  for (const z of ZONES) {
    const v = parseFloat(freeIn?.[z]);
    freeOverGBP[z] = Number.isFinite(v) ? +v.toFixed(2) : 0;
  }

  return {
    vatPercent: parseFloat(f?.vatPercent) || 0,
    fx: {
      GBP: norms(parseFloat(fxIn.GBP)),
      EUR: norms(parseFloat(fxIn.EUR)),
      USD: norms(parseFloat(fxIn.USD)),
    },
    shipping,
    freeOverGBP,
    supportedCurrencies: Array.isArray(f?.supportedCurrencies) && f.supportedCurrencies.length
      ? f.supportedCurrencies
      : ['GBP', 'EUR', 'USD'],
    storeName: String(f?.storeName || '').trim(),
    supportEmail: String(f?.supportEmail || '').trim(),
    storeAddress: String(f?.storeAddress || '').trim(),
    contactNumber: String(f?.contactNumber || '').trim(),
    coupons,
  };
}
// --- end helper ---