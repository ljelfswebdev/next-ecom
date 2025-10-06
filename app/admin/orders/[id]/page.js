'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const StatusOptions = ['created','paid','shipped','cancelled'];

export default function AdminOrderDetailPage(){
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);  // { order, customer }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/admin/orders/${id}`, { cache:'no-store' });
      if (r.ok) {
        const j = await r.json();
        setData(j);
      } else {
        alert('Order not found');
        router.push('/admin/orders');
      }
    })();
  }, [id, router]);

  if (!data) return <div className="card">Loading…</div>;

  const { order, customer } = data;
  const fmt = (n) =>
    (n ?? 0).toLocaleString(undefined, { style: 'currency', currency: order.currency || 'GBP' });

  const Addr = ({ a }) => (
    <div className="text-sm leading-5">
      {a?.fullName && <div>{a.fullName}</div>}
      {a?.line1 && <div>{a.line1}</div>}
      {a?.line2 && <div>{a.line2}</div>}
      {(a?.city || a?.region) && <div>{[a.city, a.region].filter(Boolean).join(', ')}</div>}
      {(a?.postcode || a?.country) && <div>{[a.postcode, a.country].filter(Boolean).join(', ')}</div>}
      {a?.phone && <div>☎ {a.phone}</div>}
    </div>
  );

  const updateStatus = async (next) => {
    setSaving(true);
    const r = await fetch(`/api/admin/orders/${order._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (r.ok) {
      const j = await r.json();
      setData((d) => ({ ...d, order: j }));
    } else {
      alert('Failed to update');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex items-center justify-between">
        <div>
          <div className="font-semibold">Order #{order._id}</div>
          <div className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Status:</span>
          <select
            className="input"
            value={order.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={saving}
          >
            {StatusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer & addresses */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-2">Customer</h3>
          <div className="text-sm">
            <div><span className="text-gray-500">Name:</span> {order.customerName || customer?.name || '—'}</div>
            <div><span className="text-gray-500">Email:</span> {order.email || customer?.email || '—'}</div>
            {order.userId ? (
              <div className="mt-1 text-xs text-green-700">Linked account</div>
            ) : (
              <div className="mt-1 text-xs text-blue-700">Guest checkout</div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Billing address</h3>
          <Addr a={order.billingAddress || customer?.addresses?.billing} />
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Shipping address</h3>
          <Addr a={order.shippingAddress || customer?.addresses?.shipping} />
        </div>
      </div>

      {/* Items */}
      <div className="card">
        <h3 className="font-semibold mb-3">Items</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Product</th>
              <th>Options</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit (ex)</th>
              <th className="text-right">Line (ex)</th>
              <th className="text-right">VAT</th>
              <th className="text-right">Line (inc)</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => {
              const unitEx = it.unitPriceExVatGBP || 0;
              const qty = it.qty || 1;
              const lineEx = unitEx * qty;
              const lineVat = it.lineVat ?? Math.round((it.vatPercent ?? 0) * lineEx) / 100; // fallback
              const lineInc = it.lineTotalIncVatGBP ?? lineEx + lineVat;
              return (
                <tr key={i} className="border-t">
                  <td className="py-2">{it.title || it.productId}</td>
                  <td className="text-gray-500">
                    {[it?.variant?.size, it?.variant?.color].filter(Boolean).join(' • ') || '—'}
                  </td>
                  <td className="text-right">{qty}</td>
                  <td className="text-right">{fmt(unitEx)}</td>
                  <td className="text-right">{fmt(lineEx)}</td>
                  <td className="text-right">{fmt(lineVat)}</td>
                  <td className="text-right">{fmt(lineInc)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="card grid md:grid-cols-3 gap-4">
        <div>
          <div className="text-gray-500 text-sm">Subtotal (ex VAT)</div>
          <div className="text-lg font-semibold">
            {fmt(order.totals?.subtotalExVatGBP)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-sm">VAT total</div>
          <div className="text-lg font-semibold">
            {fmt(order.totals?.vatTotalGBP)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-sm">Grand total (inc VAT)</div>
          <div className="text-lg font-semibold">
            {fmt(order.totals?.grandTotalDisplay ?? order.totals?.grandTotalGBP)}
          </div>
        </div>
      </div>
    </div>
  );
}