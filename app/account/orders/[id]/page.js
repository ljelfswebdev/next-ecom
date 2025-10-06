'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AccountOrderDetailPage(){
  const { id } = useParams();
  const router = useRouter();
  const [order,setOrder] = useState(null);
  const [err,setErr] = useState('');

  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try {
        const r = await fetch(`/api/account/orders/${id}`, { cache:'no-store' });
        if (!r.ok) {
          setErr(await r.text());
          return;
        }
        const j = await r.json();
        if (!cancelled) setOrder(j);
      } catch (e) {
        if (!cancelled) setErr('Failed to load order');
      }
    })();
    return ()=>{ cancelled = true; };
  }, [id]);

  if (err) return (
    <div className="card">
      <div className="text-red-600 mb-3">{err}</div>
      <button className="btn" onClick={()=>router.back()}>Back</button>
    </div>
  );
  if (!order) return <div className="card">Loading…</div>;

  const currency = order.currency || 'GBP';
  const fmt = (n) => (n??0).toLocaleString(undefined, { style:'currency', currency });

  const bill = order.billingAddress || {};
  const ship = order.shippingAddress || {};
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order</h1>
        <button className="btn" onClick={()=>router.back()}>Back</button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Items */}
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-mono text-xs break-all">{order._id}</div>
              <div className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
            </div>
            <span className="px-2 py-1 rounded-full text-xs capitalize bg-gray-100 border">
              {order.status}
            </span>
          </div>

          {items.length === 0 ? <p>No items.</p> : (
            <ul className="divide-y">
              {items.map((it, i)=>(
                <li key={i} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ItemThumb item={it} /> {/* <-- lazy/fallback thumb */}
                    <div>
                      <div className="font-medium">{it.title}</div>
                      <div className="text-sm text-gray-500">
                        Qty {it.qty}
                        {it.variant?.size && <> • {it.variant.size}</>}
                        {it.variant?.color && <> • {it.variant.color}</>}
                      </div>
                      <div className="text-xs text-gray-500">
                        Unit: {fmt(it.unitPriceExVatGBP)} ex VAT
                        {typeof it.vatPercent === 'number' && <> • VAT {it.vatPercent}%</>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-sm">
                    <div>Line ex VAT: {fmt(it.unitPriceExVatGBP * (it.qty || 1))}</div>
                    {'lineTotalIncVatGBP' in it ? (
                      <div className="font-medium">Line inc VAT (GBP): £{Number(it.lineTotalIncVatGBP).toFixed(2)}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: totals + addresses */}
        <div className="space-y-6">
          <div className="card space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal (ex VAT)</span>
              <span className="font-medium">
                {fmt(order.totals?.subtotalExVatGBP ?? 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>VAT</span>
              <span className="font-medium">
                {fmt(order.totals?.vatTotalGBP ?? 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span className="font-medium">
                {fmt(order.totals?.shippingGBP ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-base pt-1 border-t mt-1">
              <span className="font-semibold">Total (inc VAT)</span>
              <span className="font-semibold">
                {typeof order.totals?.grandTotalDisplay === 'number'
                  ? (order.totals.grandTotalDisplay).toLocaleString(undefined, { style:'currency', currency })
                  : fmt(order.totals?.grandTotalGBP ?? 0)
                }
              </span>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-2">Billing address</h3>
            <Addr a={bill} />
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Shipping address</h3>
            <Addr a={ship} />
          </div>

          <div className="card text-sm">
            <div><span className="text-gray-500">Customer:</span> {order.customerName || '-'}</div>
            <div><span className="text-gray-500">Email:</span> {order.email}</div>
            <div><span className="text-gray-500">Currency:</span> {order.currency}</div>
            <div><span className="text-gray-500">Zone:</span> {order.zone}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemThumb({ item }) {
  const [src,setSrc] = useState(item.image || null);

  useEffect(()=>{
    let cancelled = false;
    const run = async ()=>{
      // if no src and we have a productId, fetch first product image
      if (src || !item?.productId) return;
      try {
        const r = await fetch(`/api/products/by-id/${item.productId}`, { cache:'force-cache' });
        if (!r.ok) return;
        const p = await r.json();
        if (!cancelled) setSrc(p?.images?.[0] || null);
      } catch {}
    };
    run();
    return ()=>{ cancelled = true; };
  }, [item?.productId, src]);

  if (src) {
    return <img src={src} alt={item.title} className="w-14 h-14 object-cover rounded-lg border" />;
  }
  return <div className="w-14 h-14 rounded-lg border bg-gray-100" />;
}

function Addr({ a={} }){
  return (
    <address className="not-italic text-sm text-gray-700 space-y-0.5">
      <div>{a.fullName}</div>
      <div>{a.line1}</div>
      {a.line2 ? <div>{a.line2}</div> : null}
      <div>{[a.city, a.region].filter(Boolean).join(', ')}</div>
      <div>{[a.postcode, a.country].filter(Boolean).join(', ')}</div>
      {a.phone ? <div>☎ {a.phone}</div> : null}
    </address>
  );
}