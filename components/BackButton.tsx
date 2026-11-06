import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';

interface BackButtonProps {
  title: string;
  color?: string;
}

const BackButton = ({ title, color }: BackButtonProps) => {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            borderColor: isDark ? colors.border : colors.primary,
            backgroundColor: isDark ? colors.card : 'transparent',
          },
        ]}
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={18} color={colors.primary} />
      </TouchableOpacity>
      <Text
        style={[
          styles.headerTitle,
          { color: isDark ? colors.text : colors.primary },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={{ width: 32 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default BackButton;
