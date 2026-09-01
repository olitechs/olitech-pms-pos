// Platform-owner operations: property review/approval, package assignment,
// dashboard stats, audit log. Every write here is also re-checked by
// Postgres RLS (see supabase/migrations/0001_platform_admin.sql) — a
// non-owner calling these functions directly will simply have their
// request rejected by the database, not just blocked by this file.

import { supabase } from '@/lib/supabaseClient';

async function logAudit({ action, propertyId, oldValue, newValue }) {
	const { data: authData } = await supabase.auth.getUser();
	const actorId = authData?.user?.id;
	if (!actorId) return;
	await supabase.from('audit_logs').insert({
		actor_id: actorId,
		action,
		property_id: propertyId || null,
		old_value: oldValue ?? null,
		new_value: newValue ?? null,
	});
}

export const platformService = {
	async listProperties() {
		const { data, error } = await supabase.rpc('admin_list_properties');
		if (error) throw new Error(error.message);
		return data || [];
	},

	async getProperty(id) {
		const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
		if (error) throw new Error(error.message);
		return data;
	},

	async getPropertyUsers(propertyId) {
		const { data, error } = await supabase.rpc('admin_property_users', { p_property_id: propertyId });
		if (error) throw new Error(error.message);
		return data || [];
	},

	async setStatus(propertyId, status, previousStatus) {
		const { error } = await supabase.from('properties').update({ status }).eq('id', propertyId);
		if (error) throw new Error(error.message);
		await logAudit({
			action: `property_status_changed`,
			propertyId,
			oldValue: { status: previousStatus },
			newValue: { status },
		});
	},

	async setPackage(propertyId, pkg, previousPackage) {
		const { error } = await supabase.from('properties').update({ package: pkg }).eq('id', propertyId);
		if (error) throw new Error(error.message);
		await logAudit({
			action: `property_package_changed`,
			propertyId,
			oldValue: { package: previousPackage },
			newValue: { package: pkg },
		});
	},

	async approve(propertyId, pkg) {
		const { error } = await supabase.rpc('approve_property', {
			p_property_id: propertyId,
			p_package: pkg,
		});
		if (error) throw new Error(error.message);
	},

	async listAuditLog(propertyId) {
		const { data, error } = await supabase.rpc('admin_audit_log', { p_property_id: propertyId || null });
		if (error) throw new Error(error.message);
		return data || [];
	},

	// Build dashboard figures from the same admin_list_properties RPC that
	// powers the working Properties screen. This keeps the dashboard from
	// failing when PostgREST has not exposed the optional aggregate RPC in
	// its schema cache.
	buildDashboardStats(properties = []) {
		const rows = Array.isArray(properties) ? properties : [];
		const uniqueOwners = new Set(rows.map((p) => p.owner_email).filter(Boolean));
		return {
			totalProperties: rows.length,
			pendingProperties: rows.filter((p) => p.status === 'pending').length,
			activeProperties: rows.filter((p) => p.status === 'active').length,
			suspendedProperties: rows.filter((p) => p.status === 'suspended').length,
			activeUsers: uniqueOwners.size,
			activePackages: {
				standard: rows.filter((p) => p.status === 'active' && p.package === 'standard').length,
				premium: rows.filter((p) => p.status === 'active' && p.package === 'premium').length,
				professional: rows.filter((p) => p.status === 'active' && p.package === 'professional').length,
				none: rows.filter((p) => p.package === 'none').length,
			},
		};
	},

	// Kept for compatibility with older callers. The dashboard itself no
	// longer depends on this aggregate RPC.
	async getDashboardStats() {
		const properties = await this.listProperties();
		return this.buildDashboardStats(properties);
	},

};
