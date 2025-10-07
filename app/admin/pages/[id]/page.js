'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ImagePicker from '@/components/ImagePicker';

// ✅ add these 2 lines
import dynamic from 'next/dynamic';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
const CKEditor = dynamic(
  () => import('@ckeditor/ckeditor5-react').then(m => m.CKEditor),
  { ssr: false }
);

const BLOCK_TYPES = [
  { value:'banner', label:'Banner' },
  { value:'text', label:'Text (rich)' },
  { value:'imageText', label:'Image + Text' },
  { value:'gallery', label:'Gallery' },
  { value:'parallax', label:'Parallax Banner' },
];

const blankBlock = (type) => {
  switch(type){
    case 'banner': return { type, headline:'', subheadline:'', image:'', align:'center', ctaLabel:'', ctaHref:'' };
    case 'text': return { type, headline:'', textHtml:'' };
    case 'imageText': return { type, headline:'', textHtml:'', image:'', align:'left' };
    case 'gallery': return { type, headline:'', images:[] };
    case 'parallax': return { type, headline:'', subheadline:'', image:'', height:480, overlayOpacity:0.3 };
    default: return { type };
  }
};

export default function AdminPageEditor(){
  const router = useRouter();
  const { id } = useParams(); // 'new' or ObjectId
  const isNew = id === 'new';

  const [form,setForm] = useState({
    title:'', slug:'', status:'draft', blocks:[]
  });
  const [loading,setLoading] = useState(!isNew);
  const [saving,setSaving] = useState(false);

  // load existing page
  useEffect(()=>{
    if(isNew) return;
    (async ()=>{
      const r = await fetch(`/api/admin/pages/${id}`, { cache:'no-store' });
      if(!r.ok){ alert('Not found'); router.push('/admin/pages'); return; }
      const j = await r.json(); setForm({
        title: j.title || '',
        slug: j.slug || '',
        status: j.status || 'draft',
        blocks: Array.isArray(j.blocks)? j.blocks : [],
      });
      setLoading(false);
    })();
  },[id, isNew, router]);

  const updateBlockAt = (i, patch)=> setForm(p=>{
    const copy = p.blocks.slice();
    copy[i] = { ...copy[i], ...patch };
    return { ...p, blocks: copy };
  });

  const removeBlockAt = (i)=> setForm(p=>{
    const copy = p.blocks.slice();
    copy.splice(i,1);
    return { ...p, blocks: copy };
  });

  const addBlock = (type)=> setForm(p=>({ ...p, blocks: [...p.blocks, blankBlock(type)] }));

  const move = (i, dir)=> setForm(p=>{
    const copy = p.blocks.slice();
    const j = i + dir;
    if(j < 0 || j >= copy.length) return p;
    const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    return { ...p, blocks: copy };
  });

  const save = async ()=>{
    setSaving(true);
    const method = isNew ? 'POST' : 'PATCH';
    const url = isNew ? '/api/admin/pages' : `/api/admin/pages/${id}`;
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    setSaving(false);
    if(!r.ok){ alert('Save failed'); return; }
    const j = await r.json();
    if(isNew) router.replace(`/admin/pages/${j._id}`);
    else alert('Saved');
  };

  const del = async ()=>{
    if(isNew) return router.push('/admin/pages');
    if(!confirm('Delete this page?')) return;
    const r = await fetch(`/api/admin/pages/${id}`, { method:'DELETE' });
    if(r.ok) router.push('/admin/pages');
    else alert('Delete failed');
  };

  if(loading) return <div className="card">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{isNew ? 'New Page' : 'Edit Page'}</h1>
        <div className="flex items-center gap-2">
          {!isNew && <button className="btn btn-secondary" onClick={del}>Delete</button>}
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <div className="card grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
        </div>
        <div>
          <label className="label">Slug</label>
          <input className="input" value={form.slug} onChange={e=>setForm({...form, slug:e.target.value.replace(/^\//,'')})} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e=>setForm({...form, status:e.target.value})}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Add block controls */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          {BLOCK_TYPES.map(bt=>(
            <button key={bt.value} className="btn btn-secondary" onClick={()=>addBlock(bt.value)}>
              + {bt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Blocks editor */}
      <div className="space-y-4">
        {form.blocks.map((b, i)=>(
          <div key={i} className="card space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{b.type}</div>
              <div className="flex items-center gap-2">
                <button className="btn" onClick={()=>move(i,-1)}>↑</button>
                <button className="btn" onClick={()=>move(i,+1)}>↓</button>
                <button className="btn btn-secondary" onClick={()=>removeBlockAt(i)}>Remove</button>
              </div>
            </div>

            {b.type === 'banner' && (
              <>
                <ImagePicker label="Image" value={b.image ? [b.image] : []} multiple={false}
                  onChange={(arr)=>updateBlockAt(i,{ image: arr[0] || '' })} />
                <TextInput label="Headline" v={b.headline} onC={v=>updateBlockAt(i,{headline:v})} />
                <TextInput label="Subheadline" v={b.subheadline} onC={v=>updateBlockAt(i,{subheadline:v})} />
                <Select label="Align" v={b.align} onC={v=>updateBlockAt(i,{align:v})}
                        opts={[['left','Left'],['center','Center'],['right','Right']]} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <TextInput label="CTA Label" v={b.ctaLabel} onC={v=>updateBlockAt(i,{ctaLabel:v})} />
                  <TextInput label="CTA Href" v={b.ctaHref} onC={v=>updateBlockAt(i,{ctaHref:v})} />
                </div>
              </>
            )}

            {b.type === 'text' && (
              <>
                <TextInput label="Headline" v={b.headline} onC={v=>updateBlockAt(i,{headline:v})} />
                <RichText label="Content (HTML)" v={b.textHtml} onC={v=>updateBlockAt(i,{textHtml:v})} />
              </>
            )}

            {b.type === 'imageText' && (
              <>
                <ImagePicker label="Image" value={b.image ? [b.image] : []} multiple={false}
                  onChange={(arr)=>updateBlockAt(i,{ image: arr[0] || '' })} />
                <TextInput label="Headline" v={b.headline} onC={v=>updateBlockAt(i,{headline:v})} />
                <RichText label="Text" v={b.textHtml} onC={v=>updateBlockAt(i,{textHtml:v})} />
                <Select label="Align (image side)" v={b.align} onC={v=>updateBlockAt(i,{align:v})}
                        opts={[['left','Left'],['right','Right']]} />
              </>
            )}

            {b.type === 'gallery' && (
              <>
                <TextInput label="Headline" v={b.headline} onC={v=>updateBlockAt(i,{headline:v})} />
                <ImagePicker label="Gallery images" value={b.images || []} onChange={(arr)=>updateBlockAt(i,{images:arr})} multiple />
              </>
            )}

            {b.type === 'parallax' && (
              <>
                <ImagePicker label="Background" value={b.image ? [b.image] : []} multiple={false}
                  onChange={(arr)=>updateBlockAt(i,{ image: arr[0] || '' })} />
                <TextInput label="Headline" v={b.headline} onC={v=>updateBlockAt(i,{headline:v})} />
                <TextInput label="Subheadline" v={b.subheadline} onC={v=>updateBlockAt(i,{subheadline:v})} />
                <NumberInput label="Height (px)" v={b.height} onC={v=>updateBlockAt(i,{height:v})} />
                <NumberInput label="Overlay opacity (0-1)" step="0.05" v={b.overlayOpacity} onC={v=>updateBlockAt(i,{overlayOpacity:v})} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small field helpers **/
function TextInput({ label, v, onC }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={v || ''} onChange={e=>onC(e.target.value)} />
    </div>
  );
}

function NumberInput({ label, v, onC, step='1' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" step={step} value={v ?? ''} onChange={e=>onC(parseFloat(e.target.value || 0))} />
    </div>
  );
}

function Select({ label, v, onC, opts=[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={v || ''} onChange={e=>onC(e.target.value)}>
        {opts.map(([val,lab]) => <option key={val} value={val}>{lab}</option>)}
      </select>
    </div>
  );
}

/** ✅ CKEditor-based rich text — saves clean HTML, no image UI */
function RichText({ label, v, onC }) {
  const config = useMemo(() => ({
    placeholder: 'Type here…',
    toolbar: [
      'heading', '|',
      'bold', 'italic', 'link', '|',
      'bulletedList', 'numberedList', 'blockQuote', '|',
      'undo', 'redo'
    ],
    link: { addTargetToExternalLinks: true }
  }), []);

  return (
    <div>
      <label className="label">{label}</label>
      <div className="border rounded-xl overflow-hidden">
        <CKEditor
          editor={ClassicEditor}
          config={config}
          data={v || ''}
          onChange={(_, editor) => onC(editor.getData())}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Basic formatting only (bold, italics, lists, links, headings).
      </p>
    </div>
  );
}