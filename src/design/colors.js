// Web color tokens based on the TDS color reference supplied by the user.
// These are local design tokens; no React Native runtime is required.
export const colors = Object.freeze({
  grey50: '#f9fafb',
  grey100: '#f2f4f6',
  grey200: '#e5e8eb',
  grey300: '#d1d6db',
  grey400: '#b0b8c1',
  grey500: '#8b95a1',
  grey600: '#6b7684',
  grey700: '#4e5968',
  grey800: '#333d4b',
  grey900: '#191f28',
  blue50: '#e8f3ff',
  blue100: '#c9e2ff',
  blue200: '#90c2ff',
  blue300: '#64a8ff',
  blue400: '#4593fc',
  blue500: '#3182f6',
  blue600: '#2272eb',
  blue700: '#1b64da',
  blue800: '#1957c2',
  blue900: '#194aa6',
  red50: '#ffeeee',
  red100: '#ffd4d6',
  red500: '#f04452',
  red600: '#e42939',
  red700: '#d22030',
  orange50: '#fff3e0',
  orange100: '#ffe0b0',
  orange500: '#fe9800',
  orange700: '#f57800',
  orange800: '#ed6700',
  orange900: '#e45600',
  green50: '#f0faf6',
  green100: '#aeefd5',
  green500: '#03b26c',
  green700: '#029359',
  green900: '#027648',
  greyOpacity50: 'rgba(0, 23, 51, 0.02)',
  greyOpacity100: 'rgba(2, 32, 71, 0.05)',
  greyOpacity200: 'rgba(0, 27, 55, 0.1)',
  greyOpacity300: 'rgba(0, 29, 58, 0.18)',
  greyOpacity500: 'rgba(3, 24, 50, 0.46)',
  background: '#ffffff',
});

export const mapColors = Object.freeze({
  clear: colors.grey500,
  partial: colors.orange800,
  severe: colors.red500,
  improved: colors.blue500,
  worse: colors.red500,
  same: colors.grey300,
  inactive: colors.grey200,
});

export function applyColorTokens(root = document.documentElement) {
  for (const [name, value] of Object.entries(colors))
    root.style.setProperty(`--color-${name}`, value);
  for (const [name, value] of Object.entries(mapColors))
    root.style.setProperty(`--map-${name}`, value);
}
