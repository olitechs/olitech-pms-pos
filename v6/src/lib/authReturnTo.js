// Remembers which page the user was trying to reach before being sent to
// /login, so we can send them back there after a successful sign-in.
const KEY = 'olitechs_auth_return_to';

export function setReturnTo(path) {
	if (typeof window === 'undefined') return;
	if (!path || path.startsWith('/login') || path.startsWith('/register')) return;
	window.sessionStorage.setItem(KEY, path);
}

export function getReturnTo(fallback = '/') {
	if (typeof window === 'undefined') return fallback;
	return window.sessionStorage.getItem(KEY) || fallback;
}

export function clearReturnTo() {
	if (typeof window === 'undefined') return;
	window.sessionStorage.removeItem(KEY);
}
