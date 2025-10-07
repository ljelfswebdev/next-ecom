// app/admin/products/[id]/page.js
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const SIZE_OPTIONS = ['XS','S','M','L','XL','XXL'];
const COLOR_OPTIONS = ['red','blue','green'];

async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  const r = await fetch(url, { method: 'POST', body: fd });
  if (!r.ok) throw new Error('Upload failed');
  return r.json();
}

export default function EditProductPage(){
  const { id } = useParams();
  const router = useRouter();

  const [form, setForm] = useState(null);
  const [cats, setCats] = useState([]);            // ← categories list
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // load product + categories
  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try {
        const [rProd, rCats] = await Promise.all([
          fetch(`/api/admin/products/${id}`, { cache:'no-store' }),
          fetch('/api/admin/categories', { cache:'no-store' }),
        ]);
        if (!rProd.ok) throw new Error('Failed to load product');
        const p = await rProd.json();
        const catList = rCats.ok ? await rCats.json() : [];
        if (cancelled) return;

        setCats(Array.isArray(catList) ? catList : []);
        setForm({
          title: p.title || '',
          slug: p.slug || '',
          description: p.description || '',
          basePriceExVat: p.basePriceExVat || 0,
          images: (p.images||[]).map(u => ({ url: typeof u === 'string' ? u : u.url })), // normalize
          sizesAvailable: p.sizesAvailable || [],
          colorsAvailable: p.colorsAvailable || [],
          categoryIds: Array.isArray(p.categoryIds) ? p.categoryIds : [],                // ← bring in
          status: p.status || 'published',
        });
      } catch (e) {
        alert(e.message || 'Error loading data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return ()=>{ cancelled = true; };
  }, [id]);

  function toggleArrayValue(key, value) {
    setForm(prev => {
      const arr = prev[key] || [];
      const has = arr.includes(value);
      const next = has ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  }

  async function onFilesChanged(e){
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(uploadToCloudinary));
      const newImgs = results.map(r => ({ url: r.secure_url, publicId: r.public_id }));
      setForm(prev => ({ ...prev, images: [...(prev.images||[]), ...newImgs] }));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function removeImage(idx){
    setForm(prev => {
      const copy = [...(prev.images||[])];
      copy.splice(idx,1);
      return { ...prev, images: copy };
    });
  }

  async function save(){
    setSaving(true);
    try {
      const payload = {
        ...form,
        images: (form.images||[]).map(i => i.url ?? i),
      };
      const r = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('Update failed');
      router.push('/admin/products'); // back to list
    } catch (e) {
      alert(e.message || 'Error updating');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) return <div className="card">Loading…</div>;

  return (
    <div className="card max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-3">Edit product</h1>

      <div className="space-y-2">
        <input className="input" placeholder="Title"
          value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
        <input className="input" placeholder="Slug"
          value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} />
        <textarea className="input" placeholder="Description"
          value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
        <input className="input" type="number" step="0.01" placeholder="Base price ex VAT (GBP)"
          value={form.basePriceExVat}
          onChange={e=>setForm({...form,basePriceExVat:parseFloat(e.target.value||0)})} />

        {/* Sizes */}
        <div>
          <label className="label">Sizes available</label>
          <div className="grid grid-cols-3 gap-2">
            {SIZE_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1">
                <input type="checkbox"
                  checked={(form.sizesAvailable||[]).includes(opt)}
                  onChange={()=>toggleArrayValue('sizesAvailable', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Colours */}
        <div>
          <label className="label">Colours available</label>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 capitalize">
                <input type="checkbox"
                  checked={(form.colorsAvailable||[]).includes(opt)}
                  onChange={()=>toggleArrayValue('colorsAvailable', opt)} />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="label">Categories</label>
          {cats.length === 0 ? (
            <p className="text-sm text-gray-500">No categories yet. Create some in Admin → Categories.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {cats.map(c => (
                <label key={c._id} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1">
                  <input
                    type="checkbox"
                    checked={(form.categoryIds||[]).includes(c._id)}
                    onChange={() => toggleArrayValue('categoryIds', c._id)}
                  />
                  {c.title}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={form.status}
            onChange={(e)=>setForm({...form, status: e.target.value})}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {/* Images */}
        <div>
          <label className="label">Gallery images</label>
          <input type="file" accept="image/*" multiple onChange={onFilesChanged} />
          {uploading && <p className="text-sm text-gray-500 mt-1">Uploading…</p>}
          {!!form.images?.length && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {form.images.map((img, i)=>(
                <div key={i} className="relative">
                  <img src={img.url} alt="" className="w-full h-24 object-cover rounded-lg border" />
                  <button type="button" onClick={()=>removeImage(i)}
                    className="absolute top-1 right-1 text-xs bg-white border rounded px-1">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button className="btn" onClick={()=>router.push('/admin/products')}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}