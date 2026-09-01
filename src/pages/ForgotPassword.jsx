import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/ui/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

export default function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	// Dev-only convenience: since there's no email server wired up yet, we
	// surface the generated reset link directly instead of silently
	// "sending" it nowhere. Remove once a real email/backend is connected.
	const [devResetLink, setDevResetLink] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const result = await authService.requestPasswordReset({ email });
			setSent(true);
			if (result.resetToken) {
				setDevResetLink(`${window.location.origin}/reset-password?token=${result.resetToken}`);
			}
		} catch (err) {
			setError(err.message || "Failed to send reset link");
		} finally {
			setLoading(false);
		}
	};

	if (sent) {
		return (
			<AuthLayout
				icon={CheckCircle2}
				title="Check your email"
				subtitle="If an account exists for that address, we've sent a reset link"
				footer={
					<Link to="/login" className="text-primary font-medium hover:underline">
						Back to sign in
					</Link>
				}
			>
				{devResetLink && (
					<div className="text-sm text-muted-foreground space-y-2">
						<p>No email server is connected yet, so here's your reset link directly:</p>
						<Link to={devResetLink.replace(window.location.origin, "")} className="block break-all text-primary hover:underline">
							{devResetLink}
						</Link>
					</div>
				)}
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			icon={Mail}
			title="Forgot password"
			subtitle="Enter your email and we'll send you a reset link"
			footer={
				<Link to="/login" className="text-primary font-medium hover:underline">
					Back to sign in
				</Link>
			}
		>
			{error && (
				<div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
			)}
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<div className="relative">
						<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
						<Input
							id="email"
							type="email"
							autoComplete="email"
							autoFocus
							placeholder="you@hotel.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="pl-10 h-12"
							required
						/>
					</div>
				</div>
				<Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
					{loading ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Sending...
						</>
					) : (
						"Send reset link"
					)}
				</Button>
			</form>
		</AuthLayout>
	);
}
