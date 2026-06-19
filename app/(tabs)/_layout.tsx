import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { t } = useTranslation('deliveryHome'); 
    const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6750A4',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 55 + insets.bottom,
          paddingBottom: insets.bottom + 5,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('orders'),
          tabBarIcon: ({ color }) => <MaterialIcons name="local-shipping" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}