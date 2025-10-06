'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/admin/orders/${id}`);
      if (!r.ok) { alert('Failed to load order'); return; }
      setOrder(await r.json());
    })();
  }, [id]);

  const fmt = (n, c) => (n ?? 0).toLocaleString(undefined, { style: 'currency', currency: c || 'GBP' });

  const totals = useMemo(() => {
    if (!order?.totals) return null;
    const currency = order.currency || 'GBP';
    const display = order.totals.grandTotalDisplay ?? order.totals.grandTotalGBP ?? 0;
    return { currency, display };
  }, [order]);

  async function updateStatus(nextStatus) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!r.ok) throw new Error('Update failed');
      const j = await r.json();
      setOrder(j);
    } catch (e) {
      alert(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (!order) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order {order._id}</h1>
        <button className="btn" onClick={()=>router.push('/admin/orders')}>Back</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-3">Items</h2>
          <ul className="divide-y">
            {order.items?.map((it, i) => (
              <li key={i} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{it.title}</div>
                  <div className="text-sm text-gray-500">
                    Qty {it.qty}
                    {it.variant?.size && <> • {it.variant.size}</>}
                    {it.variant?.color && <> • {it.variant.color}</>}
                    {it.variant?.sku && <> • {it.variant.sku}</>}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>Unit ex: {fmt(it.unitPriceExVatGBP, 'GBP')}</div>
                  <div>Line inc: {fmt(it.lineTotalIncVatGBP, 'GBP')}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card space-y-2">
          <div className="flex justify-between">
            <span>Status</span>
            <span className="font-medium capitalize">{order.status}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {['created','confirmed','fulfilled','cancelled'].map(s => (
              <button key={s}
                className={`btn ${order.status===s ? 'btn-primary' : ''}`}
                disabled={saving || order.status===s}
                onClick={()=>updateStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="border-t pt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal ex VAT (GBP)</span>
              <span className="font-medium">{fmt(order.totals?.subtotalExVatGBP, 'GBP')}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT total (GBP)</span>
              <span className="font-medium">{fmt(order.totals?.vatTotalGBP, 'GBP')}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping (GBP)</span>
              <span className="font-medium">{fmt(order.totals?.shippingGBP, 'GBP')}</span>
            </div>
            <div className="flex justify-between text-base border-t pt-2">
              <span className="font-semibold">Grand Total</span>
              <span className="font-semibold">
                {fmt(totals?.display, order.currency || 'GBP')}
              </span>
            </div>
          </div>

          <div className="border-t pt-2 text-sm">
            <div>Currency: {order.currency}</div>
            <div>Customer: {order.email}</div>
            <div>Placed: {new Date(order.createdAt).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}