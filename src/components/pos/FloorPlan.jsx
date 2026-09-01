import React, { useState } from 'react';
import { useStore } from '@/data/AppStore';
import { TABLE_CARD, RESERVATIONS_TONIGHT, tableLabel } from '@/data/mockData';
import FitText from '@/components/pos/FitText';
import { STATUS, NAVY, NAVY2, TEAL_LIGHT, SAND, SURFACE, BORDER, BORDER_DARK, MUTED, MUTED_DARK } from '@/data/themePalette';

function elapsedLabel(openedAt) {
  const mins = Math.max(0, Math.floor((Date.now() - openedAt) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function Tile({ table, session, onSelect }) {
  const status = session?.status || 'free';
  const s = STATUS[status];
  const w = table.w || TABLE_CARD.w;
  const h = table.h || TABLE_CARD.h;
  const isUnset = status === 'unsettled';
  const numFont = Math.max(12, Math.min(16, w / 6));

  return (
    <button
      onClick={() => onSelect(table)}
      style={{
        position: 'absolute', left: table.x, top: table.y, width: w, height: h,
        borderRadius: 10, padding: '6px 8px', cursor: 'pointer', touchAction: 'none',
        display: 'flex', flexDirection: 'column',
        background: s.fill, border: isUnset ? `2px solid ${s.border}` : 'none',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold" style={{ color: s.text, fontSize: numFont }}>{tableLabel(table)}</span>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />
      </div>

      {status === 'free' && (
        <div style={{ color: s.text, fontSize: 11, marginTop: 'auto' }}>{table.seats} seats</div>
      )}

      {status === 'occupied' && (
        <>
          <div className="font-mono font-bold" style={{ color: s.text, fontSize: Math.max(11, Math.min(15, w / 6)) }}>
            {elapsedLabel(session.openedAt)}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <FitText text={session.waiter} min={9} max={12} color={s.text} />
            <div style={{ color: s.text, fontSize: 10, opacity: 0.9 }}>{session.guests} guests</div>
          </div>
        </>
      )}

      {isUnset && (
        <>
          <div style={{ color: s.text, fontSize: 9, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Bill printed</div>
          <div style={{ marginTop: 'auto' }}>
            <FitText text={session.waiter} min={9} max={12} color={s.text} />
            <div style={{ color: s.text, fontSize: 10, opacity: 0.8 }}>{session.guests} guests</div>
          </div>
        </>
      )}
    </button>
  );
}

export default function FloorPlan({ onTableSelect }) {
  const store = useStore();
  const [activeZoneId, setActiveZoneId] = useState(store.zones[0]?.id);
  const zone = store.zones.find((z) => z.id === activeZoneId) || store.zones[0];

  if (!zone) return null;

  const canvasW = Math.max(320, ...zone.tables.map((t) => t.x + (t.w || TABLE_CARD.w) + TABLE_CARD.pad));
  const canvasH = Math.max(300, ...zone.tables.map((t) => t.y + (t.h || TABLE_CARD.h) + TABLE_CARD.pad));

  let covers = 0, occupied = 0, openChecks = 0;
  store.zones.forEach((z) => z.tables.forEach((t) => {
    const s = store.getSession(t.id);
    if (!s) return;
    if (s.status === 'occupied') { occupied++; openChecks++; covers += s.guests; }
    else if (s.status === 'unsettled') { openChecks++; covers += s.guests; }
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: SAND }}>
      <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0 overflow-x-auto">
        {store.zones.map((z) => (
          <button
            key={z.id} onClick={() => setActiveZoneId(z.id)}
            className="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0"
            style={{
              background: z.id === zone.id ? TEAL_LIGHT : 'transparent',
              color: z.id === zone.id ? NAVY : MUTED,
              border: `1.5px solid ${z.id === zone.id ? TEAL_LIGHT : BORDER}`,
            }}
          >
            {z.name}
          </button>
        ))}
      </div>

      <div className="flex flex-1 gap-4 px-4 pb-4 min-h-0">
        <div className="flex-1 overflow-auto rounded-xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="relative" style={{ width: canvasW, height: canvasH, minWidth: '100%' }}>
            {zone.tables.map((t) => (
              <Tile
                key={t.id}
                table={{ ...t, zoneId: zone.id, zoneName: zone.name }}
                session={store.getSession(t.id)}
                onSelect={onTableSelect}
              />
            ))}
          </div>
        </div>

        <div className="shrink-0 rounded-xl p-4 flex flex-col gap-3" style={{ background: NAVY2, width: '180px' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TEAL_LIGHT }}>Today</h3>
          <SummaryRow label="Covers Seated" value={covers} />
          <SummaryRow label="Tables Occupied" value={occupied} />
          <SummaryRow label="Open Checks" value={openChecks} />
          <SummaryRow label="Reservations Tonight" value={RESERVATIONS_TONIGHT} />

          <div className="mt-2 pt-3" style={{ borderTop: `1px solid ${BORDER_DARK}` }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: TEAL_LIGHT }}>Legend</h4>
            {[
              { label: 'Free', fill: STATUS.free.fill },
              { label: 'Occupied', fill: STATUS.occupied.fill },
              { label: 'Bill printed', fill: STATUS.unsettled.fill, border: STATUS.unsettled.border },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2 mb-1.5">
                <span className="w-3.5 h-3.5 rounded shrink-0" style={{ background: l.fill, border: l.border ? `2px solid ${l.border}` : 'none' }} />
                <span className="text-xs" style={{ color: MUTED_DARK }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-mono font-bold text-white">{value}</span>
      <span className="text-xs leading-tight" style={{ color: MUTED_DARK }}>{label}</span>
    </div>
  );
}