import React, { useRef, useEffect } from "react";
import { TouchableOpacity, Animated, StyleSheet, ActivityIndicator, View } from "react-native";

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

export default function ToggleSwitch({ isOn, onToggle, isLoading }: ToggleSwitchProps) {
  const translateX = useRef(new Animated.Value(isOn ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOn ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isOn]);

  const knobTranslate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 26], 
  });

  const backgroundColor = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: ["#CBD5E1", "#10B981"], 
  });

  return (
    <TouchableOpacity onPress={onToggle} disabled={isLoading} activeOpacity={0.8}>
      <Animated.View style={[styles.container, { backgroundColor }]}>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : (
          <Animated.View
            style={[
              styles.knob,
              {
                transform: [{ translateX: knobTranslate }],
              },
            ]}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 55,
    height: 28,
    borderRadius: 20,
    justifyContent: "center",
    padding: 2,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});