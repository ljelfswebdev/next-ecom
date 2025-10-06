'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const STATUSES = ['all','created','confirmed','fulfilled','cancelled'];

export default function AdminOrdersPage() {
  const [data, setData] = useState({ orders: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);

  // filters
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState(''); // YYYY-MM-DD
  const [dateTo, setDateTo]   = useState('');

  async function load(page = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: '20' });
    if (status && status !== 'all') params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    const r = await fetch(`/api/admin/orders?` + params.toString());
    const j = await r.json();
    setData(j);
    setLoading(false);
  }

  useEffect(() => { load(1); }, []); // initial

  const pages = useMemo(
    () => Math.max(1, Math.ceil((data.total || 0) / (data.limit || 20))),
    [data.total, data.limit]
  );

  // CSV export helpers
  function csvEscape(v) {
    const s = (v ?? '').toString();
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function orderToRow(o) {
    const itemsCount = o.items?.reduce((a, b) => a + (b.qty || 0), 0) || 0;
    const itemTitles = (o.items || []).map(i => i.title).join(' | ');
    const subtotal = o.totals?.subtotalExVatGBP ?? 0;
    const vatTotal = o.totals?.vatTotalGBP ?? 0;
    const shipping = o.totals?.shippingGBP ?? 0;
    const grand = (o.totals?.grandTotalDisplay ?? o.totals?.grandTotalGBP ?? 0);
    return [
      o._id,
      new Date(o.createdAt).toISOString(),
      o.email || '',
      o.status || '',
      o.currency || 'GBP',
      itemsCount,
      subtotal,
      vatTotal,
      shipping,
      grand,
      itemTitles
    ];
  }

  async function exportCSV() {
    // fetch ALL pages with current filters
    const params = new URLSearchParams({ page: '1', limit: '100' }); // pull big pages to reduce requests
    if (status && status !== 'all') params.set('status', status);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    let page = 1;
    const all = [];
    while (true) {
      params.set('page', String(page));
      const r = await fetch(`/api/admin/orders?` + params.toString());
      if (!r.ok) break;
      const j = await r.json();
      all.push(...(j.orders || []));
      const totalPages = Math.max(1, Math.ceil((j.total || 0) / (j.limit || 20)));
      if (page >= totalPages) break;
      page++;
    }

    const header = [
      'order_id','created_at','email','status','currency',
      'items_count','subtotal_ex_vat_gbp','vat_total_gbp',
      'shipping_gbp','grand_total_display','items_titles'
    ];
    const rows = [header, ...all.map(orderToRow)];
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamped = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.download = `orders-${status}-${stamped}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e)=>setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={()=>load(1)}>Apply</button>
          <button className="btn" onClick={()=>{
            setStatus('all'); setDateFrom(''); setDateTo(''); load(1);
          }}>Reset</button>
        </div>
        <div className="ml-auto">
          <button className="btn btn-primary" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div>Loading…</div>
        ) : data.orders.length === 0 ? (
          <div>No orders found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Order</th>
                <th className="py-2">Date</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Items</th>
                <th className="py-2">Total</th>
                <th className="py-2">Status</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map(o => {
                const count = o.items?.reduce((a,b)=>a+(b.qty||0), 0) || 0;
                const currency = o.currency || 'GBP';
                const fmt = (n) => (n ?? 0).toLocaleString(undefined, { style:'currency', currency });
                const display = o.totals?.grandTotalDisplay ?? o.totals?.grandTotalGBP ?? 0;
                return (
                  <tr key={o._id} className="border-b">
                    <td className="py-2 font-mono text-xs">{o._id}</td>
                    <td className="py-2">{new Date(o.createdAt).toLocaleString()}</td>
                    <td className="py-2">{o.email || '—'}</td>
                    <td className="py-2">{count}</td>
                    <td className="py-2">{fmt(display)}</td>
                    <td className="py-2 capitalize">{o.status}</td>
                    <td className="py-2">
                      <Link className="btn btn-primary text-xs" href={`/admin/orders/${o._id}`}>View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pager */}
      {pages > 1 && (
        <div className="flex gap-2">
          <button className="btn" disabled={data.page <= 1} onClick={()=>load(data.page - 1)}>Prev</button>
          <div className="px-3 py-2 border rounded-xl text-sm">Page {data.page} / {pages}</div>
          <button className="btn" disabled={data.page >= pages} onClick={()=>load(data.page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}