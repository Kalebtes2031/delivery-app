import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useOptionalAppTheme } from '@/context/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  const theme = useOptionalAppTheme();
  const native = useNativeColorScheme();
  return theme?.scheme ?? (native === 'dark' ? 'dark' : 'light');
}
