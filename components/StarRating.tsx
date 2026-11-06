import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOptionalAppTheme } from "@/context/ThemeContext";

interface StarRatingProps {
  rating: number;          // e.g. 4.3
  size?: number;
  color?: string;
  emptyColor?: string;
  gap?: number;
}

/**
 * Read-only star display that supports half stars.
 */
export default function StarRating({
  rating,
  size = 18,
  color = "#FBBF24",
  emptyColor,
  gap = 2,
}: StarRatingProps) {
  const theme = useOptionalAppTheme();
  const resolvedEmpty = emptyColor ?? (theme ? theme.colors.border : "#E2E8F0");

  return (
    <View style={{ flexDirection: "row", gap }}>
      {[1, 2, 3, 4, 5].map((i) => {
        let name: "star" | "star-half" | "star-outline" = "star-outline";
        if (rating >= i) name = "star";
        else if (rating >= i - 0.5) name = "star-half";

        return (
          <Ionicons
            key={i}
            name={name}
            size={size}
            color={name === "star-outline" ? resolvedEmpty : color}
          />
        );
      })}
    </View>
  );
}
