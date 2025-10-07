'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MainMenu({ slug = 'main' }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const url = `/api/menus/${slug}`;
        const r = await fetch(url, { cache: 'no-store' });
        console.log('[MainMenu] status:', r.status);
        if (!r.ok) return;
        const m = await r.json();

        const normalize = (arr = []) =>
          arr.map(raw => {
            const it = { ...raw };

            // Ensure children is an array
            if (!Array.isArray(it.children)) it.children = [];

            if (it.type === 'page' || it.pageId || it.pageSlug) {
              // Build href and label from slug
              const slugPart = String(it.pageSlug || it.href || '')
                .replace(/^\/+/, '')        // remove leading slashes
                .replace(/^pages\/+/, '');   // remove leading "pages/"
              it.href = slugPart ? `/pages/${slugPart}` : '#';

              // If no label provided, derive a nice one from the slug
              if (!it.label || !it.label.trim()) {
                it.label = slugPart
                  ? slugPart
                      .split('/')
                      .pop()
                      .split('-')
                      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')
                  : '(Page)';
              }
            } else {
              // Custom link
              it.href = it.href || '#';
              if (!it.label || !it.label.trim()) {
                // Fallback so you never see "(untitled)"
                it.label = it.href.startsWith('/')
                  ? it.href
                      .replace(/^\/+/, '')
                      .split('/')
                      .pop()
                      .replace(/-/g, ' ')
                      .replace(/\b\w/g, c => c.toUpperCase()) || 'Link'
                  : 'Link';
              }
            }

            // Recurse for children
            if (it.children.length) it.children = normalize(it.children);
            return it;
          });

        setItems(normalize(m.items || []));
      } catch (e) {
        console.error('MainMenu fetch failed', e);
      }
    })();
  }, [slug]);

  if (!items.length) return null;

  return (
    <nav className="hidden md:flex items-center gap-6">
      {items.map((it, idx) => (
        <MenuItem key={idx} item={it} />
      ))}
    </nav>
  );
}

function MenuItem({ item }) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  if (!hasChildren) {
    return (
      <Link href={item.href || '#'} target={item.target || '_self'} className="hover:underline">
        {item.label || 'Link'}
      </Link>
    );
  }

  return (
    <div className="relative group">
      <Link href={item.href || '#'} target={item.target || '_self'} className="hover:underline">
        {item.label || 'Link'}
      </Link>
      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition
                      absolute left-0 top-full mt-2 min-w-[200px] rounded-xl border bg-white shadow p-2 z-40">
        {item.children.map((c, i) => (
          <SubItem key={i} item={c} />
        ))}
      </div>
    </div>
  );
}

function SubItem({ item }) {
  const hasGrand = Array.isArray(item.children) && item.children.length > 0;

  if (!hasGrand) {
    return (
      <Link
        href={item.href || '#'}
        target={item.target || '_self'}
        className="block px-3 py-2 rounded hover:bg-gray-50"
      >
        {item.label || 'Link'}
      </Link>
    );
  }

  return (
    <div className="relative group/fly">
      <Link
        href={item.href || '#'}
        target={item.target || '_self'}
        className="block px-3 py-2 rounded hover:bg-gray-50"
      >
        {item.label || 'Link'} →
      </Link>
      <div className="invisible opacity-0 group-hover/fly:visible group-hover/fly:opacity-100 transition
                      absolute left-full top-0 ml-2 min-w-[200px] rounded-xl border bg-white shadow p-2 z-50">
        {item.children.map((c, i) => (
          <SubItem key={i} item={c} />
        ))}
      </div>
    </div>
  );
}