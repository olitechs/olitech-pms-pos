import React, { useState } from 'react';
import { CalendarPlus, Trash2, DoorOpen } from 'lucide-react';
import { usePms } from '@/data/PmsStore';
import { NAVY, TEAL, TEAL_DARK, SAND, SURFACE, SURFACE2, BORDER, MUTED, DESTRUCTIVE } from '@/data/themePalette';

function fmtKes(n) {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`;
}

export default function Reservations() {
  const pms = usePms();
  const availableRooms = pms.rooms.filter((r) => r.status === 'available');

  const [guest, setGuest] = useState('');
  const [phone, setPhone] = useState('');
  const [roomId, setRoomId] = useState('');
  const [arrival, setArrival] = useState('');
  const [departure, setDeparture] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');

  const upcoming = pms.reservations
    .filter((r) => r.status === 'booked')
    .sort((a, b) => a.arrival.localeCompare(b.arrival));

  const submit = () => {
    if (!guest || !phone || !roomId || !arrival || !departure) {
      setError('Guest, phone, room, arrival and departure are all required.');
      return;
    }
    pms.addReservation({ guest, phone, roomId, arrival, departure, partySize: Number(partySize) || 1, rate: Number(rate) || 0 });
    setGuest(''); setPhone(''); setRoomId(''); setArrival(''); setDeparture(''); setPartySize(1); setRate(''); setError('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4" style={{ background: SAND }}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-2xl p-4 h-fit" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarPlus size={16} style={{ color: TEAL_DARK }} />
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>New Reservation</h3>
          </div>

          <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Guest name *</label>
          <input value={guest} onChange={(e) => setGuest(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg mb-3 text-sm outline-none"
            style={{ background: SURFACE2, border: `1.5px solid ${BORDER}`, color: NAVY }} />

          <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Phone *</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg mb-3 text-sm outline-none"
            style={{ background: SURFACE2, border: `1.5px solid ${BORDER}`, color: NAVY }} />

          <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Room *</label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg mb-3 text-sm outline-none"
            style={{ background: SURFACE2, border: `1.5px solid ${BORDER}`, color: NAVY }}>
            <option value="">Select room…</option>
            {availableRooms.map((r) => (
              <option key={r.id} value={r.id}>Room {r.number} · Floor {r.floor}</option>
            ))}
          </select>
          {availableRooms.length === 0 && (
            <div className="text-xs mb-1" style={{ color: DESTRUCTIVE }}>No rooms currently available for booking.</div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Arrival *</label>
              <input type="date" value={arrival} onChange={(e) => setArrival(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: SURFACE2, border: `1.5px solid ${BORDER}`, color: NAVY }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Departure *</label>
              <input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: SURFACE2, border: `1.5px solid ${BORDER}`, color: NAVY }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Party size</label>
              <input type="number" min="1" value={partySize} onChange={(e) => setPartySize(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: SURFACE2, border: `1.5px solid ${BORDER}`, color: NAVY }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Rate/night</label>
              <input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="KES"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: SURFACE2, border: `1.5px solid ${BORDER}`, color: NAVY }} />
            </div>
          </div>

          {error && <div className="text-xs mb-3" style={{ color: DESTRUCTIVE }}>{error}</div>}

          <button onClick={submit} className="w-full py-3 rounded-xl text-sm font-bold" style={{ background: TEAL, color: '#090C11' }}>
            Add Reservation
          </button>
        </div>

        <div className="lg:col-span-2 rounded-2xl overflow-hidden h-fit" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: MUTED }}>Upcoming Bookings</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: SURFACE2, borderBottom: `1px solid ${BORDER}` }}>
                {['Guest', 'Phone', 'Room', 'Arrival', 'Departure', 'Party', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((rv, i) => (
                <tr key={rv.id} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 ? SURFACE2 : SURFACE }}>
                  <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{rv.guest}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{rv.phone}</td>
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: NAVY }}>{rv.roomNumber}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{rv.arrival}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{rv.departure}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{rv.partySize}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => pms.checkInReservation(rv.id)} title="Check in"
                        className="p-1.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEAL_DARK }}>
                        <DoorOpen size={14} />
                      </button>
                      <button onClick={() => pms.removeReservation(rv.id)} title="Remove"
                        className="p-1.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: DESTRUCTIVE }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm" style={{ color: MUTED }}>No upcoming bookings.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
