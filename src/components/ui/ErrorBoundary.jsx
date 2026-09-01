import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Generic error boundary. Used around peripheral/optional features (like
// printer management) so a bug there can't take down the whole PMS/POS —
// e.g. an unexpected WebUSB/Bluetooth exception must never blank the
// dashboard or freeze the till.
export class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		// eslint-disable-next-line no-console
		console.error('[ErrorBoundary]', this.props.label || '', error, info?.componentStack);
	}

	render() {
		if (this.state.error) {
			return (
				this.props.fallback || (
					<div className="p-6 flex items-center gap-3 text-sm rounded-xl m-4" style={{ background: '#FDECEA', color: '#C0392B' }}>
						<AlertTriangle size={18} className="shrink-0" />
						<div>
							<div className="font-semibold">{this.props.label || 'Something went wrong'} isn't available right now.</div>
							<div className="text-xs mt-0.5 opacity-80">The rest of the system is unaffected — try again shortly.</div>
						</div>
					</div>
				)
			);
		}
		return this.props.children;
	}
}
