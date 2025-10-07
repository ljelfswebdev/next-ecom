'use client';
import { useEffect, useState } from 'react';

export default function AdminMenuEditPage({ params }){
  const { id } = params;
  const [menu,setMenu] = useState(null);
  const [pages,setPages] = useState([]);

  useEffect(()=>{
    (async ()=>{
      const [rM, rP] = await Promise.all([
        fetch(`/api/admin/menus/${id}`, { cache:'no-store' }),
        fetch(`/api/admin/pages?status=published`, { cache:'no-store' }).catch(()=>null),
      ]);
      if (rM.ok) setMenu(await rM.json());
      if (rP?.ok) setPages(await rP.json());
    })();
  },[id]);

  const save = async ()=>{
    const r = await fetch(`/api/admin/menus/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(menu)
    });
    if (r.ok) alert('Saved'); else alert('Save failed');
  };

  const del = async ()=>{
    if (!confirm('Delete this menu?')) return;
    const r = await fetch(`/api/admin/menus/${id}`, { method:'DELETE' });
    if (r.ok) window.location.href = '/admin/menus';
  };

  /** ---------- item ops ---------- */
  const addItem = (parentPath=null, item=null)=>{
    const newItem = item || { label:'(untitled)', type:'custom', href:'#', target:'_self', children:[] };
    setMenu(m=>{
      const copy = structuredClone(m);
      const bucket = parentPath ? getPath(copy.items, parentPath).children : copy.items;
      if (!Array.isArray(bucket)) {
        // If parentPath points to a node (not its children), use its children
        const node = getPath(copy.items, parentPath);
        node.children = node.children || [];
        node.children.push(newItem);
      } else {
        bucket.push(newItem);
      }
      return copy;
    });
  };

  const updateItem = (path, patch)=>{
    setMenu(m=>{
      const copy = structuredClone(m);
      const node = getPath(copy.items, path);
      Object.assign(node, patch);
      return copy;
    });
  };

  const removeItem = (path)=>{
    setMenu(m=>{
      const copy = structuredClone(m);
      removeAtPath(copy.items, path);
      return copy;
    });
  };

  const makeChild = (path)=>{ // indent: move under previous sibling
    setMenu(m=>{
      const copy = structuredClone(m);
      const parentArr = getParent(copy.items, path);
      const idx = path.at(-1);
      if (idx <= 0) return m;
      const prev = parentArr[idx-1];
      if (!prev.children) prev.children = [];
      const [moved] = parentArr.splice(idx,1);
      prev.children.push(moved);
      return copy;
    });
  };

  const makeSibling = (path)=>{ // outdent: move up a level
    setMenu(m=>{
      const copy = structuredClone(m);
      const parentArr = getParent(copy.items, path);
      const idx = path.at(-1);
      const parentPath = path.slice(0,-1);
      if (parentPath.length === 0) return m; // already root
      const grandParentArr = getParent(copy.items, parentPath);
      const parentIndex = parentPath.at(-1);
      const [moved] = parentArr.splice(idx,1);
      grandParentArr.splice(parentIndex+1, 0, moved);
      return copy;
    });
  };

  const moveItem = (path, dir)=>{ // dir = -1 up, +1 down
    setMenu(m=>{
      const copy = structuredClone(m);
      const arr = getParent(copy.items, path);
      const i = path.at(-1);
      const j = i + dir;
      if (j < 0 || j >= arr.length) return m;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return copy;
    });
  };

  if (!menu) return <div className="card">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit menu</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={del}>Delete</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </div>
      </div>

      <div className="card grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input className="input" value={menu.title} onChange={e=>setMenu({...menu, title:e.target.value})} />
        </div>
        <div>
          <label className="label">Slug</label>
          <input className="input" value={menu.slug} onChange={e=>setMenu({...menu, slug:e.target.value.replace(/\s+/g,'-').toLowerCase()})} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={menu.status} onChange={e=>setMenu({...menu, status:e.target.value})}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Items</h2>
          <div className="flex gap-2">
            <button
              className="btn"
              onClick={()=>addItem(null, {
                label: pages[0]?.title || '(untitled)',
                type:'page',
                pageId: pages[0]?._id,
                pageSlug: pages[0] ? `pages/${pages[0].slug.replace(/^\/+/,'')}` : '',
                href: pages[0] ? `pages/${pages[0].slug.replace(/^\/+/,'')}` : '',
                target:'_self',
                children:[]
              })}
              disabled={!pages.length}
            >
              + Add page
            </button>
            <button className="btn" onClick={()=>addItem(null)}>+ Add custom</button>
          </div>
        </div>

        <Tree
          items={menu.items}
          pages={pages}
          onAddChild={(path)=>addItem(path)}
          onUpdate={updateItem}
          onRemove={removeItem}
          onIndent={makeChild}
          onOutdent={makeSibling}
          onMoveUp={(path)=>moveItem(path,-1)}
          onMoveDown={(path)=>moveItem(path,+1)}
        />
      </div>
    </div>
  );
}

/** ---- helpers for nested arrays ---- */
function getPath(items, path){
  // returns the node at path
  let cur = { children: items };
  for (let i=0;i<path.length;i++){
    cur = (i === path.length-1) ? cur.children[path[i]] : cur.children[path[i]];
    if (i < path.length-1) cur = cur; // keep walking; next loop grabs .children
  }
  return cur;
}
function getParent(items, path){
  // returns the array containing the node at path
  let cur = items;
  for (let i=0;i<path.length-1;i++){
    cur = cur[path[i]].children || (cur[path[i]].children = []);
  }
  return cur;
}
function removeAtPath(items, path){
  const parent = getParent(items, path);
  parent.splice(path.at(-1), 1);
}

/** Recursive tree editor */
function Tree({
  items, pages, onAddChild, onUpdate, onRemove, onIndent, onOutdent,
  onMoveUp, onMoveDown, path=[]
}){
  return (
    <ul className="space-y-2">
      {items.map((it, idx) => {
        const p = [...path, idx];
        const isPage = it.type === 'page';

        return (
          <li key={idx} className="border rounded-xl p-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* type */}
              <select
                className="input w-28"
                value={it.type || 'custom'}
                onChange={e=>{
                  const type = e.target.value;
                  if (type === 'page') {
                    onUpdate(p, { type:'page', pageId: pages[0]?._id, pageSlug: pages[0] ? `pages/${pages[0].slug.replace(/^\/+/,'')}` : '', href: pages[0] ? `pages/${pages[0].slug.replace(/^\/+/,'')}` : '#', label: pages[0]?.title || '(untitled)' });
                  } else {
                    onUpdate(p, { type:'custom', pageId: undefined, pageSlug: undefined, href: it.href || '#', label: it.label || '(untitled)' });
                  }
                }}
              >
                <option value="page">Page</option>
                <option value="custom">Custom</option>
              </select>

              {/* label */}
              <input
                className="input"
                placeholder="Label"
                value={it.label || ''}
                onChange={e=>onUpdate(p, { label: e.target.value })}
              />

              {/* page picker OR custom href */}
              {isPage ? (
                <select
                  className="input"
                  value={String(it.pageId || '')}
                  onChange={e=>{
                    const pg = pages.find(x => String(x._id) === e.target.value);
                    if (!pg) return;
                    const slugPart = `pages/${pg.slug.replace(/^\/+/,'')}`;
                    onUpdate(p, { pageId: pg._id, pageSlug: slugPart, href: `/${slugPart}`, label: pg.title });
                  }}
                >
                  {pages.map(pg => (
                    <option key={pg._id} value={pg._id}>{pg.title} /{pg.slug}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  placeholder="https:// or /slug"
                  value={it.href || ''}
                  onChange={e=>onUpdate(p, { href: e.target.value })}
                />
              )}

              {/* target */}
              <select
                className="input w-28"
                value={it.target || '_self'}
                onChange={e=>onUpdate(p, { target: e.target.value })}
              >
                <option value="_self">Same tab</option>
                <option value="_blank">New tab</option>
              </select>

              {/* actions */}
              <div className="ml-auto flex gap-2">
                <button className="btn" onClick={()=>onMoveUp(p)}>↑</button>
                <button className="btn" onClick={()=>onMoveDown(p)}>↓</button>
                <button className="btn" onClick={()=>onIndent(p)} title="Make child of previous">Indent</button>
                <button className="btn" onClick={()=>onOutdent(p)} title="Outdent to parent">Outdent</button>
                <button className="btn" onClick={()=>onAddChild(p)}>+ Child</button>
                <button className="btn btn-secondary" onClick={()=>onRemove(p)}>Delete</button>
              </div>
            </div>

            {it.children?.length ? (
              <div className="mt-3 ml-4 border-l pl-3">
                <Tree
                  items={it.children}
                  pages={pages}
                  onAddChild={onAddChild}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onIndent={onIndent}
                  onOutdent={onOutdent}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  path={p}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}