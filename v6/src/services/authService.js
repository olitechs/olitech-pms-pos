// Platform authentication service — Supabase-backed.
//
// This replaces the previous localStorage-only implementation. The public
// interface (getCurrentUser/register/login/logout/requestPasswordReset/
// resetPassword) is kept identical on purpose so AuthContext.jsx and every
// page that calls it (Login, Register, ForgotPassword, ResetPassword)
// needed no changes.
//
// Real security now lives server-side: Supabase Auth verifies passwords
// and issues sessions; Postgres RLS (see supabase/migrations) decides what
// each authenticated user can read/write. This file is just a thin,
// UI-friendly wrapper around that.

import { supabase } from '@/lib/supabaseClient';

function toAppUser({ profile, property, propertyRole }) {
	if (!profile) return null;
	return {
		id: profile.id,
		name: profile.full_name || profile.email,
		email: profile.email,
		// Kept for backward compatibility with existing UI that reads
		// `user.role` as a simple display label.
		role: profile.platform_role === 'platform_owner' ? 'Platform Owner' : propertyRole === 'owner' ? 'Administrator' : 'Staff',
		platformRole: profile.platform_role,
		isPlatformOwner: profile.platform_role === 'platform_owner',
		property: property || null,
		propertyRole: propertyRole || null,
	};
}

// Property applications are created server-side by the auth trigger.
// The authenticated safety-net below also repairs older accounts and makes
// the registration flow idempotent without weakening RLS.

async function loadCurrentUserDetails() {
	const { data: authData } = await supabase.auth.getUser();
	const authUser = authData?.user;
	if (!authUser) return null;

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', authUser.id)
		.single();
	if (profileError || !profile) return null;

	// Platform owners aren't necessarily tied to a property.
	if (profile.platform_role === 'platform_owner') {
		return toAppUser({ profile, property: null, propertyRole: null });
	}

	// Ensure every regular signed-in registrant has a real property application.
	// This is an idempotent safety net for older accounts and deployments where
	// the signup trigger was not installed when the account was created.
	const { error: ensureError } = await supabase.rpc('ensure_my_pending_property', {
		p_business_name: authUser.user_metadata?.pending_business_name || null,
	});
	if (ensureError) {
		console.error('[authService] ensure_my_pending_property failed:', ensureError.message);
	}
	// A regular user's primary property — a person can technically belong
	// to more than one property later, but the login/onboarding flow only
	// needs "their" property today.
	const { data: membership } = await supabase
		.from('property_users')
		.select('role, property:properties(*)')
		.eq('user_id', authUser.id)
		.limit(1)
		.maybeSingle();

	return toAppUser({
		profile,
		property: membership?.property || null,
		propertyRole: membership?.role || null,
	});
}

export const authService = {
	async getCurrentUser() {
		try {
			return await loadCurrentUserDetails();
		} catch {
			return null;
		}
	},

	// Registers a NEW property application, per spec section 19-20:
	// account is created, a property is created in `pending` / `none`
	// package status, and the caller is added as that property's `owner`.
	// This does NOT grant PMS/POS access — the onboarding screen handles
	// showing the pending state until the platform owner approves.
	//
	// Returns either:
	//   { needsEmailConfirmation: true }              — no session yet;
	//     the property application has already been created server-side; the owner
	//     simply confirms their email and signs in to see its pending status.
	//   the app user object                            — session existed
	//     immediately (confirmation disabled/auto-confirmed project), so
	//     the property was created right away, same as before.
	async register({ name, email, password, businessName }) {
		if (!name || !email || !password) {
			throw new Error('Name, email and password are required.');
		}
		const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
			email: email.trim().toLowerCase(),
			password,
			options: {
				data: {
					full_name: name,
					// These metadata fields are consumed by the server-side auth trigger
					// so the pending application exists even when email confirmation
					// means this signUp call returns without a session.
					pending_owner_signup: true,
					pending_business_name: businessName || null,
				},
			},
		});
		if (signUpError) throw new Error(signUpError.message);

		const authUser = signUpData?.user;
		if (!authUser) {
			throw new Error('Could not create your account. Please try again.');
		}

		if (!signUpData.session) {
			// Email confirmation is required before a session exists. The
			// server-side auth trigger has already created the pending property,
			// so there is nothing to insert from this anonymous browser request.
			return { needsEmailConfirmation: true, email: authUser.email };
		}

		// We already have a session (confirmation is off, or this Supabase
		// project auto-confirms new users). The trigger should already have created
		// the application; this idempotent safety-net repairs partially deployed
		// databases without weakening RLS.
		const { error: ensureError } = await supabase.rpc('ensure_my_pending_property', {
			p_business_name: businessName || null,
		});
		if (ensureError) {
			console.error('[authService] ensure_my_pending_property failed:', ensureError.message);
			throw new Error(
				"Your account was created, but the property application could not be completed. Apply migration 0011_fix_property_registration_rls.sql in Supabase, then sign in again."
			);
		}

		return loadCurrentUserDetails();
	},

	async login({ email, password }) {
		if (!email || !password) {
			throw new Error('Email and password are required.');
		}
		const { error } = await supabase.auth.signInWithPassword({
			email: email.trim().toLowerCase(),
			password,
		});
		if (error) throw new Error(error.message);
		return loadCurrentUserDetails();
	},

	async logout() {
		await supabase.auth.signOut();
	},

	async requestPasswordReset({ email }) {
		const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
		await supabase.auth.resetPasswordForEmail((email || '').trim().toLowerCase(), { redirectTo });
		// Always resolve successfully — don't reveal whether the email exists.
		return { sent: true };
	},

	async resetPassword({ newPassword }) {
		if (!newPassword) throw new Error('New password is required.');
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) throw new Error(error.message);
		return { ok: true };
	},
};
