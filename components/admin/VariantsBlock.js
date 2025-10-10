'use client';
import { useMemo } from 'react';

// quick slug → prefix helper
const slugify = (s='') =>
  s.toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');

function makeSkuPrefix(form){
  // prefer explicit SKU prefix field if you add one later; fallback to slug/title
  const base = form.slug || form.title || 'SKU';
  return slugify(base).toUpperCase().replace(/-/g,'').slice(0,12); // compact
}

function makeSku(prefix, { size, color }, existingSkus){
  const parts = [prefix];
  if (size)  parts.push(String(size).toUpperCase().replace(/\s+/g,''));
  if (color) parts.push(String(color).toUpperCase().replace(/\s+/g,''));
  let sku = parts.join('-');
  // ensure uniqueness in case of duplicates
  let n = 1;
  while (existingSkus.has(sku)) {
    n += 1;
    sku = `${parts.join('-')}-${n}`;
  }
  return sku;
}

function cartesian(a=[], b=[]){
  if (!a.length && !b.length) return [{ size:null, color:null }];
  if (!a.length) return b.map(color => ({ size:null, color }));
  if (!b.length) return a.map(size => ({ size, color:null }));
  const out = [];
  for (const size of a) for (const color of b) out.push({ size, color });
  return out;
}

export default function VariantsBlock({ form, setForm }) {
  const prefix = useMemo(()=>makeSkuPrefix(form), [form.slug, form.title]);

  const generate = () => {
    const sizes  = Array.isArray(form.sizesAvailable) ? form.sizesAvailable.filter(Boolean) : [];
    const colors = Array.isArray(form.colorsAvailable) ? form.colorsAvailable.filter(Boolean) : [];

    if (!sizes.length && !colors.length) {
      alert('Tick some sizes/colours above first.'); return;
    }

    setForm(prev => {
      const prevVariants = Array.isArray(prev.variants) ? prev.variants : [];
      const existingKey = new Set(
        prevVariants.map(v => `${v?.options?.size || ''}|||${v?.options?.color || ''}`)
      );
      const existingSkus = new Set(prevVariants.map(v => (v.sku || '').toUpperCase()));

      const combos = cartesian(sizes, colors);
      const toAdd = [];
      for (const c of combos) {
        const key = `${c.size || ''}|||${c.color || ''}`;
        if (existingKey.has(key)) continue; // keep existing (stock/overrides preserved)

        const sku = makeSku(prefix, c, existingSkus);
        existingSkus.add(sku.toUpperCase());

        toAdd.push({
          sku,
          barcode: '',
          stock: 0,
          priceExVatGBP: undefined,     // optional override
          options: { size: c.size || '', color: c.color || '' },
        });
      }
      if (!toAdd.length) {
        alert('All combinations already exist.'); 
        return prev;
      }
      return { ...prev, variants: [...prevVariants, ...toAdd] };
    });
  };

  const clearAll = () => {
    if (!confirm('Remove all variants for this product?')) return;
    setForm(prev => ({ ...prev, variants: [] }));
  };

  const updateAt = (idx, patch) => {
    setForm(prev => {
      const copy = [...(prev.variants || [])];
      copy[idx] = { ...copy[idx], ...patch };
      return { ...prev, variants: copy };
    });
  };

  const removeAt = (idx) => {
    setForm(prev => {
      const copy = [...(prev.variants || [])];
      copy.splice(idx,1);
      return { ...prev, variants: copy };
    });
  };

  const move = (idx, dir) => {
    setForm(prev => {
      const copy = [...(prev.variants || [])];
      const j = idx + dir;
      if (j < 0 || j >= copy.length) return prev;
      const tmp = copy[idx]; copy[idx] = copy[j]; copy[j] = tmp;
      return { ...prev, variants: copy };
    });
  };

  const variants = Array.isArray(form.variants) ? form.variants : [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Variants (SKU, stock, price override)</h3>
        <div className="flex gap-2">
          <button className="btn" onClick={generate}>Generate from options</button>
          {variants.length > 0 && (
            <button className="btn btn-secondary" onClick={clearAll}>Clear all</button>
          )}
        </div>
      </div>

      {variants.length === 0 ? (
        <p className="text-sm text-gray-500">No variants yet. Click “Generate from options”.</p>
      ) : (
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div key={i} className="grid md:grid-cols-12 gap-2 border rounded-xl p-3 items-center">
              <div className="md:col-span-2">
                <label className="label">SKU</label>
                <input
                  className="input"
                  value={v.sku || ''}
                  onChange={e=>updateAt(i, { sku: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Barcode</label>
                <input
                  className="input"
                  value={v.barcode || ''}
                  onChange={e=>updateAt(i, { barcode: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Size</label>
                <input
                  className="input"
                  value={v.options?.size || ''}
                  onChange={e=>updateAt(i, { options: { ...(v.options||{}), size: e.target.value } })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Color</label>
                <input
                  className="input"
                  value={v.options?.color || ''}
                  onChange={e=>updateAt(i, { options: { ...(v.options||{}), color: e.target.value } })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Stock</label>
                <input
                  className="input" type="number" min={0}
                  value={v.stock ?? 0}
                  onChange={e=>updateAt(i, { stock: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Price ex VAT (opt.)</label>
                <input
                  className="input" type="number" step="0.01"
                  value={v.priceExVatGBP ?? ''}
                  onChange={e=>{
                    const val = e.target.value;
                    updateAt(i, { priceExVatGBP: val === '' ? undefined : parseFloat(val) });
                  }}
                />
              </div>

              <div className="md:col-span-12 flex gap-2 justify-end">
                <button className="btn" onClick={()=>move(i, -1)} disabled={i===0}>↑</button>
                <button className="btn" onClick={()=>move(i, +1)} disabled={i===variants.length-1}>↓</button>
                <button className="btn btn-secondary" onClick={()=>removeAt(i)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        SKUs auto-generated from the product title/slug + options. You can override them.
      </p>
    </div>
  );
}