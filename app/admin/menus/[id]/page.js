'use client';
import { useEffect, useState } from 'react';

export default function AdminMenuEditPage({ params }) {
  const { id } = params;
  const [menu, setMenu] = useState(null);
  const [pages, setPages] = useState([]);

  // Load menu + published pages
  useEffect(() => {
    (async () => {
      const [rM, rP] = await Promise.all([
        fetch(`/api/admin/menus/${id}`, { cache: 'no-store' }),
        fetch(`/api/admin/pages?status=published`, { cache: 'no-store' }).catch(() => null),
      ]);
      if (rM.ok) setMenu(await rM.json());
      if (rP?.ok) setPages(await rP.json());
    })();
  }, [id]);

  // Save/Delete
  const save = async () => {
    const r = await fetch(`/api/admin/menus/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menu),
    });
    if (r.ok) alert('Saved'); else alert('Save failed');
  };
  const del = async () => {
    if (!confirm('Delete this menu?')) return;
    const r = await fetch(`/api/admin/menus/${id}`, { method: 'DELETE' });
    if (r.ok) window.location.href = '/admin/menus';
  };

  // Tree helpers
  const addItem = (parentPath = null, initial = null) => {
    const newItem = initial || { type: 'custom', label: 'New link', href: '/', target: '_self', children: [] };
    setMenu(m => {
      const copy = structuredClone(m);
      const bucket = parentPath ? getPath(copy.items, parentPath).children ?? [] : copy.items;
      if (parentPath && !getPath(copy.items, parentPath).children) {
        getPath(copy.items, parentPath).children = bucket;
      }
      bucket.push(newItem);
      return copy;
    });
  };

  const updateItem = (path, patch) => {
    setMenu(m => {
      const copy = structuredClone(m);
      const node = getPath(copy.items, path);
      Object.assign(node, patch);
      return copy;
    });
  };

  const removeItem = (path) => {
    setMenu(m => {
      const copy = structuredClone(m);
      removeAtPath(copy.items, path);
      return copy;
    });
  };

  const makeChild = (path) => {
    setMenu(m => {
      const copy = structuredClone(m);
      const parentArr = getParent(copy.items, path);
      const idx = path.at(-1);
      if (idx <= 0) return m;
      const prev = parentArr[idx - 1];
      if (!prev.children) prev.children = [];
      const [moved] = parentArr.splice(idx, 1);
      prev.children.push(moved);
      return copy;
    });
  };

  const makeSibling = (path) => {
    setMenu(m => {
      const copy = structuredClone(m);
      const parentArr = getParent(copy.items, path);
      const idx = path.at(-1);
      const parentPath = path.slice(0, -1);
      if (parentPath.length === 0) return m; // already root
      const grandParentArr = getParent(copy.items, parentPath);
      const parentIndex = parentPath.at(-1);
      const [moved] = parentArr.splice(idx, 1);
      grandParentArr.splice(parentIndex + 1, 0, moved);
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
          <input className="input" value={menu.title || ''} onChange={e => setMenu({ ...menu, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Slug</label>
          <input className="input" value={menu.slug || ''} onChange={e => setMenu({ ...menu, slug: e.target.value.replace(/\s+/g, '-').toLowerCase() })} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={menu.status || 'published'} onChange={e => setMenu({ ...menu, status: e.target.value })}>
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
              onClick={() => {
                // if there are pages, add a page item seeded with the first page
                const first = pages[0];
                if (first) addItem(null, pageItemFrom(first));
                else addItem(null); // fallback to custom if no pages yet
              }}
            >
              + Add page
            </button>
            <button className="btn" onClick={() => addItem(null)}>+ Add custom</button>
          </div>
        </div>

        <Tree
          items={menu.items || []}
          pages={pages}
          onAddChild={(path) => {
            const first = pages[0];
            addItem(path, first ? pageItemFrom(first) : undefined);
          }}
          onUpdate={(path, patch) => updateItem(path, patch)}
          onRemove={removeItem}
          onIndent={makeChild}
          onOutdent={makeSibling}
        />
      </div>
    </div>
  );
}

/** Utilities */
function pageItemFrom(pg) {
  return {
    type: 'page',
    label: pg.title,
    pageId: pg._id,
    pageSlug: pg.slug,
    href: `/pages/${String(pg.slug || '').replace(/^\/+/, '')}`,
    target: '_self',
    children: [],
  };
}

function getPath(items, path) {
  let cur = items;
  for (let i = 0; i < path.length; i++) {
    cur = (i === path.length - 1) ? cur[path[i]] : (cur[path[i]].children || (cur[path[i]].children = []));
  }
  return cur;
}
function getParent(items, path) {
  let cur = items;
  for (let i = 0; i < path.length - 1; i++) {
    cur = cur[path[i]].children || (cur[path[i]].children = []);
  }
  return cur;
}
function removeAtPath(items, path) {
  const parent = getParent(items, path);
  parent.splice(path.at(-1), 1);
}

/** Recursive, simplified editor */
function Tree({ items, pages, onAddChild, onUpdate, onRemove, onIndent, onOutdent, path = [] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, idx) => {
        const p = [...path, idx];
        const isPage = it.type === 'page';

        // derive href preview for page items
        const pageHrefPreview = isPage
          ? `/pages/${String(it.pageSlug || it.href || '').replace(/^\/+/, '').replace(/^pages\//, '')}`
          : (it.href || '');

        return (
          <li key={idx} className="border rounded-xl p-3">
            {/* Type */}
            <div className="grid sm:grid-cols-12 gap-2 items-start">
              <div className="sm:col-span-2">
                <label className="label">Type</label>
                <select
                  className="input"
                  value={it.type || 'custom'}
                  onChange={e => {
                    const t = e.target.value;
                    if (t === 'page') {
                      // switch to page: seed from first page or clear
                      const first = pages[0];
                      if (first) onUpdate(p, pageItemFrom(first));
                      else onUpdate(p, { type: 'page', label: '', pageId: '', pageSlug: '', href: '', target: '_self' });
                    } else {
                      onUpdate(p, { type: 'custom', label: it.label || 'New link', href: it.href || '/', pageId: undefined, pageSlug: undefined });
                    }
                  }}
                >
                  <option value="page">Page</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* When PAGE: show only the Page dropdown + preview. No free-text label box. */}
              {isPage ? (
                <>
                  <div className="sm:col-span-5">
                    <label className="label">Page</label>
                    <select
                      className="input"
                      value={String(it.pageId || '')}
                      onChange={e => {
                        const pg = pages.find(x => String(x._id) === String(e.target.value));
                        if (pg) onUpdate(p, pageItemFrom(pg));
                      }}
                    >
                      {pages.map(pg => (
                        <option key={pg._id} value={pg._id}>
                          {pg.title} /{pg.slug}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="label">Opens</label>
                    <select
                      className="input"
                      value={it.target || '_self'}
                      onChange={e => onUpdate(p, { target: e.target.value })}
                    >
                      <option value="_self">Same tab</option>
                      <option value="_blank">New tab</option>
                    </select>
                  </div>
                  <div className="sm:col-span-12 text-xs text-gray-500">
                    Link: <code>{pageHrefPreview}</code> • Label: <code>{it.label || '(auto from page)'}</code>
                  </div>
                </>
              ) : (
                // When CUSTOM: show label + href + target
                <>
                  <div className="sm:col-span-4">
                    <label className="label">Label</label>
                    <input
                      className="input"
                      value={it.label || ''}
                      onChange={e => onUpdate(p, { label: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="label">Href</label>
                    <input
                      className="input"
                      placeholder="/path-or-https://"
                      value={it.href || ''}
                      onChange={e => onUpdate(p, { href: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Opens</label>
                    <select
                      className="input"
                      value={it.target || '_self'}
                      onChange={e => onUpdate(p, { target: e.target.value })}
                    >
                      <option value="_self">Same tab</option>
                      <option value="_blank">New tab</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="mt-3 flex gap-2">
              <button className="btn" onClick={() => onIndent(p)}>Indent</button>
              <button className="btn" onClick={() => onOutdent(p)}>Outdent</button>
              <button className="btn" onClick={() => onAddChild(p)}>+ Child</button>
              <button className="btn btn-secondary" onClick={() => onRemove(p)}>Delete</button>
            </div>

            {/* Children */}
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