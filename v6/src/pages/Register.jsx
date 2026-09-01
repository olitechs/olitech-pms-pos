import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Hotel, Mail, Lock, User, Loader2 } from "lucide-react";
import AuthLayout from "@/components/ui/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";

export default function Register() {
	const { register } = useAuth();
	const [name, setName] = useState("");
	const [businessName, setBusinessName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [confirmationEmail, setConfirmationEmail] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (loading) return; // guard against double submission
		setError("");
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		if (password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}
		setLoading(true);
		try {
			const result = await register({ name, email, password, businessName });
			if (result?.needsEmailConfirmation) {
				setConfirmationEmail(result.email || email);
			}
		} catch (err) {
			// Never surface raw backend/database errors (e.g. Postgres RLS
			// messages) to the end user — log them for diagnosis instead.
			// eslint-disable-next-line no-console
			console.error('[Register] registration failed:', err);
			setError(err.message || "Failed to create account. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (confirmationEmail) {
		return (
			<AuthLayout
				icon={Mail}
				title="Check your email"
				subtitle={`We sent a confirmation link to ${confirmationEmail}.`}
				footer={
					<>
						Already confirmed?{" "}
						<Link to="/login" className="text-primary font-medium hover:underline">
							Sign in
						</Link>
					</>
				}
			>
				<p className="text-sm text-muted-foreground text-center">
					Click the link in that email to verify your address, then sign in. Your
					property application has already been submitted and will show as pending
					until the OliTechs administrator reviews it.
				</p>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			icon={Hotel}
			title="Create your account"
			subtitle="Set up OliTechs PMS & POS for your property"
			footer={
				<>
					Already have an account?{" "}
					<Link to="/login" className="text-primary font-medium hover:underline">
						Sign in
					</Link>
				</>
			}
		>
			{error && (
				<div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
			)}
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="name">Full name</Label>
					<div className="relative">
						<User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
						<Input
							id="name"
							type="text"
							autoComplete="name"
							autoFocus
							placeholder="Jane Doe"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="pl-10 h-12"
							required
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="businessName">Property / business name</Label>
					<div className="relative">
						<Hotel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
						<Input
							id="businessName"
							type="text"
							autoComplete="organization"
							placeholder="Watamu Bay Resort"
							value={businessName}
							onChange={(e) => setBusinessName(e.target.value)}
							className="pl-10 h-12"
							required
						/>
					</div>
					<p className="text-xs text-muted-foreground">
						Your property application will be reviewed by the OliTechs administrator before your PMS/POS is activated.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<div className="relative">
						<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
						<Input
							id="email"
							type="email"
							autoComplete="email"
							placeholder="you@hotel.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="pl-10 h-12"
							required
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="password">Password</Label>
					<div className="relative">
						<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
						<Input
							id="password"
							type="password"
							autoComplete="new-password"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="pl-10 h-12"
							required
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="confirm">Confirm password</Label>
					<div className="relative">
						<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
						<Input
							id="confirm"
							type="password"
							autoComplete="new-password"
							placeholder="••••••••"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="pl-10 h-12"
							required
						/>
					</div>
				</div>
				<Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
					{loading ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Creating account...
						</>
					) : (
						"Create account"
					)}
				</Button>
			</form>
		</AuthLayout>
	);
}
