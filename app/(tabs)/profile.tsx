import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32, backgroundColor:"#ffffff" }}>
          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#6750A4',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 32, color: '#ffffff', fontWeight: '900' }}>
                {(user?.first_name?.[0] || user?.username?.[0] || 'D').toUpperCase()}
              </Text>
            </View>
            <Text style={{ color: '#6750A4', fontSize: 22, fontWeight: '900' }}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={{ color: '#6750A4', fontSize: 14, marginTop: 4 }}>
              @{user?.username}
            </Text>
          </View>

          {/* Info Cards */}
          <View style={{ gap: 12 }}>
            <InfoRow label="Email" value={user?.email || '—'} />
            <InfoRow label="Phone" value={user?.phone_number || '—'} />
            <InfoRow label="Role" value="Delivery Driver" />
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              marginTop: 'auto',
              marginBottom: 32,
              backgroundColor: '#DC2626',
              borderRadius: 116,
              padding: 18,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        backgroundColor: '#6750A4',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
      }}
    >
      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ color: '#F1F5F9', fontSize: 16, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}
