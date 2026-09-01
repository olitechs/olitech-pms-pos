// Global OliTechs "Yellow / Black Premium" palette.
// Room Planner uses src/data/palette.js and is intentionally kept unchanged.
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
export const ERR = '#EF6C00';

export const STATUS = {
  free: { fill: '#FFFFFF', border: BORDER, text: NAVY, dot: '#757B81' },
  occupied: { fill: NAVY2, border: NAVY2, text: '#FFFFFF', dot: TEAL },
  unsettled: { fill: '#FFEE32', border: TEAL_DARK, text: NAVY, dot: ERR },
};

export { getTextColorForBg } from '@/utils/textContrast';
