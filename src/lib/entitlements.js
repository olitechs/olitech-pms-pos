// Centralized package → feature entitlement matrix.
//
// This is the ONE place feature access is defined. Do not hide buttons
// conditionally throughout the app based on ad-hoc checks — import
// `hasFeature` / use the `<FeatureGate>` component instead, everywhere.
//
// NOTE ON ENFORCEMENT: this file governs what the UI *shows*. For data
// that must actually be withheld (not just hidden), the corresponding
// Postgres RLS policy on that table should also check the property's
// package (see supabase/migrations) — a client-side check alone can
// always be bypassed by someone calling the API directly, which is
// exactly what the spec warns against.

export const PACKAGES = ['standard', 'premium', 'professional'];

export const PACKAGE_LABELS = {
	none: 'No Package',
	standard: 'Standard',
	premium: 'Premium',
	professional: 'Professional',
};

// Every feature key used anywhere in the app must be listed here for all
// three packages. Add new modules here first, then gate the route/UI.
const MATRIX = {
	standard: {
		// PMS
		dashboard: true,
		property_setup_basic: true,
		rooms_basic: true,
		room_types_basic: true,
		guests: true,
		reservations_basic: true,
		check_in_out: true,
		folio_basic: true,
		payments_basic: true,
		housekeeping_basic: true,
		reports_basic: true,
		// POS
		pos_products_basic: true,
		pos_categories: true,
		pos_orders_basic: true,
		pos_receipt_printing: true,
		pos_payments_basic: true,
		// Advanced (locked on Standard)
		advanced_reports: false,
		revenue_analytics: false,
		inventory: false,
		multi_outlet_pos: false,
		advanced_housekeeping: false,
		maintenance: false,
		financial_reports: false,
		staff_management: false,
		advanced_user_permissions: false,
		room_charges: false,
		kitchen_printers: false,
		cashier_shifts: false,
		audit_log_view: false,
	},
	premium: {
		dashboard: true,
		property_setup_basic: true,
		rooms_basic: true,
		room_types_basic: true,
		guests: true,
		reservations_basic: true,
		check_in_out: true,
		folio_basic: true,
		payments_basic: true,
		housekeeping_basic: true,
		reports_basic: true,
		pos_products_basic: true,
		pos_categories: true,
		pos_orders_basic: true,
		pos_receipt_printing: true,
		pos_payments_basic: true,
		advanced_reports: true,
		revenue_analytics: true,
		inventory: true,
		multi_outlet_pos: true,
		advanced_housekeeping: true,
		maintenance: true,
		financial_reports: true,
		staff_management: true,
		room_charges: true,
		kitchen_printers: true,
		cashier_shifts: true,
		// Reserved for Professional
		advanced_user_permissions: false,
		audit_log_view: false,
	},
	professional: {
		// Everything on. Professional = complete feature set; new features
		// should default to `true` here and be explicitly restricted on
		// standard/premium above, not the other way round.
		dashboard: true,
		property_setup_basic: true,
		rooms_basic: true,
		room_types_basic: true,
		guests: true,
		reservations_basic: true,
		check_in_out: true,
		folio_basic: true,
		payments_basic: true,
		housekeeping_basic: true,
		reports_basic: true,
		pos_products_basic: true,
		pos_categories: true,
		pos_orders_basic: true,
		pos_receipt_printing: true,
		pos_payments_basic: true,
		advanced_reports: true,
		revenue_analytics: true,
		inventory: true,
		multi_outlet_pos: true,
		advanced_housekeeping: true,
		maintenance: true,
		financial_reports: true,
		staff_management: true,
		advanced_user_permissions: true,
		room_charges: true,
		kitchen_printers: true,
		cashier_shifts: true,
		audit_log_view: true,
	},
};

/**
 * @param {'none'|'standard'|'premium'|'professional'} pkg
 * @param {string} feature
 */
export function hasFeature(pkg, feature) {
	if (!pkg || pkg === 'none') return false;
	const packageMatrix = MATRIX[pkg];
	if (!packageMatrix) return false;
	return Boolean(packageMatrix[feature]);
}

/** Returns the list of feature keys enabled for a package, for display (e.g. comparison page). */
export function featuresFor(pkg) {
	const packageMatrix = MATRIX[pkg] || {};
	return Object.entries(packageMatrix)
		.filter(([, enabled]) => enabled)
		.map(([key]) => key);
}

export function featureMatrix() {
	return MATRIX;
}
