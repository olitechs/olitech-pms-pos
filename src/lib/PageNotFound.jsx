import React from 'react';
import { Link } from 'react-router-dom';
import { Hotel } from 'lucide-react';

export default function PageNotFound() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 px-4">
			<div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100 text-center">
				<div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-slate-100">
					<Hotel className="w-8 h-8 text-slate-500" aria-hidden="true" />
				</div>
				<h1 className="text-3xl font-bold text-slate-900 mb-2">Page not found</h1>
				<p className="text-slate-600 mb-8">
					The page you're looking for doesn't exist or may have moved.
				</p>
				<Link
					to="/"
					className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#090C11] text-white text-sm font-medium hover:bg-[#262B32] transition-colors"
				>
					Back to dashboard
				</Link>
			</div>
		</div>
	);
}
