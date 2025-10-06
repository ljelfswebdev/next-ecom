'use client';
import { useEffect, useMemo, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

const blank = { fullName:'', line1:'', line2:'', city:'', region:'', postcode:'', country:'', phone:'' };

export default function CartPage(){
  const { data: session } = useSession();

  // cart + settings
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState('GBP');
  const [zone, setZone] = useState('UK');
  const [vatPercent, setVatPercent] = useState(20); // default
  const [status, setStatus] = useState('');

  // checkout UX mode
  // 'account' if logged in, 'guest' for guest checkout, 'login' to show inline login
  const [mode, setMode] = useState('guest');

  // guest / account form state
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [billing, setBilling] = useState({ ...blank });
  const [shipping, setShipping] = useState({ ...blank });
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // inline login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // load cart + VAT + prefill from account (if logged in)
  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('cart') || '[]'));

    fetch('/api/settings').then(r => r.json()).then(s => {
      if (typeof s?.vatPercent === 'number') setVatPercent(s.vatPercent);
    }).catch(()=>{});

    // if logged in, switch mode and prefill from account
    const primeFromAccount = async ()=>{
      try {
        const r = await fetch('/api/me', { cache:'no-store' });
        if (!r.ok) return;
        const me = await r.json();
        setMode('account');
        setEmail(me.email || '');
        setCustomerName(me.name || '');
        const bill = { ...blank, ...(me.addresses?.billing || {}) };
        const ship = { ...blank, ...(me.addresses?.shipping || {}) };
        setBilling(bill);
        setShipping(ship);
        setSameAsBilling(JSON.stringify(bill) === JSON.stringify(ship));
      } catch {}
    };

    if (session?.user) {
      primeFromAccount();
    } else {
      setMode('guest'); // default when not logged in
    }
  }, [session?.user]);

  // cart actions
  const remove = (i) => {
    const c = items.slice();
    c.splice(i, 1);
    setItems(c);
    localStorage.setItem('cart', JSON.stringify(c));
  };

  const setQtyAt = (index, nextQty) => {
    const qty = Math.max(1, parseInt(nextQty || '1', 10));
    const c = items.slice();
    c[index] = { ...c[index], qty };
    setItems(c);
    localStorage.setItem('cart', JSON.stringify(c));
  };

  // pricing helpers (keep your logic)
  const itemVat = (it) =>
    typeof it.vatPercent === 'number' ? it.vatPercent : vatPercent;

  const unitInc = (it) =>
    +(((it.unitPriceExVatGBP || 0) * (1 + itemVat(it) / 100))).toFixed(2);

  const lineEx = (it) =>
    +(((it.unitPriceExVatGBP || 0) * (it.qty || 1))).toFixed(2);

  const lineInc = (it) =>
    +((unitInc(it) * (it.qty || 1))).toFixed(2);

  // totals
  const subtotalEx = useMemo(
    () => items.reduce((a,b)=> a + (b.unitPriceExVatGBP || 0) * (b.qty || 1), 0),
    [items]
  );
  const vatAmount = useMemo(() => +(subtotalEx * (vatPercent/100)).toFixed(2), [subtotalEx, vatPercent]);
  const totalInc = useMemo(() => +(subtotalEx + vatAmount).toFixed(2), [subtotalEx, vatAmount]);

  const fmt = (n) => n.toLocaleString(undefined, { style:'currency', currency });

  // inline login
  const doLogin = async () => {
    setLoggingIn(true);
    setStatus('');
    const res = await signIn('credentials', { redirect:false, email: loginEmail, password: loginPassword });
    setLoggingIn(false);
    if (res?.ok) {
      // session effect will prefill + set mode('account')
      setLoginPassword('');
    } else {
      setStatus('Login failed. Check email/password.');
    }
  };

  // checkout
  const checkout = async ()=>{
    setStatus('Processing...');

    // choose address payload
    const bill = billing;
    const ship = sameAsBilling ? billing : shipping;
    const orderEmail = email;

    if (!orderEmail) { setStatus('Enter an email.'); return; }

    const r = await fetch('/api/orders', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        email: orderEmail,
        customerName,
        items,
        currency,
        zone,
        billingAddress: bill,
        shippingAddress: ship,
        saveToAccount: !!session?.user, // if logged in, let API update profile addresses too
      })
    });
    if(r.ok){
      setStatus('Success! Confirmation email sent.');
      localStorage.removeItem('cart'); setItems([]);
    }else{
      const text = await r.text().catch(()=> '');
      setStatus(text || 'Error creating order');
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Items */}
      <div className="md:col-span-2 card">
        <h1 className="text-xl font-semibold mb-3">Cart</h1>

        {items.length===0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul className="divide-y">
            {items.map((it, i) => (
              <li key={i} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {it.image ? (
                    <img src={it.image} alt={it.title} className="w-14 h-14 object-cover rounded-lg border" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border bg-gray-100" />
                  )}
                  <div>
                    <div className="font-medium">{it.title}</div>

                    {/* qty controls */}
                    <div className="flex items-center gap-2 mt-1">
                      <button className="px-2 py-1 border rounded-lg"
                        onClick={() => setQtyAt(i, (it.qty || 1) - 1)}
                        disabled={(it.qty || 1) <= 1}
                        aria-label="Decrease quantity">–</button>
                      <input
                        type="number"
                        className="w-16 input"
                        min={1}
                        value={it.qty || 1}
                        onChange={(e) => setQtyAt(i, e.target.value)}
                      />
                      <button className="px-2 py-1 border rounded-lg"
                        onClick={() => setQtyAt(i, (it.qty || 1) + 1)}
                        aria-label="Increase quantity">+</button>
                      <span className="text-sm text-gray-500">
                        {it.variant?.size && <> • {it.variant.size}</>}
                        {it.variant?.color && <> • {it.variant.color}</>}
                      </span>
                    </div>

                    {/* per-item prices */}
                    <div className="text-xs text-gray-500 mt-1">
                      Unit: {fmt(it.unitPriceExVatGBP || 0)} ex VAT • {fmt(unitInc(it))} inc VAT
                    </div>
                    <div className="text-xs text-gray-500">
                      Line: {fmt(lineEx(it))} ex VAT • {fmt(lineInc(it))} inc VAT
                    </div>
                  </div>
                </div>

                <button className="text-sm underline" onClick={() => remove(i)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Summary / Checkout */}
      <div className="card space-y-4">
        {/* Totals */}
        <div className="border rounded-xl p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal (ex VAT)</span>
            <span className="font-medium">{fmt(subtotalEx)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT ({vatPercent}%)</span>
            <span className="font-medium">{fmt(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-base pt-1 border-t mt-1">
            <span className="font-semibold">Total (inc VAT)</span>
            <span className="font-semibold">{fmt(totalInc)}</span>
          </div>
        </div>

        {/* Currency / Zone */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={e=>setCurrency(e.target.value)}>
              <option>GBP</option><option>EUR</option><option>USD</option>
            </select>
          </div>
          <div>
            <label className="label">Shipping Zone</label>
            <select className="input" value={zone} onChange={e=>setZone(e.target.value)}>
              <option>UK</option><option>EU</option><option>USA</option>
            </select>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2">
          <button
            className={`btn w-1/2 ${mode==='guest' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={()=>setMode('guest')}
          >Checkout as guest</button>

          {session?.user ? (
            <button
              className={`btn w-1/2 ${mode==='account' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={()=>setMode('account')}
            >Use my account</button>
          ) : (
            <button
              className={`btn w-1/2 ${mode==='login' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={()=>setMode('login')}
            >Log in</button>
          )}
        </div>

        {/* Mode content */}
        {mode === 'login' && !session?.user && (
          <div className="border rounded-xl p-3 space-y-2">
            <div>
              <label className="label">Email</label>
              <input className="input" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary w-full" onClick={doLogin} disabled={loggingIn}>
              {loggingIn ? 'Logging in…' : 'Login and use my account'}
            </button>
          </div>
        )}

        {(mode === 'guest' || (mode === 'account' && !session?.user)) && (
          <GuestBlock
            email={email} setEmail={setEmail}
            customerName={customerName} setCustomerName={setCustomerName}
            billing={billing} setBilling={setBilling}
            shipping={shipping} setShipping={setShipping}
            sameAsBilling={sameAsBilling} setSameAsBilling={setSameAsBilling}
          />
        )}

        {mode === 'account' && session?.user && (
          <p className="text-sm text-gray-600">
            We’ll use your account details and saved addresses. You can edit them on your <a className="underline" href="/account">Account</a> page.
          </p>
        )}

        <button className="btn btn-primary w-full" onClick={checkout}>
          {session?.user && mode==='account' ? 'Checkout with my account' : 'Place order'}
        </button>

        <div className="text-sm">{status}</div>

        {session?.user && (
          <button className="text-xs underline" onClick={()=>signOut({ redirect:false })}>
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

function GuestBlock({
  email, setEmail,
  customerName, setCustomerName,
  billing, setBilling,
  shipping, setShipping,
  sameAsBilling, setSameAsBilling
}) {
  const setB = (k,v)=>setBilling(p=>({ ...p, [k]: v }));
  const setS = (k,v)=>setShipping(p=>({ ...p, [k]: v }));

  return (
    <div className="border rounded-xl p-3 space-y-3">
      <div>
        <label className="label">Email for confirmation</label>
        <input className="input" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div>
        <label className="label">Full name</label>
        <input className="input" value={customerName} onChange={e=>setCustomerName(e.target.value)} autoComplete="name" />
      </div>

      <div className="border rounded-xl p-3">
        <div className="font-medium mb-2">Billing address</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Full name" value={billing.fullName} onChange={v=>setB('fullName',v)} autoComplete="name" />
          <Field label="Phone" value={billing.phone} onChange={v=>setB('phone',v)} autoComplete="tel" />
          <Field label="Address line 1" value={billing.line1} onChange={v=>setB('line1',v)} autoComplete="address-line1" />
          <Field label="Address line 2" value={billing.line2} onChange={v=>setB('line2',v)} autoComplete="address-line2" />
          <Field label="City" value={billing.city} onChange={v=>setB('city',v)} autoComplete="address-level2" />
          <Field label="Region/State" value={billing.region} onChange={v=>setB('region',v)} autoComplete="address-level1" />
          <Field label="Postcode" value={billing.postcode} onChange={v=>setB('postcode',v)} autoComplete="postal-code" />
          <Field label="Country" value={billing.country} onChange={v=>setB('country',v)} autoComplete="country-name" />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={sameAsBilling}
          onChange={e=>{
            const ck = e.target.checked;
            setSameAsBilling(ck);
            if (ck) setShipping(billing);
          }}
        />
        <span>Shipping address is the same as billing</span>
      </label>

      {!sameAsBilling && (
        <div className="border rounded-xl p-3">
          <div className="font-medium mb-2">Shipping address</div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Full name" value={shipping.fullName} onChange={v=>setS('fullName',v)} autoComplete="name" />
            <Field label="Phone" value={shipping.phone} onChange={v=>setS('phone',v)} autoComplete="tel" />
            <Field label="Address line 1" value={shipping.line1} onChange={v=>setS('line1',v)} autoComplete="address-line1" />
            <Field label="Address line 2" value={shipping.line2} onChange={v=>setS('line2',v)} autoComplete="address-line2" />
            <Field label="City" value={shipping.city} onChange={v=>setS('city',v)} autoComplete="address-level2" />
            <Field label="Region/State" value={shipping.region} onChange={v=>setS('region',v)} autoComplete="address-level1" />
            <Field label="Postcode" value={shipping.postcode} onChange={v=>setS('postcode',v)} autoComplete="postal-code" />
            <Field label="Country" value={shipping.country} onChange={v=>setS('country',v)} autoComplete="country-name" />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, autoComplete }){
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        value={value ?? ''}
        onChange={e=>onChange(e.target.value)}
        autoComplete={autoComplete}
      />
    </div>
  );
}