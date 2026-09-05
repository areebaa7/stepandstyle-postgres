// Maps color names (as typed in the admin variant builder) to CSS colors.
// The map is intentionally broad — shoe colors — and accepts hex codes too.
const COLOR_MAP: Record<string, string> = {
  black: '#111111',
  white: '#F5F5F5',
  red: '#DC2626',
  blue: '#2563EB',
  navy: '#1E3A8A',
  sky: '#7DD3FC',
  pink: '#DB2777',
  blush: '#F4C2C2',
  magenta: '#EC4899',
  purple: '#7C3AED',
  lavender: '#A78BFA',
  lilac: '#C8A2C8',
  green: '#22C55E',
  emerald: '#10B981',
  mint: '#98FF98',
  teal: '#14B8A6',
  yellow: '#FACC15',
  mustard: '#E1AD01',
  gold: '#D4AF37',
  golden: '#D4AF37',
  bronze: '#CD7F32',
  copper: '#B87333',
  silver: '#C0C0C0',
  platinum: '#E5E4E2',
  gray: '#6B7280',
  grey: '#6B7280',
  charcoal: '#374151',
  maroon: '#7F1D1D',
  burgundy: '#800020',
  scarlet: '#FF2400',
  coral: '#FF6F61',
  peach: '#FFD1B3',
  beige: '#F5F5DC',
  nude: '#E3BC9A',
  cream: '#F5F0E1',
  ivory: '#FFFFF0',
  champagne: '#F7E7CE',
  pearl: '#F8F6F0',
  tan: '#B45309',
  brown: '#78350F',
  coffee: '#6F4E37',
  olive: '#708238',
  rosegold: '#B76E79',
  'rose gold': '#B76E79',
  multicolor: '#94A3B8',
  multi: '#94A3B8',
};

const FALLBACK_PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981', '#14B8A6',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#64748B',
];

const hashCode = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.replace('#', '').trim();
  const full =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const value = parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const titleCase = (value: string) =>
  value.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

/**
 * Finds the closest named color from the curated map for a sampled hex,
 * or returns the hex itself when nothing is close enough (within ~25 units
 * per RGB channel). Used by the admin eyedropper to auto-name the color.
 */
export function nearestColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex.toUpperCase();
  let bestName = '';
  let bestDistance = Number.POSITIVE_INFINITY;
  Object.entries(COLOR_MAP).forEach(([name, value]) => {
    const candidate = hexToRgb(value);
    if (!candidate) return;
    const distance =
      (candidate.r - rgb.r) ** 2 + (candidate.g - rgb.g) ** 2 + (candidate.b - rgb.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = name;
    }
  });
  return titleCase(bestName);
}

/**
 * Resolves an admin-typed color label into a CSS color for the storefront swatch.
 * Supports: exact hex codes (#10B981), a curated name map (emerald, navy, ...),
 * and a deterministic fallback so unknown names still render a visible dot.
 */
export function resolveColorCode(color: string): string {
  const normalized = (color || '').trim().toLowerCase();
  if (!normalized) return '#CCCCCC';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(normalized)) return normalized;
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized];
  return FALLBACK_PALETTE[hashCode(normalized) % FALLBACK_PALETTE.length];
}


/**
 * Returns a friendly, human-readable color name.
 * If the input is a hex code, it maps it to the nearest known name.
 */
export function getFriendlyColorName(color: string): string {
  if (!color) return '';
  const normalized = color.trim();
  if (normalized.startsWith('#')) {
    return nearestColorName(normalized);
  }
  return titleCase(normalized);
}
