import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  style?: ViewStyle;
}

export default function ThemeToggle({ style }: ThemeToggleProps) {
  const { isDark, setMode, colors } = useAppTheme();

  const handleSelect = (nextMode: 'light' | 'dark') => {
    if ((nextMode === 'dark' && isDark) || (nextMode === 'light' && !isDark)) {
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setMode(nextMode);
  };

  return (
    <View
      style={[
        styles.capsule,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        },
        style,
      ]}
      accessible
      accessibilityRole="radiogroup"
      accessibilityLabel="Appearance switch"
    >
      <TouchableOpacity
        onPress={() => handleSelect('light')}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ selected: !isDark }}
        accessibilityLabel="Light mode"
        style={[
          styles.iconButton,
          !isDark && [
            styles.activeIndicator,
            {
              backgroundColor: colors.card,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2,
              elevation: 2,
            },
          ],
        ]}
      >
        <Ionicons
          name="sunny"
          size={14}
          color={!isDark ? '#F59E0B' : colors.textMuted}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleSelect('dark')}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ selected: isDark }}
        accessibilityLabel="Dark mode"
        style={[
          styles.iconButton,
          isDark && [
            styles.activeIndicator,
            {
              backgroundColor: colors.card,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
              elevation: 2,
            },
          ],
        ]}
      >
        <Ionicons
          name="moon"
          size={13}
          color={isDark ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconButton: {
    width: 28,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    borderRadius: 13,
  },
});

