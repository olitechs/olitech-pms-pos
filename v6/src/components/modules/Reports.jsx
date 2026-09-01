import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DASHBOARD_STATS } from '@/data/platformData';
import { NAVY, TEAL_DARK, BORDER, SAND, SURFACE, MUTED } from '@/data/themePalette';

const hourlyData = [
  { hour: '12h', rev: 8200 }, { hour: '13h', rev: 14500 }, { hour: '14h', rev: 11200 },
  { hour: '15h', rev: 6800 }, { hour: '16h', rev: 5400 }, { hour: '17h', rev: 9100 },
  { hour: '18h', rev: 18700 }, { hour: '19h', rev: 31400 }, { hour: '20h', rev: 38900 },
  { hour: '21h', rev: 28400 }, { hour: '22h', rev: 12050 },
];

export default function Reports() {
  return (
    <div className="flex-1 overflow-y-auto p-4" style={{ background: SAND }}>
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        {[
          { label: 'Total Revenue', value: `KES ${DASHBOARD_STATS.revenueToday.toLocaleString()}` },
          { label: 'Transactions', value: '47' },
          { label: 'Avg. Check', value: `KES ${DASHBOARD_STATS.avgCheck.toLocaleString()}` },
          { label: 'Covers Served', value: DASHBOARD_STATS.coversSeated },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>{s.label}</div>
            <div className="text-xl font-mono font-bold" style={{ color: NAVY }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>Revenue by Hour — Today</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={hourlyData} barSize={24}>
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => [`KES ${v.toLocaleString()}`, 'Revenue']} contentStyle={{ background: NAVY, border: 'none', borderRadius: '8px', color: SAND, fontSize: '12px' }} />
            <Bar dataKey="rev" radius={[6, 6, 0, 0]}>
              {hourlyData.map((d, i) => (
                <Cell key={i} fill={d.rev === Math.max(...hourlyData.map((x) => x.rev)) ? TEAL_DARK : BORDER} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#EFE7D2', borderBottom: `1px solid ${BORDER}` }}>
              {['Payment Method', 'Transactions', 'Amount', 'Share'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DASHBOARD_STATS.paymentBreakdown.map((p, i) => {
              const total = DASHBOARD_STATS.paymentBreakdown.reduce((a, b) => a + b.amount, 0);
              const pct = Math.round((p.amount / total) * 100);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{p.method}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: MUTED }}>—</td>
                  <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color: NAVY }}>KES {p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: BORDER }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: TEAL_DARK }} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: MUTED }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}