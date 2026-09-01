import { Lock } from 'lucide-react';
import { hasFeature, PACKAGE_LABELS } from '@/lib/entitlements';
import { useAuth } from '@/lib/AuthContext';

// <FeatureGate feature="inventory"><InventoryPage /></FeatureGate>
//
// Shows the children only if the current user's property package includes
// `feature`. Otherwise shows a clear upgrade message instead of a broken
// page. Remember: this only controls what renders. The data itself must
// still be protected at the Supabase/RLS layer for anything sensitive —
// see the note at the top of src/lib/entitlements.js.
export default function FeatureGate({ feature, children, fallback }) {
	const { user } = useAuth();
	const pkg = user?.property?.package || 'none';

	if (hasFeature(pkg, feature)) {
		return children;
	}

	if (fallback) return fallback;

	return (
		<div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-muted/30">
			<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
				<Lock className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
			</div>
			<h3 className="text-lg font-semibold text-foreground">This feature is not included in your current package</h3>
			<p className="text-sm text-muted-foreground mt-1">
				Your current package: <span className="font-medium">{PACKAGE_LABELS[pkg] || 'None'}</span>
			</p>
			<p className="text-sm text-muted-foreground mt-1">Upgrade your package to access this feature.</p>
		</div>
	);
}
