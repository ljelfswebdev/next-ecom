// app/shop/page.js
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const SIZE_OPTIONS = ['XS','S','M','L','XL','XXL'];
const COLOR_OPTIONS = ['red','blue','green'];

const isOutOfStock = (p) => {
 const vs = Array.isArray(p?.variants) ? p.variants : [];
 if (!vs.length) return false; // no variants → assume in stock (you can change this rule)
 return vs.reduce((sum, v) => sum + (v?.stock || 0), 0) <= 0;
};

export default function ShopPage(){
  const router = useRouter();
  const sp = useSearchParams();

  // UI state derived from URL
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);

  const category = sp.get('category') || '';                      // slug
  const sizes = (sp.get('sizes') || '').split(',').filter(Boolean);
  const colors = (sp.get('colors') || '').split(',').filter(Boolean);
  const sort = sp.get('sort') || '';                              // 'az'|'za'|'price-asc'|'price-desc'
  const q = sp.get('q') || '';

  const fetchProducts = async ()=>{
    const u = new URL('/api/products', window.location.origin);
    if (category) u.searchParams.set('category', category);
    if (sizes.length) u.searchParams.set('sizes', sizes.join(','));
    if (colors.length) u.searchParams.set('colors', colors.join(','));
    if (sort) u.searchParams.set('sort', sort);
    if (q) u.searchParams.set('q', q);
    const r = await fetch(u.toString(), { cache:'no-store' });
    const j = await r.json();
    setProducts(j);
  };

  useEffect(()=>{
    fetch('/api/categories', { cache:'no-store' }).then(r=>r.json()).then(setCats);
  },[]);
  useEffect(()=>{ fetchProducts(); /* eslint-disable-next-line */ }, [category, sp.get('sizes'), sp.get('colors'), sort, q]);

  const updateParam = (key, val)=>{
    const u = new URL(window.location.href);
    if (!val || (Array.isArray(val) && val.length===0)) u.searchParams.delete(key);
    else u.searchParams.set(key, Array.isArray(val) ? val.join(',') : val);
    router.push(u.pathname + '?' + u.searchParams.toString());
  };

  const toggleInList = (key, value, list)=>{
    const next = list.includes(value) ? list.filter(v=>v!==value) : [...list, value];
    updateParam(key, next);
  };

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {/* Filters */}
      <aside className="card space-y-4">
        <div>
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="Search title…"
            defaultValue={q}
            onKeyDown={(e)=>{ if(e.key==='Enter') updateParam('q', e.currentTarget.value.trim()); }}
          />
        </div>

        <div>
          <div className="font-semibold mb-2">Categories</div>
          <div className="space-y-1">
            <button
              className={`btn w-full ${!category ? 'btn-primary' : 'btn-secondary'}`}
              onClick={()=>updateParam('category','')}
            >All</button>
            {cats.map(c=>(
              <button
                key={c.slug}
                className={`btn w-full ${category===c.slug ? 'btn-primary' : 'btn-secondary'}`}
                onClick={()=>updateParam('category', c.slug)}
              >{c.title}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-semibold mb-2">Sizes</div>
          <div className="grid grid-cols-3 gap-2">
            {SIZE_OPTIONS.map(s=>(
              <label key={s} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1">
                <input
                  type="checkbox"
                  checked={sizes.includes(s)}
                  onChange={()=>toggleInList('sizes', s, sizes)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="font-semibold mb-2">Colours</div>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_OPTIONS.map(c=>(
              <label key={c} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 capitalize">
                <input
                  type="checkbox"
                  checked={colors.includes(c)}
                  onChange={()=>toggleInList('colors', c, colors)}
                />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="font-semibold mb-2">Sort</div>
          <select className="input" value={sort} onChange={e=>updateParam('sort', e.target.value)}>
            <option value="">Newest</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>

        <button className="btn btn-secondary w-full" onClick={()=>router.push('/shop')}>Clear filters</button>
      </aside>

      {/* Grid */}
      <main className="md:col-span-3">
        {products.length === 0 ? (
          <div className="card">No products match your filters.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p=>(
              <Link key={p._id} href={`/product/${p.slug}`} className="block relative border rounded-2xl p-3 hover:shadow-sm">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="w-full aspect-[4/3] object-cover rounded-xl mb-2" />
                ) : (
                  <div className="w-full aspect-[4/3] rounded-xl bg-gray-100 mb-2" />
                )}
                  {isOutOfStock(p) && (
                   <span
                      className="absolute top-2 left-2 text-[11px] uppercase tracking-wide bg-black text-white px-2 py-1 rounded-md"
                    >
                      Out of stock
                    </span>
                  )}
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-gray-500">From £{Number(p.basePriceExVat).toFixed(2)} ex VAT</div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}