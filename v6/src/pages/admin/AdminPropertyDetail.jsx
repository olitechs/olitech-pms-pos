import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { platformService } from '@/services/platformService';
import { PACKAGE_LABELS } from '@/lib/entitlements';
import { Button } from '@/components/ui/button';
import PackageAssignmentModal from './PackageAssignmentModal';

export default function AdminPropertyDetail() {
	const { id } = useParams();
	const [property, setProperty] = useState(null);
	const [members, setMembers] = useState([]);
	const [auditLog, setAuditLog] = useState([]);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(true);
	const [packageDialog, setPackageDialog] = useState(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [prop, mem, log] = await Promise.all([
				platformService.getProperty(id),
				platformService.getPropertyUsers(id),
				platformService.listAuditLog(id),
			]);
			setProperty(prop);
			setMembers(mem);
			setAuditLog(log);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		load();
	}, [load]);

	const changePackage = () => setPackageDialog({ mode: 'change' });

	const approve = () => setPackageDialog({ mode: 'approve' });

	const confirmPackage = async (pkg) => {
		setBusy(true);
		setError('');
		try {
			if (packageDialog?.mode === 'approve') {
				await platformService.approve(property.id, pkg);
			} else {
				await platformService.setPackage(property.id, pkg, property.package);
			}
			setPackageDialog(null);
			await load();
		} catch (err) {
			setError(err.message);
		} finally {
			setBusy(false);
		}
	};

	const changeStatus = async (status) => {
		// eslint-disable-next-line no-alert
		if (!window.confirm(`Set status to ${status}?`)) return;
		await platformService.setStatus(property.id, status, property.status);
		load();
	};

	if (loading) return <div className="text-muted-foreground text-sm">Loading...</div>;
	if (error) return <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>;
	if (!property) return null;

	return (
		<div className="space-y-6">
			<Link to="/admin/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
				<ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to properties
			</Link>

			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">{property.name}</h1>
					<p className="text-sm text-muted-foreground mt-1 capitalize">
						{property.status} · {PACKAGE_LABELS[property.package]}
					</p>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					{property.status === 'pending' && (
						<Button size="sm" onClick={approve}>Approve & Assign Package</Button>
					)}
					{property.status === 'active' && (
						<>
							<Button size="sm" variant="outline" onClick={changePackage}>Change Package</Button>
							<Button size="sm" variant="outline" onClick={() => changeStatus('suspended')}>Suspend</Button>
						</>
					)}
					{(property.status === 'suspended' || property.status === 'inactive' || property.status === 'rejected') && (
						<Button size="sm" onClick={() => property.package !== 'none' ? changeStatus('active') : approve()}>
							{property.package !== 'none' ? 'Reactivate' : 'Approve & Assign Package'}
						</Button>
					)}
				</div>
			</div>

			<div className="grid md:grid-cols-2 gap-6">
				<div className="bg-card border border-border rounded-2xl p-5">
					<h2 className="font-semibold text-foreground mb-3">Property Information</h2>
					<dl className="text-sm space-y-2">
						{[
							['Business Name', property.business_name],
							['Property Type', property.property_type],
							['Address', property.address],
							['City', property.city],
							['Country', property.country],
							['Phone', property.phone],
							['Email', property.email],
							['Website', property.website],
							['Currency', property.currency],
							['Timezone', property.timezone],
							['Created', new Date(property.created_at).toLocaleString()],
						].map(([label, value]) => (
							<div key={label} className="flex justify-between gap-4">
								<dt className="text-muted-foreground">{label}</dt>
								<dd className="font-medium text-right">{value || '—'}</dd>
							</div>
						))}
					</dl>
				</div>

				<div className="bg-card border border-border rounded-2xl p-5">
					<h2 className="font-semibold text-foreground mb-3">Users ({members.length})</h2>
					<ul className="text-sm space-y-2">
						{members.map((m) => (
							<li key={m.id} className="flex justify-between">
								<span>{m.full_name || m.email}</span>
								<span className="text-muted-foreground capitalize">{m.role}</span>
							</li>
						))}
						{members.length === 0 && <li className="text-muted-foreground">No users yet.</li>}
					</ul>
				</div>
			</div>

			<div className="bg-card border border-border rounded-2xl p-5">
				<h2 className="font-semibold text-foreground mb-3">Recent Activity</h2>
				<ul className="text-sm space-y-2">
					{auditLog.map((entry) => (
						<li key={entry.id} className="flex justify-between text-muted-foreground">
							<span>
								<span className="text-foreground">{entry.action.replace(/_/g, ' ')}</span> by {entry.actor_full_name || entry.actor_email || 'system'}
							</span>
							<span>{new Date(entry.created_at).toLocaleString()}</span>
						</li>
					))}
					{auditLog.length === 0 && <li className="text-muted-foreground">No activity recorded yet.</li>}
				</ul>
			</div>

			{packageDialog && (
				<PackageAssignmentModal
					property={property}
					mode={packageDialog.mode}
					busy={busy}
					onClose={() => setPackageDialog(null)}
					onConfirm={confirmPackage}
				/>
			)}
		</div>
	);
}
