'use client';
import { useEffect, useMemo, useState } from 'react';

export default function CartPage(){
  const [items, setItems] = useState([]);
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [zone, setZone] = useState('UK');
  const [status, setStatus] = useState('');
  const [vatPercent, setVatPercent] = useState(20); // default 20%

  // load cart + VAT settings
  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('cart') || '[]'));
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (typeof s?.vatPercent === 'number') setVatPercent(s.vatPercent);
    }).catch(() => {});
  }, []);

  const remove = (i) => {
    const c = items.slice();
    c.splice(i, 1);
    setItems(c);
    localStorage.setItem('cart', JSON.stringify(c));
  };

  const setQtyAt = (index, nextQty) => {
  const qty = Math.max(1, parseInt(nextQty || '1', 10)); // min 1
  const c = items.slice();
  c[index] = { ...c[index], qty };
  setItems(c);
  localStorage.setItem('cart', JSON.stringify(c));
};

  const itemVat = (it) =>
  typeof it.vatPercent === 'number' ? it.vatPercent : vatPercent;

  const unitInc = (it) =>
    +(((it.unitPriceExVatGBP || 0) * (1 + itemVat(it) / 100))).toFixed(2);

  const lineEx = (it) =>
    +(((it.unitPriceExVatGBP || 0) * (it.qty || 1))).toFixed(2);

  const lineInc = (it) =>
    +((unitInc(it) * (it.qty || 1))).toFixed(2);
  const checkout = async ()=>{
    setStatus('Processing...');
    const r = await fetch('/api/orders', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, items, currency, zone })
    });
    if(r.ok){
      setStatus('Success! Confirmation email sent.');
      localStorage.removeItem('cart'); setItems([]);
    }else{
      setStatus('Error creating order');
    }
  };

  // pricing
  const subtotalEx = useMemo(
    () => items.reduce((a,b)=> a + (b.unitPriceExVatGBP || 0) * (b.qty || 1), 0),
    [items]
  );
  const vatAmount = useMemo(() => +(subtotalEx * (vatPercent/100)).toFixed(2), [subtotalEx, vatPercent]);
  const totalInc = useMemo(() => +(subtotalEx + vatAmount).toFixed(2), [subtotalEx, vatAmount]);

  const fmt = (n) => n.toLocaleString(undefined, { style:'currency', currency });

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

      {/* quantity controls */}
      <div className="flex items-center gap-2 mt-1">
        <button
          className="px-2 py-1 border rounded-lg"
          onClick={() => setQtyAt(i, (it.qty || 1) - 1)}
          disabled={(it.qty || 1) <= 1}
          aria-label="Decrease quantity"
        >
          –
        </button>
        <input
          type="number"
          className="w-16 input"
          min={1}
          value={it.qty || 1}
          onChange={(e) => setQtyAt(i, e.target.value)}
        />
        <button
          className="px-2 py-1 border rounded-lg"
          onClick={() => setQtyAt(i, (it.qty || 1) + 1)}
          aria-label="Increase quantity"
        >
          +
        </button>
        {/* show selected options */}
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

      {/* Summary */}
      <div className="card space-y-3">
        <div>
          <label className="label">Email for confirmation</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

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

        {/* ✅ Clear totals */}
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

        <button className="btn btn-primary w-full" onClick={checkout}>
          Checkout (email only)
        </button>

        <div className="text-sm">{status}</div>
      </div>
    </div>
  );
}