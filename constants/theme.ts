/**
 * Theme constants for qine_deliveryapp.
 * Harmonized with ThemeContext and qine_frontend palettes.
 */

import { Platform } from 'react-native';
import { palettes } from '@/context/ThemeContext';

export { palettes };

export const Colors = {
  light: {
    text: palettes.light.text,
    background: palettes.light.background,
    tint: palettes.light.primary,
    icon: palettes.light.textMuted,
    tabIconDefault: palettes.light.textMuted,
    tabIconSelected: palettes.light.primary,
  },
  dark: {
    text: palettes.dark.text,
    background: palettes.dark.background,
    tint: palettes.dark.primary,
    icon: palettes.dark.textMuted,
    tabIconDefault: palettes.dark.textMuted,
    tabIconSelected: palettes.dark.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
