import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  text1?: string;
  text2?: string;
}

type IconName = keyof typeof Ionicons.glyphMap;

interface ToastContainerProps {
  iconName: IconName;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  text1?: string;
  text2?: string;
  text1Color?: string;
  text2Color?: string;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  iconName,
  iconColor,
  bgColor,
  borderColor,
  text1,
  text2,
  text1Color = '#FFFFFF',
  text2Color = '#D1D5DB',
}) => {
  return (
    <View
      style={[
        styles.toastCard,
        {
          backgroundColor: bgColor,
          borderLeftColor: borderColor,
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.iconWrapper, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        {text1 ? (
          <Text style={[styles.text1, { color: text1Color }]}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.text2, { color: text2Color }]}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export const toastConfig = {
  success: ({ text1, text2 }: ToastProps) => (
    <ToastContainer
      iconName="checkmark-circle"
      iconColor="#22C55E"
      bgColor="#052e16"
      borderColor="#16A34A"
      text1={text1}
      text2={text2}
    />
  ),

  error: ({ text1, text2 }: ToastProps) => (
    <ToastContainer
      iconName="close-circle"
      iconColor="#F87171"
      bgColor="#2d0a0a"
      borderColor="#DC2626"
      text1={text1}
      text2={text2}
    />
  ),

  info: ({ text1, text2 }: ToastProps) => (
    <ToastContainer
      iconName="information-circle"
      iconColor="#60A5FA"
      bgColor="#0c1e3a"
      borderColor="#2563EB"
      text1={text1}
      text2={text2}
    />
  ),

  warning: ({ text1, text2 }: ToastProps) => (
    <ToastContainer
      iconName="alert-circle"
      iconColor="#FBBF24"
      bgColor="#3a2a05"
      borderColor="#F59E0B"
      text1={text1}
      text2={text2}
    />
  ),

  offline: ({ text1, text2 }: ToastProps) => (
    <ToastContainer
      iconName="cloud-offline"
      iconColor="#EF4444"
      bgColor="#1F1315"
      borderColor="#DC2626"
      text1={text1}
      text2={text2}
    />
  ),

  online: ({ text1, text2 }: ToastProps) => (
    <ToastContainer
      iconName="cloud-done"
      iconColor="#22C55E"
      bgColor="#052e16"
      borderColor="#16A34A"
      text1={text1}
      text2={text2}
    />
  ),
};

const styles = StyleSheet.create({
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderLeftWidth: 5,
    zIndex: 999999,
    elevation: 999999,
    width: '92%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  text1: {
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 20,
  },
  text2: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
