import React from 'react';
import { Sparkles } from 'lucide-react';
import { usePms } from '@/data/PmsStore';
import { NAVY, TEAL, SAND, SURFACE, SURFACE2, BORDER, MUTED } from '@/data/themePalette';

const COLUMNS = [
	{ status: 'dirty', label: 'Dirty', fill: '#B08968' },
	{ status: 'cleaning', label: 'Cleaning', fill: '#D9A441' },
	{ status: 'available', label: 'Clean / Available', fill: TEAL },
	{ status: 'maintenance', label: 'Maintenance', fill: '#757B81' },
];

export default function Housekeeping() {
	const pms = usePms();

	const advance = (roomId, next) => pms.setRoomStatus(roomId, next);

	return (
		<div className="flex-1 overflow-y-auto p-4" style={{ background: SAND }}>
			<div className="flex items-center gap-2 mb-4">
				<Sparkles size={16} style={{ color: NAVY }} />
				<h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: MUTED }}>Housekeeping Board</h2>
			</div>

			<div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
				{COLUMNS.map((col) => {
					const roomsInCol = pms.rooms.filter((r) => r.status === col.status);
					return (
						<div key={col.status} className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
							<div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}`, background: SURFACE2 }}>
								<span className="w-2.5 h-2.5 rounded-full" style={{ background: col.fill }} />
								<span className="text-xs font-bold uppercase tracking-wide" style={{ color: NAVY }}>{col.label}</span>
								<span className="ml-auto text-xs font-mono" style={{ color: MUTED }}>{roomsInCol.length}</span>
							</div>
							<div className="p-3 space-y-2 min-h-[80px]">
								{roomsInCol.length === 0 && <div className="text-xs text-center py-4" style={{ color: MUTED }}>Nothing here.</div>}
								{roomsInCol.map((r) => (
									<div key={r.id} className="rounded-xl p-3" style={{ background: SURFACE2, border: `1px solid ${BORDER}` }}>
										<div className="flex items-center justify-between">
											<span className="font-mono font-bold text-sm" style={{ color: NAVY }}>Room {r.number}</span>
											<span className="text-xs" style={{ color: MUTED }}>Floor {r.floor}</span>
										</div>
										<div className="flex gap-1.5 mt-2">
											{col.status === 'dirty' && (
												<button onClick={() => advance(r.id, 'cleaning')} className="flex-1 text-xs font-bold py-1.5 rounded-lg" style={{ background: NAVY, color: SAND }}>
													Start Cleaning
												</button>
											)}
											{col.status === 'cleaning' && (
												<button onClick={() => advance(r.id, 'available')} className="flex-1 text-xs font-bold py-1.5 rounded-lg" style={{ background: TEAL, color: '#090C11' }}>
													Mark Clean
												</button>
											)}
											{col.status === 'maintenance' && (
												<button onClick={() => advance(r.id, 'available')} className="flex-1 text-xs font-bold py-1.5 rounded-lg" style={{ background: TEAL, color: '#090C11' }}>
													Return to Service
												</button>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
