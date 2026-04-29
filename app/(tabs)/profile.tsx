import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, Feather, Entypo, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ConfirmActionModal from '@/components/ConfirmActionModal';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onPress?: () => void;
}

function MenuItem({
  icon,
  label,
  danger = false,
  onPress,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        borderBottomWidth: danger ? 0 : 1,
        borderBottomColor: "rgba(255,255,255,0.1)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger ? "#ff000020" : "rgba(255,255,255,0.15)",
        }}>
          {icon}
        </View>
        <Text style={{ fontWeight: '600', fontSize: 16, color: "#fff" }}>{label}</Text>
      </View>
      {!danger && <Entypo name="chevron-right" size={20} color="#fff" />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            {user?.profile_image ? (
              <Image source={{ uri: user.profile_image }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(user?.first_name?.[0] || user?.username?.[0] || 'D').toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.userName}>
            {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
          </Text>
          <Text style={styles.userHandle}>{user?.email}</Text>
        </View>

        {/* --- MENU OPTIONS --- */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon={<Ionicons name="person-outline" size={20} color="#fff" />}
            label="Edit Profile"
            onPress={() => router.push("/myprofile")}
          />

          <MenuItem
            icon={<Ionicons name="language-outline" size={20} color="#fff" />}
            label="Language"
            // onPress={() => router.push("/language")}
          />

          <MenuItem
            icon={<Ionicons name="document-text-outline" size={20} color="#fff" />}
            label="Terms and Conditions"
            // onPress={() => router.push("/terms")}
          />

          <MenuItem
            icon={<Ionicons name="shield-checkmark-outline" size={20} color="#fff" />}
            label="Privacy Policy"
            // onPress={() => router.push("/privacy-policy")}
          />

          <MenuItem
            icon={<Ionicons name="help-circle-outline" size={20} color="#fff" />}
            label="Help & Support"
            // onPress={() => router.push("/help")}
          />

          <MenuItem
            icon={<MaterialIcons name="logout" size={20} color="#ff6b6b" />}
            label="Sign Out"
            danger
            onPress={() => setShowLogoutConfirm(true)}
          />
        </View>

        <Text style={styles.versionText}>Qine Delivery App</Text>
      </ScrollView>

      <ConfirmActionModal
        visible={showLogoutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out from the Qine Delivery App?"
        confirmText="Yes"
        cancelText="No"
        onConfirm={logout}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFF' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 3, marginBottom: 20 },
  avatarWrapper: { marginBottom: 5 },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#6750A4',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6750A4', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10,
  },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  avatarInitial: { fontSize: 44, color: '#fff', fontWeight: '900' },
  userName: { fontSize: 26, fontWeight: '800', color: '#1E293B' },
  userHandle: { fontSize: 15, color: '#94A3B8', fontWeight: '600' },
  menuContainer: {
    backgroundColor: '#6750A4',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#6750A4', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5,
  },
  versionText: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginTop: 40, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});