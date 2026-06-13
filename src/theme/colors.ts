export const Colors = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  secondary: '#FD79A8',
  background: '#0F0A1A',
  card: '#1A1332',
  cardLight: '#231C42',
  surface: '#2D2352',
  text: '#FFFFFF',
  textSecondary: '#B8B0D4',
  success: '#00D2A0',
  warning: '#FDCB6E',
  accent: '#74B9FF',
  water: '#74B9FF',
  error: '#FF6B6B',
  transparent: 'transparent',
  overlay: 'rgba(108, 92, 231, 0.15)',
  inputBackground: 'rgba(255, 255, 255, 0.08)',
  inputBorder: 'rgba(255, 255, 255, 0.12)',
  shadowColor: '#6C5CE7',
} as const;

export type ColorKey = keyof typeof Colors;
