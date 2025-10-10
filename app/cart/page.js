// app/cart/page.js
'use client';
import { useEffect, useMemo, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

const blank = { fullName:'', line1:'', line2:'', city:'', region:'', postcode:'', country:'', phone:'' };

export default function CartPage(){
  const { data: session } = useSession();

  // cart + settings
  const [items, setItems] = useState([]); // each will become { ..., maxStock?: number }
  const [currency, setCurrency] = useState('GBP');
  const [zone, setZone] = useState('UK');
  const [vatPercent, setVatPercent] = useState(20);
  const [fx, setFx] = useState({ GBP:1, EUR:1.15, USD:1.28 });
  const [shippingTable, setShippingTable] = useState({});
  const [status, setStatus] = useState('');
  const [freeOverGBP, setFreeOverGBP] = useState({}); // { UK: 50, ... }

  // checkout UX mode
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

  // ---- load cart + SETTINGS + enrich with stock caps ----
  useEffect(() => {
    // 1) base cart from localStorage
    const local = JSON.parse(localStorage.getItem('cart') || '[]');
    setItems(local);

    // 2) settings
    (async () => {
      try {
        const r = await fetch('/api/settings', { cache: 'no-store' });
        const s = await r.json();
        if (typeof s?.vatPercent === 'number') setVatPercent(s.vatPercent);
        if (s?.fx) setFx(s.fx);
        if (s?.shipping) setShippingTable(s.shipping);
        if (s?.freeOverGBP) setFreeOverGBP(s.freeOverGBP);
      } catch {}
    })();

    // 3) enrich each cart line with maxStock from server
    (async () => {
      try {
        const ids = [...new Set(local.map(l => l.productId).filter(Boolean))];
        const byId = new Map();
        await Promise.all(ids.map(async (pid) => {
          const r = await fetch(`/api/products/by-id/${pid}`, { cache: 'no-store' });
          if (r.ok) byId.set(pid, await r.json());
        }));

        const withCaps = local.map(line => {
          const product = byId.get(line.productId);
          let maxStock = undefined;
          if (product && Array.isArray(product.variants) && line.variantId) {
            const v = product.variants.find(x => String(x._id) === String(line.variantId));
            maxStock = Math.max(0, Number(v?.stock ?? 0));
          }
          const qty = Math.max(1, Math.min(Number(line.qty || 1), Number.isFinite(maxStock) ? maxStock : Infinity));
          return { ...line, maxStock, qty };
        });

        setItems(withCaps);
        localStorage.setItem('cart', JSON.stringify(withCaps));
      } catch (e) {
        console.warn('Failed to enrich cart with stock caps', e);
      }
    })();

    // account prefill
    (async ()=>{
      try {
        if (!session?.user) { setMode('guest'); return; }
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
    })();
  }, [session?.user]);

  // ---- cart actions ----
  const persist = (arr)=>{ setItems(arr); localStorage.setItem('cart', JSON.stringify(arr)); };

  const remove = (i) => {
    const c = items.slice();
    c.splice(i, 1);
    persist(c);
  };

  const setQtyAt = (index, nextQtyRaw) => {
    const next = Math.max(1, parseInt(nextQtyRaw || '1', 10));
    const line = items[index];
    const cap = Number.isFinite(line?.maxStock) ? line.maxStock : Infinity;
    const qty = Math.min(next, cap);
    const c = items.slice();
    c[index] = { ...line, qty };
    persist(c);
  };

  // FX helpers
  const fxRate = useMemo(() => fx?.[currency] ?? 1, [fx, currency]);
  const toDisplay = (gbp) => +(gbp * fxRate).toFixed(2);

  // pricing helpers (GBP baseline)
  const itemVat = (it) => (typeof it.vatPercent === 'number' ? it.vatPercent : vatPercent);
  const unitExGBP = (it) => (it.unitPriceExVatGBP || 0);
  const unitIncGBP = (it) => +((unitExGBP(it) * (1 + itemVat(it) / 100))).toFixed(2);

  // in selected currency
  const unitExDisp = (it) => toDisplay(unitExGBP(it));
  const unitIncDisp = (it) => toDisplay(unitIncGBP(it));
  const lineExGBP  = (it) => +((unitExGBP(it) * (it.qty || 1))).toFixed(2);
  const lineIncGBP = (it) => +((unitIncGBP(it) * (it.qty || 1))).toFixed(2);
  const lineExDisp  = (it) => toDisplay(lineExGBP(it));
  const lineIncDisp = (it) => toDisplay(lineIncGBP(it));

  // totals (GBP baseline)
  const subtotalExGBP = useMemo(
    () => items.reduce((a,b)=> a + (unitExGBP(b) * (b.qty || 1)), 0),
    [items]
  );
  const vatAmountGBP = useMemo(
    () => +(subtotalExGBP * (vatPercent/100)).toFixed(2),
    [subtotalExGBP, vatPercent]
  );

  // ----- Free delivery threshold (based on subtotal + VAT) -----
  const thresholdGBP = Number(freeOverGBP?.[zone] ?? 0);
  const thresholdBasisGBP = subtotalExGBP + vatAmountGBP; // inc VAT
  const qualifiesForFree = thresholdGBP > 0 && thresholdBasisGBP >= thresholdGBP;
  const remainingForFreeGBP = thresholdGBP > 0 && !qualifiesForFree
    ? +(thresholdGBP - thresholdBasisGBP).toFixed(2)
    : 0;
  const remainingForFreeDisp = toDisplay(remainingForFreeGBP);

  // shipping (GBP base)
  const shippingGBPBase = useMemo(() => {
    const flat = Number(shippingTable?.[zone]?.GBP ?? 0);
    if (qualifiesForFree) return 0; // FREE!
    return flat;
  }, [shippingTable, zone, qualifiesForFree]);

  const shippingDisp = useMemo(() => {
    if (shippingGBPBase === 0) return 0;
    const explicit = shippingTable?.[zone]?.[currency];
    if (typeof explicit === 'number') return +explicit.toFixed(2);
    return toDisplay(shippingGBPBase);
  }, [shippingTable, zone, currency, shippingGBPBase, fxRate]);

  const totalIncGBP = useMemo(
    () => +(subtotalExGBP + vatAmountGBP + shippingGBPBase).toFixed(2),
    [subtotalExGBP, vatAmountGBP, shippingGBPBase]
  );

  // display currency totals
  const subtotalExDisp = toDisplay(subtotalExGBP);
  const vatAmountDisp  = toDisplay(vatAmountGBP);
  const totalIncDisp   = +(subtotalExDisp + vatAmountDisp + shippingDisp).toFixed(2);

  const fmt = (n) => n.toLocaleString(undefined, { style:'currency', currency });

  // inline login
  const doLogin = async () => {
    setLoggingIn(true);
    setStatus('');
    const res = await signIn('credentials', { redirect:false, email: loginEmail, password: loginPassword });
    setLoggingIn(false);
    if (res?.ok) setLoginPassword('');
    else setStatus('Login failed. Check email/password.');
  };

  // checkout
  const checkout = async ()=>{
    setStatus('Processing...');
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
        saveToAccount: !!session?.user,
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
            {items.map((it, i) => {
              const cap = Number.isFinite(it.maxStock) ? it.maxStock : undefined;
              const atCap = cap !== undefined && (it.qty || 1) >= cap;
              const oos = cap === 0;
              return (
                <li key={i} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {it.image ? (
                      <img src={it.image} alt={it.title} className="w-14 h-14 object-cover rounded-lg border" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg border bg-gray-100" />
                    )}
                    <div>
                      <div className="font-medium">
                        {it.title}
                        {oos && <span className="ml-2 text-[11px] uppercase bg-black text-white px-1.5 py-0.5 rounded">Out of stock</span>}
                      </div>

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
                          max={cap ?? undefined}
                          value={it.qty || 1}
                          onChange={(e) => setQtyAt(i, e.target.value)}
                        />
                        <button className="px-2 py-1 border rounded-lg"
                          onClick={() => setQtyAt(i, (it.qty || 1) + 1)}
                          disabled={oos || atCap}
                          aria-label="Increase quantity">+</button>
                        <span className="text-sm text-gray-500">
                          {it.variant?.size && <> • {it.variant.size}</>}
                          {it.variant?.color && <> • {it.variant.color}</>}
                        </span>
                      </div>

                      {/* stock hint */}
                      {cap !== undefined && cap > 0 && (
                        <div className="text-xs text-gray-500 mt-0.5">Only {cap} left</div>
                      )}

                      {/* per-item prices in selected currency */}
                      <div className="text-xs text-gray-500 mt-1">
                        Unit: {fmt(unitExDisp(it))} ex VAT • {fmt(unitIncDisp(it))} inc VAT
                      </div>
                      <div className="text-xs text-gray-500">
                        Line: {fmt(lineExDisp(it))} ex VAT • {fmt(lineIncDisp(it))} inc VAT
                      </div>
                    </div>
                  </div>

                  <button className="text-sm underline" onClick={() => remove(i)}>Remove</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Summary / Checkout */}
      <div className="card space-y-4">
        <div className="border rounded-xl p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal (ex VAT)</span>
            <span className="font-medium">{fmt(subtotalExDisp)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT ({vatPercent}%)</span>
            <span className="font-medium">{fmt(vatAmountDisp)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span className="font-medium">
              {shippingGBPBase === 0 ? 'Free' : fmt(shippingDisp)}
            </span>
          </div>

          {/* Free delivery nudge */}
          {thresholdGBP > 0 && !qualifiesForFree && remainingForFreeGBP > 0 && (
            <div className="text-xs text-gray-600 mt-1">
              Spend {fmt(remainingForFreeDisp)} more to get <span className="font-medium">free delivery</span>.
            </div>
          )}
          {thresholdGBP > 0 && qualifiesForFree && (
            <div className="text-xs text-green-700 mt-1">
              You’ve unlocked free delivery 🎉
            </div>
          )}

          <div className="flex justify-between text-base pt-1 border-t mt-1">
            <span className="font-semibold">Total (inc VAT)</span>
            <span className="font-semibold">{fmt(totalIncDisp)}</span>
          </div>
        </div>

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