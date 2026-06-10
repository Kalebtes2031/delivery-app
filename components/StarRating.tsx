import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  emptyColor = "#E2E8F0",
  gap = 2,
}: StarRatingProps) {
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
            color={name === "star-outline" ? emptyColor : color}
          />
        );
      })}
    </View>
  );
}
