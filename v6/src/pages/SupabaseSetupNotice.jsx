import { DatabaseZap } from 'lucide-react';

export default function SupabaseSetupNotice() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="w-full max-w-lg">
				<div className="bg-card rounded-2xl shadow-sm border border-border p-8 text-center">
					<div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
						<DatabaseZap className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
					</div>
					<h1 className="text-xl font-bold text-foreground">Supabase isn't configured yet</h1>
					<p className="text-sm text-muted-foreground mt-2">
						This app needs a Supabase project to sign in or load any data. Nothing is broken —
						the environment variables just aren't set for this environment yet.
					</p>
					<div className="mt-6 text-left bg-muted/40 rounded-xl p-4 text-sm space-y-2">
						<p className="font-medium text-foreground">To fix this:</p>
						<ol className="list-decimal list-inside space-y-1 text-muted-foreground">
							<li>
								Copy <code className="px-1 py-0.5 rounded bg-muted text-foreground">.env.example</code> to{' '}
								<code className="px-1 py-0.5 rounded bg-muted text-foreground">.env</code>
							</li>
							<li>Fill in your Supabase project's URL and anon key (Project Settings → API)</li>
							<li>
								Run the migrations in <code className="px-1 py-0.5 rounded bg-muted text-foreground">supabase/migrations/</code>{' '}
								in order, in the Supabase SQL editor
							</li>
							<li>Restart the dev server</li>
						</ol>
					</div>
					<p className="text-xs text-muted-foreground mt-4">
						See <code className="px-1 py-0.5 rounded bg-muted">supabase/migrations/README.md</code> for full setup steps, including creating the platform owner.
					</p>
				</div>
			</div>
		</div>
	);
}
