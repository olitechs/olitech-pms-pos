import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
	// eslint-disable-next-line no-console
	console.error(
		'[supabaseClient] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
			'Copy .env.example to .env and fill in your Supabase project values.'
	);
}

// IMPORTANT: createClient() throws synchronously if the URL is empty/invalid
// ("supabaseUrl is required."). That throw happens at MODULE LOAD time —
// before React ever mounts — which crashes the whole bundle into a blank
// white page with nothing but a console error. So when the env vars are
// missing we deliberately pass a syntactically-valid placeholder URL
// instead of the real (missing) one: the client still constructs fine,
// every actual network call will just fail with a normal, catchable error
// that authService/platformService/pmsService already handle, and the app
// (via the <SupabaseSetupNotice> in App.jsx) can show a clear "not
// configured yet" screen instead of dying silently.
export const supabase = createClient(url || 'https://not-configured.supabase.co', anonKey || 'not-configured', {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
	},
});

