'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((r) => r.json())
      .then(setProduct);
  }, [slug]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push({
      productId: product._id,
      title: product.title,
      qty,
      variant: { size, color },
      unitPriceExVatGBP: product.basePriceExVat || 0,
    });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Added to cart');
  };

  if (!product) return <div>Loading...</div>;

const sizeOptions =
  product.sizesAvailable?.length
    ? product.sizesAvailable
    : Array.from(new Set((product.variants || [])
        .map(v => v.size)
        .filter(Boolean)));

const colorOptions =
  product.colorsAvailable?.length
    ? product.colorsAvailable
    : Array.from(new Set((product.variants || [])
        .map(v => v.color)
        .filter(Boolean)));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full rounded-2xl"
          />
        )}
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <p className="text-gray-600 mt-2">{product.description}</p>

        <div className="mt-4 space-y-3">
          {/* Size selector */}
          <div>
            <label className="label">Size</label>
            <select
              className="input"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              <option value="">Select size</option>
              {sizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Colour selector */}
          <div>
            <label className="label">Colour</label>
            <select
              className="input"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              <option value="">Select colour</option>
              {colorOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              className="input"
              value={qty}
              min={1}
              onChange={(e) => setQty(parseInt(e.target.value))}
            />
          </div>

          {/* Add to cart */}
          <button className="btn btn-primary w-full" onClick={addToCart}>
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}