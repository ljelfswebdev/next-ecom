'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { ProductReviews } from '@/app/components/product/reviews';
// If you didn't import in globals.css, uncomment these 3 lines:
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
    fetch(`/api/products/${slug}`).then(r => r.json()).then(setProduct);
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(()=>{});
  }, [slug]);

  const vatPercent = settings?.vatPercent ?? 20; // fallback 20%
  const priceExVat = product?.basePriceExVat ?? 0;
  const priceIncVat = useMemo(() => +(priceExVat * (1 + vatPercent/100)).toFixed(2), [priceExVat, vatPercent]);

  const totalEx = useMemo(() => +(priceExVat * qty).toFixed(2), [priceExVat, qty]);
  const totalInc = useMemo(() => +(priceIncVat * qty).toFixed(2), [priceIncVat, qty]);

  const fmt = (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'GBP' });

const addToCart = () => {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const thumb = product.images?.[0] || '';

  cart.push({
    productId: product._id,
    title: product.title,
    qty,
    variant: { size, color },
    unitPriceExVatGBP: product.basePriceExVat || 0,
    image: thumb,                // ✅ add this
  });

  localStorage.setItem('cart', JSON.stringify(cart));
  alert('Added to cart');
};
  

  if (!product) return <div>Loading...</div>;

  // options from arrays, fallback to variants
  const sizeOptions =
    product.sizesAvailable?.length
      ? product.sizesAvailable
      : Array.from(new Set((product.variants || []).map(v => v.size).filter(Boolean)));

  const colorOptions =
    product.colorsAvailable?.length
      ? product.colorsAvailable
      : Array.from(new Set((product.variants || []).map(v => v.color).filter(Boolean)));

  const hasGallery = (product.images?.length || 0) > 1;

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* GALLERY */}
      <div>
        {hasGallery ? (
          <Swiper
            modules={[Navigation, Pagination]}
            navigation
            pagination={{ clickable: true }}
            className="rounded-2xl overflow-hidden"
          >
            {product.images.map((src, i) => (
              <SwiperSlide key={i}>
                <img src={src} alt={`${product.title} ${i+1}`} className="w-full h-auto object-cover" />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          product.images?.[0] && (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full rounded-2xl"
            />
          )
        )}
      </div>

      {/* DETAILS */}
      <div className="card">
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <p className="text-gray-600 mt-2">{product.description}</p>

        {/* Pricing */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl border">
            <div className="text-gray-500">Unit (ex VAT)</div>
            <div className="text-lg font-semibold">{fmt(priceExVat)}</div>
          </div>
          <div className="p-3 rounded-xl border">
            <div className="text-gray-500">Unit (inc VAT)</div>
            <div className="text-lg font-semibold">{fmt(priceIncVat)}</div>
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

        <div className="mt-4 space-y-3">
          {/* Size selector */}
          {sizeOptions.length > 0 && (
            <div>
              <label className="label">Size</label>
              <select className="input" value={size} onChange={(e)=>setSize(e.target.value)}>
                <option value="">Select size</option>
                {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Colour selector */}
          {colorOptions.length > 0 && (
            <div>
              <label className="label">Colour</label>
              <select className="input" value={color} onChange={(e)=>setColor(e.target.value)}>
                <option value="">Select colour</option>
                {colorOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              className="input"
              value={qty}
              min={1}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
            />
          </div>

          {/* Add to cart */}
          <button className="btn btn-primary w-full" onClick={addToCart}>
            Add to cart
          </button>
        </div>
      </div>
    </div>

    <ProductReviews slug={slug} />
    </>
  );
}