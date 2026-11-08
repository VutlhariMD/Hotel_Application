import { useEffect, useState, type FormEvent } from 'react';
import { fetchReviews, submitReview } from '../store/reviewsSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

type Props = {
  roomId: number;
};

export default function RoomReviews({ roomId }: Props) {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const reviews = useAppSelector((s) => s.reviews.byRoom[roomId] || []);
  const avg = useAppSelector((s) => s.reviews.avgByRoom[roomId]);
  const error = useAppSelector((s) => s.reviews.error);
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchReviews(roomId));
  }, [dispatch, roomId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    const result = await dispatch(
      submitReview({ roomId, rating: Number(form.rating), comment: form.comment })
    );
    if (submitReview.fulfilled.match(result)) {
      setMsg('Review saved');
      setForm({ rating: 5, comment: '' });
      dispatch(fetchReviews(roomId));
    }
  }

  return (
    <div className="reviews-block">
      <h3>Reviews & ratings</h3>
      <p className="muted">
        {avg != null ? `Guest average ${avg.toFixed(1)}/5` : 'No guest reviews yet'}
        {reviews.length ? ` · ${reviews.length} review${reviews.length === 1 ? '' : 's'}` : ''}
      </p>

      <ul className="review-list">
        {reviews.map((review) => (
          <li key={review.id}>
            <strong>{review.user_name || 'Guest'}</strong>
            <span className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
            {review.comment && <p>{review.comment}</p>}
          </li>
        ))}
      </ul>

      {token ? (
        <form className="review-form" onSubmit={onSubmit}>
          <label>
            Your rating
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Comment
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              rows={2}
              placeholder="Share your stay experience"
            />
          </label>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success-msg">{msg}</p>}
          <button className="btn btn-ghost btn-sm" type="submit">
            Submit review
          </button>
        </form>
      ) : (
        <p className="hint">Log in after a paid booking to leave a review.</p>
      )}
    </div>
  );
}
