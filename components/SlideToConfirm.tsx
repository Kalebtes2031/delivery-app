import React, { useState } from 'react';
import { StyleSheet, View, Text, Dimensions, Animated } from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 40;
const KNOB_SIZE = 50;
const SUCCESS_THRESHOLD = SLIDER_WIDTH - KNOB_SIZE - 10;

interface SlideToConfirmProps {
  onConfirm: () => void;
  label: string;
  color: string;
  icon?: string;
  isLoading?: boolean;
}

export default function SlideToConfirm({ onConfirm, label, color, icon, isLoading }: SlideToConfirmProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const translateX = React.useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.translationX >= SUCCESS_THRESHOLD) {
        // Success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsCompleted(true);
        Animated.spring(translateX, {
          toValue: SUCCESS_THRESHOLD,
          useNativeDriver: true,
          bounciness: 0,
        }).start(() => {
          onConfirm();
          // Reset after a delay if needed, but usually the screen updates
          setTimeout(() => {
            translateX.setValue(0);
            setIsCompleted(false);
          }, 1000);
        });
      } else {
        // Fail - snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const opacity = translateX.interpolate({
    inputRange: [0, SUCCESS_THRESHOLD / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { backgroundColor: color + '20' }]}>
      <Animated.View style={[styles.textContainer, { opacity }]}>
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={!isLoading && !isCompleted}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              backgroundColor: color,
              transform: [{
                translateX: translateX.interpolate({
                  inputRange: [0, SUCCESS_THRESHOLD],
                  outputRange: [0, SUCCESS_THRESHOLD],
                  extrapolate: 'clamp',
                })
              }],
            },
          ]}
        >
          <MaterialCommunityIcons 
            name={(isCompleted || isLoading) ? "check" : (icon as any || "chevron-right")} 
            size={28} 
            color="#fff" 
          />
        </Animated.View>
      </PanGestureHandler>
      
      {!isCompleted && !isLoading && (
         <View style={styles.hintContainer}>
            <MaterialCommunityIcons name="chevron-double-right" size={20} color={color} style={styles.hintIcon} />
         </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    width: SLIDER_WIDTH,
    borderRadius: 28,
    justifyContent: 'center',
    padding: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  knob: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 2,
  },
  textContainer: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hintContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
  hintIcon: {
    opacity: 0.5,
  }
});
