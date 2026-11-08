import { useEffect, useState, type FormEvent } from 'react';
import {
  createRoom,
  deleteRoom,
  fetchRooms,
  updateRoom,
} from '../store/roomsSlice';
import {
  deleteAdminBooking,
  fetchAdminBookings,
  updateAdminBooking,
} from '../store/adminSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { formatZAR } from '../utils/money';
import type { Room, RoomFormPayload } from '../types';

const emptyRoom: RoomFormPayload & { imagesText: string } = {
  name: '',
  description: '',
  price_per_night: 1000,
  capacity: 2,
  room_type: 'standard',
  available: true,
  images: [],
  imagesText:
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800\nhttps://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
  address: '12 Church Street, Polokwane, Limpopo, 0699',
  latitude: -23.9045,
  longitude: 29.4689,
};

function parseImages(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function Admin() {
  const dispatch = useAppDispatch();
  const rooms = useAppSelector((s) => s.rooms.list);
  const { bookings, status, error } = useAppSelector((s) => s.admin);
  const [tab, setTab] = useState<'rooms' | 'reservations'>('rooms');
  const [form, setForm] = useState(emptyRoom);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editBooking, setEditBooking] = useState<{
    id: number;
    checkIn: string;
    checkOut: string;
    guests: number;
    status: string;
  } | null>(null);

  useEffect(() => {
    dispatch(fetchRooms());
    dispatch(fetchAdminBookings());
  }, [dispatch]);

  function startEdit(room: Room) {
    const images = room.images?.length ? room.images : [room.image_url];
    setEditingId(room.id);
    setForm({
      name: room.name,
      description: room.description,
      price_per_night: Number(room.price_per_night),
      capacity: room.capacity,
      room_type: room.room_type,
      available: room.available,
      images,
      imagesText: images.join('\n'),
      address: room.address || '',
      latitude: Number(room.latitude),
      longitude: Number(room.longitude),
    });
    setMsg(null);
    setFormError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyRoom);
    setFormError(null);
  }

  async function onSubmitRoom(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setFormError(null);

    const images = parseImages(form.imagesText);
    if (!images.length) {
      setFormError('Add at least one image URL (one per line)');
      return;
    }

    const payload: RoomFormPayload = {
      name: form.name,
      description: form.description,
      price_per_night: form.price_per_night,
      capacity: form.capacity,
      room_type: form.room_type,
      available: form.available,
      images,
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    };

    if (editingId) {
      const result = await dispatch(updateRoom({ id: editingId, ...payload }));
      if (updateRoom.fulfilled.match(result)) {
        setMsg('Room updated');
        resetForm();
      } else {
        setFormError(result.error.message || 'Update failed');
      }
    } else {
      const result = await dispatch(createRoom(payload));
      if (createRoom.fulfilled.match(result)) {
        setMsg('Room added');
        resetForm();
      } else {
        setFormError(result.error.message || 'Create failed');
      }
    }
  }

  async function onDeleteRoom(id: number) {
    if (!confirm('Delete this room?')) return;
    await dispatch(deleteRoom(id));
    if (editingId === id) resetForm();
  }

  async function onSaveBooking(e: FormEvent) {
    e.preventDefault();
    if (!editBooking) return;
    const result = await dispatch(
      updateAdminBooking({
        id: editBooking.id,
        checkIn: editBooking.checkIn,
        checkOut: editBooking.checkOut,
        guests: editBooking.guests,
        status: editBooking.status,
      })
    );
    if (updateAdminBooking.fulfilled.match(result)) {
      setEditBooking(null);
      dispatch(fetchAdminBookings());
    }
  }

  async function onDeleteBooking(id: number) {
    if (!confirm('Delete this reservation?')) return;
    await dispatch(deleteAdminBooking(id));
  }

  return (
    <section className="admin-page">
      <div className="page-intro">
        <h1>Admin panel</h1>
        <p className="muted">
          Manage rooms (photos, address, map pin), pricing, availability, and reservations.
        </p>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`btn ${tab === 'rooms' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('rooms')}
        >
          Rooms
        </button>
        <button
          type="button"
          className={`btn ${tab === 'reservations' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('reservations')}
        >
          Reservations
        </button>
      </div>

      {tab === 'rooms' && (
        <div className="admin-grid">
          <form className="auth-form admin-form" onSubmit={onSubmitRoom}>
            <h2>{editingId ? 'Edit room' : 'Add room'}</h2>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                rows={3}
              />
            </label>
            <div className="row">
              <label>
                Price / night
                <input
                  type="number"
                  min={1}
                  value={form.price_per_night}
                  onChange={(e) =>
                    setForm({ ...form, price_per_night: Number(e.target.value) })
                  }
                  required
                />
              </label>
              <label>
                Capacity
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <div className="row">
              <label>
                Room type
                <input
                  value={form.room_type}
                  onChange={(e) => setForm({ ...form, room_type: e.target.value })}
                  placeholder="single, double, suite…"
                  required
                />
              </label>
              <label className="checkbox-label">
                Available
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.checked })}
                />
              </label>
            </div>
            <label>
              Image URLs (one per line)
              <textarea
                value={form.imagesText}
                onChange={(e) => setForm({ ...form, imagesText: e.target.value })}
                required
                rows={4}
                placeholder="https://…&#10;https://…"
              />
            </label>
            <label>
              Address
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </label>
            <div className="row">
              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            {formError && <p className="error">{formError}</p>}
            {msg && <p className="success-msg">{msg}</p>}
            <div className="room-actions">
              <button className="btn btn-primary" type="submit">
                {editingId ? 'Update room' : 'Add room'}
              </button>
              {editingId && (
                <button className="btn btn-ghost" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="admin-list">
            {rooms.map((room) => (
              <article key={room.id} className="admin-item">
                <img src={room.image_url} alt={room.name} />
                <div>
                  <h2>{room.name}</h2>
                  <p className="muted">
                    {formatZAR(room.price_per_night, 0)}/night · Sleeps {room.capacity} ·{' '}
                    {room.room_type} · {room.available ? 'Available' : 'Unavailable'} ·{' '}
                    {(room.images?.length || 1)} photos
                  </p>
                  <p className="meta">{room.address}</p>
                  <div className="room-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(room)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeleteRoom(room.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'reservations' && (
        <div>
          {status === 'loading' && <p>Loading reservations…</p>}
          {error && <p className="error">{error}</p>}
          {!bookings.length && status !== 'loading' && (
            <p className="muted">No reservations yet.</p>
          )}

          <div className="booking-list">
            {bookings.map((b) => (
              <article key={b.id} className="booking-item">
                <img src={b.image_url} alt={b.room_name} />
                <div>
                  <h2>{b.room_name}</h2>
                  <p className="muted">
                    {b.guest_name} ({b.guest_email})
                  </p>
                  <p className="muted">
                    {String(b.check_in).slice(0, 10)} → {String(b.check_out).slice(0, 10)} ·{' '}
                    {b.guests} guest{b.guests === 1 ? '' : 's'}
                  </p>
                  <p className="total">{formatZAR(b.total_price)}</p>
                  <span className={`badge badge-${b.status}`}>{b.status}</span>

                  {editBooking?.id === b.id ? (
                    <form className="inline-edit" onSubmit={onSaveBooking}>
                      <div className="row">
                        <label>
                          Check-in
                          <input
                            type="date"
                            value={editBooking.checkIn}
                            onChange={(e) =>
                              setEditBooking({ ...editBooking, checkIn: e.target.value })
                            }
                            required
                          />
                        </label>
                        <label>
                          Check-out
                          <input
                            type="date"
                            value={editBooking.checkOut}
                            onChange={(e) =>
                              setEditBooking({ ...editBooking, checkOut: e.target.value })
                            }
                            required
                          />
                        </label>
                      </div>
                      <div className="row">
                        <label>
                          Guests
                          <input
                            type="number"
                            min={1}
                            value={editBooking.guests}
                            onChange={(e) =>
                              setEditBooking({
                                ...editBooking,
                                guests: Number(e.target.value),
                              })
                            }
                            required
                          />
                        </label>
                        <label>
                          Status
                          <select
                            value={editBooking.status}
                            onChange={(e) =>
                              setEditBooking({ ...editBooking, status: e.target.value })
                            }
                          >
                            <option value="pending">pending</option>
                            <option value="paid">paid</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </label>
                      </div>
                      <div className="room-actions">
                        <button className="btn btn-primary btn-sm" type="submit">
                          Save
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => setEditBooking(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="room-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setEditBooking({
                            id: b.id,
                            checkIn: String(b.check_in).slice(0, 10),
                            checkOut: String(b.check_out).slice(0, 10),
                            guests: b.guests,
                            status: b.status,
                          })
                        }
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => onDeleteBooking(b.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
