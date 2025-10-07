// app/api/menus/[slug]/route.js
import { dbConnect } from '@/lib/db';
import Menu from '@/models/Menu';

function normalizeItems(items = []) {
  return items.map(it => {
    let href = it.href || '#';

    // If it's a page item OR it clearly references a page (has pageId/pageSlug)
    const looksLikePage = it.type === 'page' || it.pageId || it.pageSlug;

    if (looksLikePage) {
      const slug = (it.pageSlug || href || '').replace(/^\/+/, '');
      if (slug && !href.startsWith('/pages/')) {
        href = `/pages/${slug}`;
      }
      return {
        ...it,
        type: 'page',
        pageSlug: slug,
        href,
        children: it.children?.length ? normalizeItems(it.children) : []
      };
    }

    // custom stays custom
    return {
      ...it,
      href,
      children: it.children?.length ? normalizeItems(it.children) : []
    };
  });
}

export async function GET(_, { params }) {
  await dbConnect();
  const menu = await Menu.findOne({ slug: params.slug });
  if (!menu) return new Response('Not found', { status: 404 });

  const safe = {
    ...menu.toObject(),
    items: normalizeItems(menu.items || [])
  };

  return new Response(JSON.stringify(safe), { status: 200 });
}