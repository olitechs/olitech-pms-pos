import { useEffect, useState } from 'react';
import { platformService } from '@/services/platformService';

export default function AdminAuditLog() {
	const [entries, setEntries] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		platformService
			.listAuditLog()
			.then(setEntries)
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
				<p className="text-sm text-muted-foreground mt-1">Platform-wide, append-only record of admin actions.</p>
			</div>

			{error && <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

			<div className="bg-card border border-border rounded-2xl divide-y divide-border">
				{loading && <div className="px-4 py-6 text-center text-muted-foreground text-sm">Loading...</div>}
				{!loading && entries.length === 0 && <div className="px-4 py-6 text-center text-muted-foreground text-sm">No activity recorded yet.</div>}
				{entries.map((entry) => (
					<div key={entry.id} className="px-4 py-3 text-sm flex justify-between">
						<div>
							<span className="font-medium text-foreground capitalize">{entry.action.replace(/_/g, ' ')}</span>
							<span className="text-muted-foreground"> by {entry.actor?.full_name || entry.actor?.email || 'system'}</span>
						</div>
						<span className="text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
					</div>
				))}
			</div>
		</div>
	);
}
