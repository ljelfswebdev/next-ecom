// app/product/[slug]/page.js
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { ProductReviews } from '@/app/components/product/reviews';

// import 'swiper/css';
// import 'swiper/css/navigation';
// import 'swiper/css/pagination';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [settings, setSettings] = useState(null);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');

  // load product + settings
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await fetch(`/api/products/${slug}`, { cache: 'no-store' });
        if (!dead && r.ok) setProduct(await r.json());
      } catch {}
      try {
        const r2 = await fetch('/api/settings', { cache: 'no-store' });
        if (!dead && r2.ok) setSettings(await r2.json());
      } catch {}
    })();
    return () => { dead = true; };
  }, [slug]);

  // derive lists / helpers safely (work with null product)
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const allSizes = product?.sizesAvailable?.length
    ? product.sizesAvailable
    : Array.from(new Set(variants.map(v => v?.options?.size).filter(Boolean)));

  const allColors = product?.colorsAvailable?.length
    ? product.colorsAvailable
    : Array.from(new Set(variants.map(v => v?.options?.color).filter(Boolean)));

  const sizeRequired  = allSizes.length  > 0;
  const colorRequired = allColors.length > 0;

  const stockFor = (s, c) =>
    variants
      .filter(v => (s ? v?.options?.size  === s : true)
                && (c ? v?.options?.color === c : true))
      .reduce((sum, v) => sum + (v?.stock || 0), 0);

  const isSizeEnabled  = (s) => stockFor(s, colorRequired ? color || null : null) > 0;
  const isColorEnabled = (c) => stockFor(sizeRequired ? size || null : null, c) > 0;

  // keep selections valid even if the other dimension changes
  useEffect(() => {
    if (!product) return;
    if (size && !isSizeEnabled(size)) setSize('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, color]);

  useEffect(() => {
    if (!product) return;
    if (color && !isColorEnabled(color)) setColor('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, size]);

  // now safe to early-return for loading
  if (!product) return <div>Loading...</div>;

  const vatPercent = settings?.vatPercent ?? 20;

  const totalStockAll = stockFor(null, null);
  const allOut = variants.length > 0 && totalStockAll <= 0;

  const matchedVariant = variants.find(v =>
    (!sizeRequired  || v?.options?.size  === size) &&
    (!colorRequired || v?.options?.color === color)
  ) || null;

  const unitEx  = (matchedVariant?.priceExVatGBP ?? product.basePriceExVat) || 0;
  const unitInc = +(unitEx * (1 + vatPercent / 100)).toFixed(2);
  const totalEx  = +(unitEx * qty).toFixed(2);
  const totalInc = +(unitInc * qty).toFixed(2);

  const maxQty = Math.max(0, matchedVariant?.stock ?? 0);
  const haveValidSelection =
    (!sizeRequired  || !!size) &&
    (!colorRequired || !!color) &&
    !!matchedVariant;

  const canAdd = haveValidSelection && maxQty > 0 && qty >= 1 && qty <= maxQty;
  const fmt = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'GBP' });

  const addToCart = () => {
    if (!haveValidSelection) { alert('Please select available options'); return; }
    if (qty > maxQty) { alert('Insufficient stock'); return; }
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push({
      productId: product._id,
      title: product.title,
      image: product.images?.[0] || '',
      qty,
      variantId: matchedVariant._id,
      sku: matchedVariant.sku,
      variant: { size, color },
      unitPriceExVatGBP: unitEx,
    });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Added to cart');
  };

  const hasGallery = (product.images?.length || 0) > 1;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {hasGallery ? (
            <Swiper modules={[Navigation, Pagination]} navigation pagination={{ clickable: true }} className="rounded-2xl overflow-hidden">
              {product.images.map((src, i) => (
                <SwiperSlide key={i}>
                  <img src={src} alt={`${product.title} ${i+1}`} className="w-full h-auto object-cover" />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            product.images?.[0] && (
              <img src={product.images[0]} alt={product.title} className="w-full rounded-2xl" />
            )
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{product.title}</h1>
            {allOut && (
              <span className="text-[11px] uppercase tracking-wide bg-black text-white px-2 py-1 rounded-md">
                Out of stock
              </span>
            )}
          </div>

          <p className="text-gray-600 mt-2">{product.description}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl border">
              <div className="text-gray-500">Unit (ex VAT)</div>
              <div className="text-lg font-semibold">{fmt(unitEx)}</div>
            </div>
            <div className="p-3 rounded-xl border">
              <div className="text-gray-500">Unit (inc VAT)</div>
              <div className="text-lg font-semibold">{fmt(unitInc)}</div>
            </div>
            <div className="p-3 rounded-xl border">
              <div className="text-gray-500">Total (ex VAT)</div>
              <div className="text-lg font-semibold">{fmt(totalEx)}</div>
            </div>
            <div className="p-3 rounded-xl border">
              <div className="text-gray-500">Total (inc VAT)</div>
              <div className="text-lg font-semibold">{fmt(totalInc)}</div>
            </div>
            <div className="col-span-2 text-xs text-gray-500">
              VAT rate: {vatPercent}%{settings ? '' : ' (default)'}
            </div>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {matchedVariant ? (
              <>SKU: {matchedVariant.sku} • In stock: {matchedVariant.stock}</>
            ) : (
              <>Select options to see stock</>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {sizeRequired && (
              <fieldset>
                <legend className="label">Size</legend>
                <div className="flex flex-wrap gap-2">
                  {allSizes.map(s => {
                    const enabled = isSizeEnabled(s);
                    const selected = size === s;
                    return (
                      <label
                        key={s}
                        className={[
                          'px-3 py-2 rounded-lg border text-sm cursor-pointer select-none',
                          selected ? 'bg-black text-white border-black' : 'bg-white',
                          !enabled ? 'opacity-40 cursor-not-allowed' : ''
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name="size"
                          className="sr-only"
                          value={s}
                          disabled={!enabled}
                          checked={selected}
                          onChange={() => setSize(s)}
                          required
                        />
                        {s}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {colorRequired && (
              <fieldset>
                <legend className="label">Colour</legend>
                <div className="flex flex-wrap gap-2">
                  {allColors.map(c => {
                    const enabled = isColorEnabled(c);
                    const selected = color === c;
                    return (
                      <label
                        key={c}
                        className={[
                          'px-3 py-2 rounded-lg border text-sm capitalize cursor-pointer select-none',
                          selected ? 'bg-black text-white border-black' : 'bg-white',
                          !enabled ? 'opacity-40 cursor-not-allowed' : ''
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          name="color"
                          className="sr-only"
                          value={c}
                          disabled={!enabled}
                          checked={selected}
                          onChange={() => setColor(c)}
                          required
                        />
                        {c}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                className="input"
                value={qty}
                min={1}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
              />
              {matchedVariant && maxQty > 0 && (
                <div className="text-xs text-gray-500 mt-1">Max {maxQty}</div>
              )}
            </div>

            <button className="btn btn-primary w-full" onClick={addToCart} disabled={!canAdd}>
              {canAdd ? 'Add to cart' : (haveValidSelection ? 'Out of stock' : 'Select options')}
            </button>
          </div>
        </div>
      </div>

      <ProductReviews slug={slug} />
    </>
  );
}