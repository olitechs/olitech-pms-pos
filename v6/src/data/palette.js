// OliTechs Grand Hotel — Yellow / Black premium palette.
//
// NOTE: this file was missing from the exported project (it shipped empty),
// so these are newly authored values matching the usage found across the
// existing components (colors like #E0A23C, #9A6616 and the
// rgba(110,138,134,...) muted-dark tone were already hard-coded in several
// files, so they're reused here as the canonical constants).

export const NAVY = '#090C11';
export const NAVY2 = '#262B32';
export const SLATE = '#757B81';

export const TEAL = '#FFD300';
export const TEAL_DARK = '#FFD100';
export const TEAL_LIGHT = '#FFEE32';

export const SAND = '#F8F8F7';
export const SURFACE = '#FFFFFF';
export const SURFACE2 = '#F2F2F2';

export const BORDER = '#E5E5E5';
export const BORDER_DARK = '#757B81';

export const MUTED = '#757B81';
export const MUTED_DARK = '#757B81';

export const DESTRUCTIVE = '#D32F2F';
// Warning / "needs attention" tone (bill printed, unsettled, low stock).
export const ERR = '#EF6C00';

// Floor-plan / table-tile status styling — keyed by session status.
export const STATUS = {
	free: { fill: '#FFFFFF', border: BORDER, text: NAVY, dot: '#757B81' },
	occupied: { fill: NAVY2, border: NAVY2, text: '#FFFFFF', dot: TEAL },
	unsettled: { fill: '#FFEE32', border: TEAL_DARK, text: NAVY, dot: TEAL_DARK },
};
