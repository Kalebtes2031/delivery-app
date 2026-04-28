import React, { useRef, useState } from "react";
import { View, TouchableWithoutFeedback, Animated, StyleSheet } from "react-native";

export default function ToggleSwitch() {
  const [isOn, setIsOn] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = isOn ? 0 : 1;

    Animated.timing(translateX, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();

    setIsOn(!isOn);
  };

  const knobTranslate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 26], // move left ↔ right
  });

  const backgroundColor = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ccc", "#10b84dff"], // gray → green
  });

  return (
    <TouchableWithoutFeedback onPress={toggle}>
      <Animated.View style={[styles.container, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.knob,
            {
              transform: [{ translateX: knobTranslate }],
            },
          ]}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
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
});