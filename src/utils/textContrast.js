const YELLOW_BGS = ['#FFD300', '#FFD100', '#FFEE32', '#F9A825'];
const DARK_BGS = ['#090C11', '#262B32', '#202020', '#333533'];

function normalizeHex(hex) {
  return String(hex || '').trim().toUpperCase();
}

/**
 * Returns the required foreground color for the OliTechs premium palette.
 * Yellow surfaces always use dark text; dark surfaces always use white text.
 */
export function getTextColorForBg(hex) {
  const normalized = normalizeHex(hex);
  if (YELLOW_BGS.includes(normalized)) return '#090C11';
  if (DARK_BGS.includes(normalized)) return '#FFFFFF';
  return '#090C11';
}

export { YELLOW_BGS, DARK_BGS };
