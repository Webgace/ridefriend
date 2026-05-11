export const COLORS = {
  navy: '#0D1F38',
  navy2: '#162E52',
  amber: '#D97706',
  amberLight: '#FEF7E6',
  green: '#10B981',
  greenLight: '#D1FAE5',
  red: '#EF4444',
  redLight: '#FEE2E2',
  surface: '#F2F5FB',
  text: '#0D1F38',
  text2: '#4B5775',
  text3: '#94A3B8',
  border: '#E2E8F2',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
} as const;

/**
 * Famílias de fontes — tem de coincidir com os pesos carregados em App.tsx.
 * Sora: headings/logo/números grandes (700/800).
 * DM Sans: corpo (400/500/600).
 */
export const FONTS = {
  soraBold: 'Sora_700Bold',
  soraExtra: 'Sora_800ExtraBold',
  bodyRegular: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemi: 'DMSans_600SemiBold',
} as const;

/**
 * Paleta por grupo de relação (DriverCard etiqueta + AvatarBadge fundo).
 * Conforme RideFriend_Design_Reference.txt secção 6.
 */
export const RELATION_COLORS = {
  family:    { bg: '#FEE2E2', fg: '#991B1B', avatarBg: '#FEF3C7', avatarFg: '#92400E' },
  friend:    { bg: '#DBEAFE', fg: '#1E40AF', avatarBg: '#EFF6FF', avatarFg: '#1D4ED8' },
  colleague: { bg: '#F3E8FF', fg: '#6B21A8', avatarBg: '#EDE9FE', avatarFg: '#5B21B6' },
  neighbour: { bg: '#D1FAE5', fg: '#065F46', avatarBg: '#D1FAE5', avatarFg: '#065F46' },
} as const;

export type RelationGroup = keyof typeof RELATION_COLORS;

/**
 * Categorias de ETA para o badge — conforme secção 6 do design ref.
 */
export function classifyEta(minutes: number): 'close' | 'mid' | 'far' {
  if (minutes <= 2) return 'close';
  if (minutes <= 8) return 'mid';
  return 'far';
}

export const ETA_BADGE_STYLES = {
  close: { bg: '#D1FAE5', fg: '#065F46' },
  mid:   { bg: '#FEF3C7', fg: '#92400E' },
  far:   { bg: '#F1F5F9', fg: '#94A3B8' },
} as const;

export const TYPOGRAPHY = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export interface Theme {
  colors: {
    primary: string;
    accent: string;
    success: string;
    error: string;
    surface: string;
    text: string;
    text2: string;
    border: string;
  };
  typography: typeof TYPOGRAPHY;
  spacing: typeof SPACING;
  borderRadius: typeof BORDER_RADIUS;
  shadows: typeof SHADOWS;
}

/**
 * Get theme with customizable accent color (per market)
 */
export function getTheme(accentColor: string = COLORS.amber): Theme {
  return {
    colors: {
      primary: COLORS.navy,
      accent: accentColor,
      success: COLORS.green,
      error: COLORS.red,
      surface: COLORS.surface,
      text: COLORS.text,
      text2: COLORS.text2,
      border: COLORS.border,
    },
    typography: TYPOGRAPHY,
    spacing: SPACING,
    borderRadius: BORDER_RADIUS,
    shadows: SHADOWS,
  };
}

export const THEME = getTheme();

export type ThemeType = typeof THEME;
