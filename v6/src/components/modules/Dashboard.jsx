import React from 'react';
import { TrendingUp, Users, Receipt, CalendarCheck, Utensils } from 'lucide-react';
import { DASHBOARD_STATS } from '@/data/platformData';
import { NAVY, TEAL, TEAL_DARK, SAND, SURFACE, BORDER, MUTED, SLATE } from '@/data/themePalette';

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
        {Icon && <Icon size={16} style={{ color: TEAL_DARK }} />}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color: NAVY }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: MUTED }}>{sub}</div>}
    </div>
  );
}

const ACTIVITY_COLORS = { order: NAVY, payment: TEAL_DARK, reserve: SLATE };

export default function Dashboard({ onNavigateToPOS }) {
  const s = DASHBOARD_STATS;
  const revenueFormatted = `KES ${s.revenueToday.toLocaleString('en-KE')}`;

  return (
    <div className="flex-1 overflow-y-auto p-4" style={{ background: SAND }}>
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Revenue Today" value={revenueFormatted} icon={TrendingUp} />
        <StatCard label="Open Tables" value={s.openTables} sub="tap to manage" icon={Utensils} />
        <StatCard label="Open Checks" value={s.openChecks} icon={Receipt} />
        <StatCard label="Covers Seated" value={s.coversSeated} icon={Users} />
        <StatCard label="Reservations" value={s.reservationsTonight} sub="tonight" icon={CalendarCheck} />
        <StatCard label="Avg. Check" value={`KES ${s.avgCheck.toLocaleString()}`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Top Sellers Today</h3>
          {s.topItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono w-4" style={{ color: MUTED }}>{i + 1}</span>
                <span className="text-sm font-medium truncate" style={{ color: NAVY, maxWidth: '160px' }}>{item.name}</span>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold" style={{ color: NAVY }}>×{item.qty}</div>
                <div className="text-xs" style={{ color: MUTED }}>{item.revenue.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Payments by Method</h3>
          {s.paymentBreakdown.map((p, i) => {
            const total = s.paymentBreakdown.reduce((a, b) => a + b.amount, 0);
            const pct = Math.round((p.amount / total) * 100);
            return (
              <div key={i} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium" style={{ color: NAVY }}>{p.method}</span>
                  <span style={{ color: MUTED }}>KES {p.amount.toLocaleString()} · {pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: BORDER }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: TEAL_DARK }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Recent Activity</h3>
          <div className="flex flex-col gap-0">
            {s.recentActivity.map((a, i) => (
              <div key={i} className="flex gap-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ACTIVITY_COLORS[a.type] || MUTED }} />
                <div className="min-w-0">
                  <div className="text-xs font-medium" style={{ color: NAVY }}>{a.action}</div>
                  <div className="text-xs truncate" style={{ color: MUTED }}>{a.detail}</div>
                </div>
                <div className="text-xs font-mono shrink-0 ml-auto" style={{ color: MUTED }}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button onClick={onNavigateToPOS} className="w-full py-4 rounded-2xl text-sm font-bold transition-all" style={{ background: TEAL, color: '#090C11', border: `1.5px solid ${BORDER}` }}>Open POS → Floor Plan</button>
      </div>
    </div>
  );
}