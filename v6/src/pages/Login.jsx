import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Hotel, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/ui/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
	const { login } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await login(email, password);
		} catch (err) {
			setError(err.message || "Failed to sign in");
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthLayout
			icon={Hotel}
			title="Welcome back"
			subtitle="Sign in to OliTechs PMS & POS"
			footer={
				<>
					Don't have an account?{" "}
					<Link to="/register" className="text-primary font-medium hover:underline">
						Create one
					</Link>
				</>
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
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="password">Password</Label>
						<Link to="/forgot-password" className="text-xs text-primary hover:underline">
							Forgot password?
						</Link>
					</div>
					<div className="relative">
						<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
						<Input
							id="password"
							type="password"
							autoComplete="current-password"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="pl-10 h-12"
							required
						/>
					</div>
				</div>
				<Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
					{loading ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Signing in...
						</>
					) : (
						"Sign in"
					)}
				</Button>
			</form>
		</AuthLayout>
	);
}
