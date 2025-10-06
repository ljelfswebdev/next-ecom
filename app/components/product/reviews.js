// inside your ProductPage component file
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

function Stars({ value, size='text-base' }) {
  const v = Math.round(Number(value) || 0);
  return (
    <div className={`inline-flex ${size}`}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} aria-hidden className={i <= v ? 'text-yellow-500' : 'text-gray-300'}>★</span>
      ))}
      <span className="sr-only">{v} out of 5</span>
    </div>
  );
}

export function ProductReviews({ slug }) {
  const { data: session } = useSession();
  const [list, setList] = useState([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/products/${slug}/reviews`, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      setList(j.reviews || []);
      setAvg(j.ratingAvg || 0);
      setCount(j.ratingCount || 0);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const submit = async () => {
    if (!myRating) return;
    setSubmitting(true);
    const r = await fetch(`/api/products/${slug}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ rating: myRating, comment: myComment }),
    });
    setSubmitting(false);
    if (r.ok) {
      setMyComment('');
      await load();
    } else {
      alert(await r.text());
    }
  };

  return (
    <div className="mt-10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stars value={avg} />
          <div className="text-sm text-gray-600">({count} {count===1?'review':'reviews'})</div>
        </div>
      </div>

      {/* Write review */}
      {session?.user ? (
        <div className="card">
          <h3 className="font-semibold mb-2">Leave a review</h3>
          <div className="flex items-center gap-2">
            <label className="label">Your rating:</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n=>(
                <button
                  key={n}
                  type="button"
                  className="text-2xl"
                  onClick={()=>setMyRating(n)}
                  aria-label={`${n} star`}
                >
                  <span className={n <= myRating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input mt-2"
            placeholder="Share your thoughts (optional)"
            value={myComment}
            onChange={e=>setMyComment(e.target.value)}
            rows={3}
          />
          <div className="mt-2">
            <button className="btn btn-primary" onClick={submit} disabled={submitting || !myRating}>
              {submitting ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          Please <a className="underline" href="/login">log in</a> to leave a review.
        </div>
      )}

      {/* List reviews */}
      <div className="card">
        <h3 className="font-semibold mb-2">Customer reviews</h3>
        {list.length === 0 ? (
          <div className="text-sm text-gray-600">No reviews yet.</div>
        ) : (
          <ul className="divide-y">
            {list.map(r=>(
              <li key={r._id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.userName || 'Customer'}</div>
                  <Stars value={r.rating} />
                </div>
                {r.comment && <p className="text-sm mt-1">{r.comment}</p>}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}