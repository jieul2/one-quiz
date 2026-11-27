export interface ThemeColorPalette {
  background: string;
  onBackground: string;
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  outline: string;
  outlineVariant: string;
  error: string;
  errorContainer: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  type: 'light' | 'dark';
  previewColors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
  };
  colors: ThemeColorPalette;
}

export const THEME_LIST: ThemeConfig[] = [
  // 1. 라이트 테마 (화이트 계열)
  {
    id: 'light',
    name: '라이트 모드',
    description: '눈이 편안하고 깔끔한 화이트 기반의 기본 밝은 테마',
    type: 'light',
    previewColors: {
      primary: '#4f46e5',
      secondary: '#06b6d4',
      background: '#f8fafc',
      surface: '#ffffff',
    },
    colors: {
      background: '#f8fafc',
      onBackground: '#0f172a',
      surface: '#ffffff',
      surfaceContainerLowest: '#ffffff',
      surfaceContainerLow: '#f1f5f9',
      surfaceContainer: '#e2e8f0',
      surfaceContainerHigh: '#cbd5e1',
      surfaceContainerHighest: '#94a3b8',
      onSurface: '#0f172a',
      onSurfaceVariant: '#64748b',
      primary: '#4f46e5',
      onPrimary: '#ffffff',
      primaryContainer: '#e0e7ff',
      onPrimaryContainer: '#3730a3',
      secondary: '#06b6d4',
      onSecondary: '#ffffff',
      secondaryContainer: '#cffafe',
      onSecondaryContainer: '#155e75',
      outline: '#94a3b8',
      outlineVariant: '#e2e8f0',
      error: '#ef4444',
      errorContainer: '#fee2e2',
    },
  },

  // 2. 블랙 / 다크 테마 (블랙 계열)
  {
    id: 'dark',
    name: '블랙 / 다크 모드',
    description: '시인성이 뛰어나고 눈의 피로를 덜어주는 표준 다크 테마',
    type: 'dark',
    previewColors: {
      primary: '#6366f1',
      secondary: '#38bdf8',
      background: '#0b0f19',
      surface: '#151d2f',
    },
    colors: {
      background: '#0b0f19',
      onBackground: '#f8fafc',
      surface: '#151d2f',
      surfaceContainerLowest: '#0d1322',
      surfaceContainerLow: '#182237',
      surfaceContainer: '#1e2a44',
      surfaceContainerHigh: '#273759',
      surfaceContainerHighest: '#334773',
      onSurface: '#f8fafc',
      onSurfaceVariant: '#94a3b8',
      primary: '#6366f1',
      onPrimary: '#ffffff',
      primaryContainer: '#312e81',
      onPrimaryContainer: '#c7d2fe',
      secondary: '#38bdf8',
      onSecondary: '#082f49',
      secondaryContainer: '#0369a1',
      onSecondaryContainer: '#e0f2fe',
      outline: '#475569',
      outlineVariant: '#1e293b',
      error: '#f87171',
      errorContainer: '#7f1d1d',
    },
  },
];

export const LIGHT_THEMES = THEME_LIST.filter((t) => t.type === 'light');
export const DARK_THEMES = THEME_LIST.filter((t) => t.type === 'dark');

export function getThemeById(id: string): ThemeConfig {
  return THEME_LIST.find((t) => t.id === id) || THEME_LIST[0];
}
