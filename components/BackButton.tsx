import React from "react";
import { StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";

type BackButtonProps = {
  /** Optional custom onPress. Defaults to router.back() */
  onPress?: () => void;
  /** Layout-only style (position, margin). Colors & size are locked. */
  style?: StyleProp<ViewStyle>;
};

const BRAND = "#6750A4";

export default function BackButton({ onPress, style }: BackButtonProps) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const handlePress = () => {
    if (onPress) onPress();
    else router.back();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          // Light: white | Dark: card surface
          backgroundColor: isDark ? colors.card : "#FFFFFF",
          // Light: purple | Dark: softer purple border
          borderColor: isDark ? "#6750A4" : BRAND,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons
        name="arrow-back"
        size={22}
        // Light: purple | Dark: brand purple (readable on dark card)
        color={BRAND}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});