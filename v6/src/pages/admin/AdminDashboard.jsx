import { useEffect, useState } from 'react';
import { Building2, Clock, CheckCircle2, ShieldAlert, Users, Package, ArrowRight, RefreshCw } from 'lucide-react';
import { platformService } from '@/services/platformService';
import { PACKAGE_LABELS } from '@/lib/entitlements';

function StatCard({ icon: Icon, label, value }) {
	return (
		<div className="bg-card border border-border rounded-2xl p-5">
			<div className="flex items-center justify-between">
				<span className="text-sm text-muted-foreground">{label}</span>
				<Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
			</div>
			<div className="text-3xl font-bold text-foreground mt-2">{value}</div>
		</div>
	);
}

export default function AdminDashboard() {
	const [stats, setStats] = useState(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);
	const [properties, setProperties] = useState([]);
	const [refreshing, setRefreshing] = useState(false);

	const load = async (initial = false) => {
		if (initial) setLoading(true);
		else setRefreshing(true);
		setError('');
		try {
			const allProperties = await platformService.listProperties();
			const dashboard = platformService.buildDashboardStats(allProperties);
			setStats(dashboard);
			setProperties(allProperties);
		} catch (err) {
			setError(err.message || 'Unable to load admin data.');
		} finally {
			if (initial) setLoading(false);
			else setRefreshing(false);
		}
	};

	useEffect(() => {
		load(true);
	}, []);

	if (loading) {
		return <div className="text-muted-foreground text-sm">Loading platform stats...</div>;
	}

	const pending = properties.filter((property) => property.status === 'pending');

	if (error) {
		return <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>;
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
				<p className="text-sm text-muted-foreground mt-1">Live figures across every OliTechs property.</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<StatCard icon={Building2} label="Total Properties" value={stats.totalProperties} />
				<StatCard icon={Clock} label="Pending Properties" value={stats.pendingProperties} />
				<StatCard icon={CheckCircle2} label="Active Properties" value={stats.activeProperties} />
				<StatCard icon={ShieldAlert} label="Suspended Properties" value={stats.suspendedProperties} />
				<StatCard icon={Users} label="Registered Users" value={stats.activeUsers} />
			</div>

			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold text-foreground">Pending Applications</h2>
					<p className="text-sm text-muted-foreground mt-1">These properties are waiting for your approval and package assignment.</p>
				</div>
				<button type="button" onClick={() => load(false)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
					<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
				</button>
			</div>

			<div className="bg-card border border-border rounded-2xl overflow-hidden">
				{pending.length === 0 ? (
					<div className="p-6 text-sm text-muted-foreground">No pending applications. New property registrations appear here as soon as the owner completes registration. Review the application and assign a package to activate it.</div>
				) : (
					<div className="divide-y divide-border">
						{pending.map((property) => (
							<div key={property.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<div className="font-semibold text-foreground">{property.name}</div>
									<div className="text-sm text-muted-foreground">{property.business_name || 'Property application'}{property.owner_email ? ` · ${property.owner_email}` : ''}</div>
									<div className="mt-1 text-xs text-muted-foreground">Submitted {new Date(property.created_at).toLocaleString()}</div>
								</div>
								<a href={`/admin/properties/${property.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
									Review & Approve <ArrowRight className="h-4 w-4" />
								</a>
							</div>
						))}
					</div>
				)}
			</div>

			<div>
				<h2 className="text-lg font-semibold text-foreground mb-3">Active Packages</h2>
				<div className="grid grid-cols-3 gap-4">
					{['standard', 'premium', 'professional'].map((pkg) => (
						<StatCard key={pkg} icon={Package} label={PACKAGE_LABELS[pkg]} value={stats.activePackages[pkg] || 0} />
					))}
				</div>
			</div>

		</div>
	);
}
