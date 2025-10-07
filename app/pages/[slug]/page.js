import { notFound } from 'next/navigation';

async function getPage(slug){
  const r = await fetch(`${process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/pages/${slug}`, { cache: 'no-store' });
  if(!r.ok) return null;
  return r.json();
}

export default async function CmsPage({ params }){
  const page = await getPage(params.slug);
  if(!page || page.status !== 'published') return notFound();

  return (
    <div className="space-y-8">
      <header className="text-center my-6">
        <h1 className="text-3xl font-bold">{page.title}</h1>
      </header>

      <div className="space-y-8">
        {page.blocks?.map((b, i)=>(
          <Block key={i} b={b} />
        ))}
      </div>
    </div>
  );
}

function Block({ b }){
  if(b.type === 'banner'){
    return (
      <section className="relative rounded-2xl overflow-hidden">
        {b.image && <img src={b.image} alt="" className="w-full h-72 md:h-96 object-cover" />}
        <div className="absolute inset-0 bg-black/30" />
        <div className={`absolute inset-0 flex items-center justify-${b.align || 'center'}`}>
          <div className="text-white p-6 md:p-10 max-w-3xl">
            {b.headline && <h2 className="text-3xl md:text-4xl font-bold">{b.headline}</h2>}
            {b.subheadline && <p className="mt-2 text-lg">{b.subheadline}</p>}
            {b.ctaHref && b.ctaLabel && (
              <a href={b.ctaHref} className="btn btn-primary mt-4 inline-block">{b.ctaLabel}</a>
            )}
          </div>
        </div>
      </section>
    );
  }

  if(b.type === 'text'){
    return (
      <section className="card">
        {b.headline && <h3 className="text-2xl font-semibold mb-3">{b.headline}</h3>}
        {b.textHtml && <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: b.textHtml }} />}
      </section>
    );
  }

  if(b.type === 'imageText'){
    const imgLeft = (b.align || 'left') === 'left';
    return (
      <section className="grid md:grid-cols-2 gap-6 items-center">
        {imgLeft && b.image && <img src={b.image} alt="" className="w-full rounded-2xl object-cover" />}
        <div className="card">
          {b.headline && <h3 className="text-2xl font-semibold mb-3">{b.headline}</h3>}
          {b.textHtml && <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: b.textHtml }} />}
        </div>
        {!imgLeft && b.image && <img src={b.image} alt="" className="w-full rounded-2xl object-cover" />}
      </section>
    );
  }

  if(b.type === 'gallery'){
    return (
      <section className="card">
        {b.headline && <h3 className="text-2xl font-semibold mb-3">{b.headline}</h3>}
        {Array.isArray(b.images) && b.images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {b.images.map((src, i)=>(
              <img key={i} src={src} alt="" className="w-full h-40 object-cover rounded-xl border" />
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No images.</p>}
      </section>
    );
  }

  if(b.type === 'parallax'){
    const h = Math.max(240, b.height || 480);
    const op = Math.max(0, Math.min(1, b.overlayOpacity ?? 0.3));
    return (
      <section className="relative rounded-2xl overflow-hidden" style={{ height: h }}>
        {b.image && (
          <div
            className="absolute inset-0 bg-cover bg-center will-change-transform"
            style={{ backgroundImage: `url(${b.image})`, transform: 'translateZ(0)' }}
          />
        )}
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${op})` }} />
        <div className="relative z-10 h-full flex items-center justify-center text-center p-6">
          <div className="text-white max-w-3xl">
            {b.headline && <h3 className="text-3xl md:text-4xl font-bold">{b.headline}</h3>}
            {b.subheadline && <p className="mt-2 text-lg">{b.subheadline}</p>}
          </div>
        </div>
      </section>
    );
  }

  return null;
}