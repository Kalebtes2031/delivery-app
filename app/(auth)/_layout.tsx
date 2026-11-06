import { Stack } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';

export default function AuthLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
