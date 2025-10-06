'use client';
import { useState, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const blank = { fullName:'', line1:'', line2:'', city:'', region:'', postcode:'', country:'', phone:'' };

// NO-OP logger: preserves call sites without printing
const log = () => {};

export default function RegisterPage() {
  const router = useRouter();

  // mirror the structure of the debug version
  const renderCount = useRef(0); renderCount.current++; log('RENDER x', renderCount.current);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [shipSame, setShipSame] = useState(true);
  const [billing, setBilling] = useState({ ...blank });
  const [shipping, setShipping] = useState({ ...blank });
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onB = (k,v)=>{ log('billing',k,'->',v); setBilling(p=>({ ...p, [k]: v })); };
  const onS = (k,v)=>{ log('shipping',k,'->',v); setShipping(p=>({ ...p, [k]: v })); };

  const submit = async () => {
    if (submitting) return;
    if (password !== confirm) { setStatus('Passwords do not match'); return; }
    setSubmitting(true);
    setStatus('Creating account…');

    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          billing,
          shipping: shipSame ? billing : shipping,
          shipSame,
        }),
      });

      if (!r.ok) {
        const txt = await r.text();
        setStatus(txt || 'Failed to register');
        setSubmitting(false);
        return;
      }

      const res = await signIn('credentials', { redirect: false, email, password });
      if (res?.ok) router.push('/account');
      else router.push('/login');
    } catch {
      setStatus('Network error');
      setSubmitting(false);
    }
  };

  return (
    <div className="card max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Create account</h1>

      {/* keep same layout as debug (no <form>) */}
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Name" value={name} onChange={v=>{log('name ->',v); setName(v);}} autoComplete="name" />

        <Field label="Email" value={email} onChange={v=>{log('email ->',v); setEmail(v);}} autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={v=>{log('password ->',v); setPassword(v);}} autoComplete="new-password" />
        <div className="md:col-span-2">
          <Field label="Confirm" type="password" value={confirm} onChange={v=>{log('confirm ->',v); setConfirm(v);}} autoComplete="new-password" />
        </div>

        <div className="md:col-span-2 border rounded-xl p-3">
          <div className="font-medium mb-2">Billing</div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Full name" value={billing.fullName} onChange={v=>onB('fullName',v)} autoComplete="name" />
            <Field label="Phone" value={billing.phone} onChange={v=>onB('phone',v)} autoComplete="tel" />
            <Field label="Address line 1" value={billing.line1} onChange={v=>onB('line1',v)} autoComplete="address-line1" />
            <Field label="Address line 2" value={billing.line2} onChange={v=>onB('line2',v)} autoComplete="address-line2" />
            <Field label="City" value={billing.city} onChange={v=>onB('city',v)} autoComplete="address-level2" />
            <Field label="Region/State" value={billing.region} onChange={v=>onB('region',v)} autoComplete="address-level1" />
            <Field label="Postcode" value={billing.postcode} onChange={v=>onB('postcode',v)} autoComplete="postal-code" />
            <Field label="Country" value={billing.country} onChange={v=>onB('country',v)} autoComplete="country-name" />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={shipSame}
              onChange={e=>{
                const checked = e.target.checked;
                setShipSame(checked);
                if (checked) setShipping(billing); // mirror once
              }}
            />
            Shipping address is the same as billing
          </label>
        </div>

        {!shipSame && (
          <div className="md:col-span-2 border rounded-xl p-3">
            <div className="font-medium mb-2">Shipping</div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Full name" value={shipping.fullName} onChange={v=>onS('fullName',v)} autoComplete="name" />
              <Field label="Phone" value={shipping.phone} onChange={v=>onS('phone',v)} autoComplete="tel" />
              <Field label="Address line 1" value={shipping.line1} onChange={v=>onS('line1',v)} autoComplete="address-line1" />
              <Field label="Address line 2" value={shipping.line2} onChange={v=>onS('line2',v)} autoComplete="address-line2" />
              <Field label="City" value={shipping.city} onChange={v=>onS('city',v)} autoComplete="address-level2" />
              <Field label="Region/State" value={shipping.region} onChange={v=>onS('region',v)} autoComplete="address-level1" />
              <Field label="Postcode" value={shipping.postcode} onChange={v=>onS('postcode',v)} autoComplete="postal-code" />
              <Field label="Country" value={shipping.country} onChange={v=>onS('country',v)} autoComplete="country-name" />
            </div>
          </div>
        )}

        <div className="md:col-span-2 flex justify-end gap-2">
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </div>

      {!!status && <div className="text-sm mt-2">{status}</div>}
    </div>
  );
}

function Field({ label, value, onChange, type='text', autoComplete }) {
  log('[Field]', label, 'render value =', value);
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={value ?? ''}
        onChange={e => { log('[Field]', label, 'onChange ->', e.target.value); onChange(e.target.value); }}
        autoComplete={autoComplete}
      />
    </div>
  );
}