import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { ViewStyle } from 'react-native';

const fontConfig = { fontFamily: 'System' };

// ---------- Design tokens ----------

/**
 * Warm "sunset" palette: cream → peach → pink → deep rose.
 * The three hero gradient stops are `heroTop`, `heroMid`, `heroBottom`.
 */
export const palette = {
  brand:      '#F57799', // rose pink
  brandDeep:  '#E05780', // darker pink for shadow / accents
  brandDark:  '#B93E64', // deepest pink
  brandSoft:  '#FFE0EB', // soft pink tint
  brandTint:  '#FFF3F7', // very soft pink

  accent:     '#FDC3A1', // peach
  accentSoft: '#FFE8D6',

  cream:      '#FFF7CD',
  creamSoft:  '#FFFBEB',

  // Hero gradient stops (sunset)
  heroTop:    '#F57799',
  heroMid:    '#FDC3A1',
  heroBottom: '#FFF7CD',

  // Semantic status colors (kept vivid so they don't get lost in the warm scheme)
  mint:       '#10B981',
  mintSoft:   '#D1FAE5',
  sky:        '#0EA5E9',
  skySoft:    '#E0F2FE',
  amber:      '#F59E0B',
  amberSoft:  '#FEF3C7',
  rose:       '#DC2626', // "missed" red — deliberately different from brand pink
  roseSoft:   '#FEE2E2',

  ink:        '#3B0F22', // deep plum — reads warm against the palette
  inkMuted:   '#7C4257',
  inkSoft:    '#B08A98',

  outline:      '#F3D9E2',
  outlineSoft:  '#FBEDF1',

  surface:    '#FFFFFF',
  surfaceAlt: '#FFF7F2',
  background: '#FFFBEB', // warm cream canvas
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

export const radius = {
  xs: 6, sm: 10, md: 14, lg: 20, xl: 28, xxl: 36, pill: 999,
} as const;

/** Cross-platform shadow presets, with a warm-tinted brand shadow. */
export const shadow: Record<'xs' | 'sm' | 'md' | 'lg' | 'brand', ViewStyle> = {
  xs: {
    shadowColor: '#3B0F22',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#3B0F22',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#3B0F22',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#3B0F22',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  brand: {
    shadowColor: '#F57799',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
};

// ---------- Paper theme ----------

export const theme = {
  ...MD3LightTheme,
  roundness: 14,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary:              palette.brand,
    onPrimary:            '#FFFFFF',
    primaryContainer:     palette.brandSoft,
    onPrimaryContainer:   palette.brandDark,
    secondary:            palette.accent,
    onSecondary:          '#3B0F22',
    secondaryContainer:   palette.accentSoft,
    onSecondaryContainer: '#7C2D12',
    tertiary:             palette.mint,
    onTertiary:           '#FFFFFF',
    background:           palette.background,
    surface:              palette.surface,
    surfaceVariant:       palette.surfaceAlt,
    onSurface:            palette.ink,
    onSurfaceVariant:     palette.inkMuted,
    outline:              palette.outline,
    outlineVariant:       palette.outlineSoft,
    error:                palette.rose,
    onError:              '#FFFFFF',
    errorContainer:       palette.roseSoft,
    onErrorContainer:     '#7F1D1D',
    inverseSurface:       palette.ink,
    inverseOnSurface:     '#FFFBEB',
    inversePrimary:       palette.brandSoft,
  },
};

// ---------- Status palettes ----------

/** Reminder status: main color + soft background + label color triplet. */
export const statusPalette = {
  pending: { main: palette.sky,     soft: palette.skySoft,   label: '#0369A1' },
  snoozed: { main: palette.amber,   soft: palette.amberSoft, label: '#92400E' },
  taken:   { main: palette.mint,    soft: palette.mintSoft,  label: '#065F46' },
  skipped: { main: palette.inkSoft, soft: '#F5E9EE',         label: palette.inkMuted },
  missed:  { main: palette.rose,    soft: palette.roseSoft,  label: '#7F1D1D' },
} as const;

/** Back-compat: previous code imported statusColors as a string map. */
export const statusColors = {
  pending: statusPalette.pending.main,
  snoozed: statusPalette.snoozed.main,
  taken:   statusPalette.taken.main,
  skipped: statusPalette.skipped.main,
  missed:  statusPalette.missed.main,
} as const;
