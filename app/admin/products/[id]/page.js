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
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    (async ()=>{
      const r = await fetch(`/api/admin/products/${id}`);
      if (!r.ok) { alert('Failed to load product'); return; }
      const p = await r.json();
      setForm({
        title: p.title || '',
        slug: p.slug || '',
        description: p.description || '',
        basePriceExVat: p.basePriceExVat || 0,
        images: (p.images||[]).map(u => ({ url: u })), // normalize for UI
        sizesAvailable: p.sizesAvailable || [],
        colorsAvailable: p.colorsAvailable || [],
        status: p.status || 'published',
      });
    })();
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
      const payload = { ...form, images: (form.images||[]).map(i => i.url ?? i) };
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

  if (!form) return <div>Loading…</div>;

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