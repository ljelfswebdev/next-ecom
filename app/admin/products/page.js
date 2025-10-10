// app/admin/products/page.js
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const SIZE_OPTIONS = ['XS','S','M','L','XL','XXL'];
const COLOR_OPTIONS = ['red','blue','green'];

async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  return res.json(); // { secure_url, public_id, ... }
}

export default function AdminProductsPage(){
  const [list,setList]=useState([]);
  const [cats,setCats]=useState([]);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    basePriceExVat: 0,
    images: [],
    sizesAvailable: [],
    colorsAvailable: [],
    categoryIds: [],
    status: 'published',
  });
  const [uploading, setUploading] = useState(false);

  const load = async ()=>{
    const r = await fetch('/api/products');
    const j = await r.json();
    setList(j);
  };
  const loadCats = async ()=>{
    const r = await fetch('/api/admin/categories');
    const j = await r.json();
    setCats(j);
  };

  useEffect(()=>{ load(); loadCats(); },[]);

  async function onFilesChanged(e){
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(files.map(uploadToCloudinary));
      const newImgs = results.map(r => ({ url: r.secure_url, publicId: r.public_id }));
      setForm(prev => ({ ...prev, images: [...(prev.images||[]), ...newImgs] }));
    } catch (err) {
      alert('One or more uploads failed');
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = ''; // reset
    }
  }

  function removeImage(idx){
    setForm(prev => {
      const copy = [...(prev.images||[])];
      copy.splice(idx,1);
      return { ...prev, images: copy };
    });
  }

  function toggleArrayValue(key, value) {
    setForm(prev => {
      const has = (prev[key] || []).includes(value);
      const nextArr = has ? prev[key].filter(v => v !== value) : [...(prev[key]||[]), value];
      return { ...prev, [key]: nextArr };
    });
  }

  const save = async ()=>{
    const payload = {
      ...form,
      images: form.images.map(i => i.url),
    };
    const r = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (r.ok) {
      setForm({
        title: '',
        slug: '',
        description: '',
        basePriceExVat: 0,
        images: [],
        sizesAvailable: [],
        colorsAvailable: [],
        categoryIds: [],
        status: 'published',
      });
      load();
    } else {
      alert('Error saving');
    }
  };

  const del = async (id)=>{
    if (!confirm('Delete this product?')) return;
    const r = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (r.ok) load();
    else alert('Delete failed');
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="font-semibold mb-3">Create product</h2>
        <div className="space-y-2">
          <input className="input" placeholder="Title"
            value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
          <input className="input" placeholder="Slug"
            value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} />
          <textarea className="input" placeholder="Description"
            value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          <input className="input" type="number" step="0.01"
            placeholder="Base price ex VAT (GBP)"
            value={form.basePriceExVat}
            onChange={e=>setForm({...form,basePriceExVat:parseFloat(e.target.value||0)})} />

          {/* Sizes */}
          <div>
            <label className="label">Sizes available</label>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1">
                  <input
                    type="checkbox"
                    checked={(form.sizesAvailable || []).includes(opt)}
                    onChange={() => toggleArrayValue('sizesAvailable', opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Colours */}
          <div className="mt-2">
            <label className="label">Colours available</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 capitalize">
                  <input
                    type="checkbox"
                    checked={(form.colorsAvailable || []).includes(opt)}
                    onChange={() => toggleArrayValue('colorsAvailable', opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="mt-2">
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

          {/* Multi-image uploader */}
          <div>
            <label className="label">Gallery images</label>
            <input type="file" accept="image/*" multiple onChange={onFilesChanged} />
            {uploading && <p className="text-sm text-gray-500 mt-1">Uploading…</p>}
            {form.images?.length > 0 && (
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

          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <button className="btn btn-primary w-full" onClick={save} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Products</h2>
        <ul className="space-y-2">
          {list.map(p=>(
            <li key={p._id} className="border rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-sm text-gray-500">{p.slug}</div>
                  {p.images?.length>0 && (
                    <div className="flex gap-2 mt-2">
                      {p.images.slice(0,3).map((u, i)=>(
                        <img key={i} src={u} alt="" className="w-12 h-12 object-cover rounded" />
                      ))}
                    </div>
                  )}
                  {Array.isArray(p.categoryIds) && p.categoryIds.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Categories: {p.categoryIds.length} selected
                    </div>
                  )}
                </div>
                {(p.variants?.length>0) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {p.variants.slice(0,3).map(v => `${v.sku}:${v.stock}`).join(' • ')}
                    {p.variants.length>3 ? ' …' : ''}
                  </div>
                )}

                <div className="flex flex-col gap-2 shrink-0">
                  <Link href={`/product/${p.slug}`} className="btn" target="_blank" rel="noreferrer">
                    View (public)
                  </Link>
                  
                  <Link href={`/admin/products/${p._id}`} className="btn">Edit</Link>
                  
                  <button className="btn btn-secondary" onClick={()=>del(p._id)}>
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}