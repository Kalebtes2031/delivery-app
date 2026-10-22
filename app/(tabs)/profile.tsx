import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, Feather, Entypo, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import StarRating from '@/components/StarRating';
import { Linking, Share } from 'react-native';
import { Asset } from 'expo-asset';
import RNShare from 'react-native-share';

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
        <Text style={{ fontWeight: '600', fontSize: 16, color: "#fff" }} numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8} >{label}</Text>
      </View>
      {!danger && <Entypo name="chevron-right" size={20} color="#fff" />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { t, i18n } = useTranslation(['driverProfile', 'common']);
  const isAmharic = i18n.language === 'am';
  const isSharingRef = useRef(false);

  const handleShareApp = async () => {
    if (isSharingRef.current) return;

    isSharingRef.current = true;

    const appName = isAmharic ? 'እልልታ የማድረሻ መተግበሪያ' : 'Elilita Delivery App';
    const playStoreUrl =
      'https://play.google.com/store/apps/details?id=com.active.deliveryapp';

    const defaultShareMessage = isAmharic
      ? 'እልልታ የማድረሻ መተግበሪያ (Elilita Delivery App) - ይቀላቀሉን፣ ያድሱ፣ ገቢ ያግኙ!\n\n🛵 ፈጣንና አስተማማኝ የማድረሻ ትዕዛዞች\n📍 የቀጥታ የካርታ አቅጣጫና ቀላል አጠቃቀም\n💵 አስተማማኝና ፈጣን የገቢ ክፍያ ስርዓት\n\nአሁኑኑ በነፃ ጭነው ይጠቀሙበት፦'
      : 'Discover Elilita Delivery App - Deliver, earn, and grow with us!\n\n🛵 Fast and reliable delivery orders\n📍 Live GPS navigation and easy order management\n💵 Reliable and quick earnings payouts\n\nDownload for free:';

    const message = `${t('shareMessage', {
      defaultValue: defaultShareMessage,
    })}\n${playStoreUrl}`;

    try {
      const asset = Asset.fromModule(
        require('@/assets/images/elilitadeliveryshare.png')
      );

      await asset.downloadAsync();

      const imageUri = asset.localUri ?? asset.uri;

      if (!imageUri) {
        throw new Error('Cover image is unavailable');
      }

      await RNShare.open({
        title: appName,
        subject: appName,
        message,
        url: imageUri,
        type: 'image/png',
        filename: 'elilitadeliveryshare',
        failOnCancel: false,
      });
    } catch (error: any) {
      if (
        error?.message &&
        !error.message.includes('User did not share') &&
        !error.message.includes('CANCELLED')
      ) {
        console.error('Delivery app sharing failed:', error);
        try {
          await Share.share({
            title: appName,
            message,
          });
        } catch (fallbackError) {
          console.error('Native share fallback failed:', fallbackError);
        }
      }
    } finally {
      isSharingRef.current = false;
    }
  };

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useFocusEffect(
    useCallback(() => {
      // Reset to initial values before animating
      fadeAnim.setValue(0);
      slideAnim.setValue(20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, slideAnim])
  );

  // Keep the rating fresh whenever the profile tab regains focus
  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
    }, [refreshUser]),
  );
  const totalReviews = user?.total_reviews ?? 0;
  const avgRating = parseFloat(user?.average_rating || '0') || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >

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
            <Text style={styles.userHandle}>
              {user?.email || t('deliveryDriver')}
            </Text>
          </View>


          {/* --- RATING CARD --- */}
          <TouchableOpacity
            style={styles.ratingCard}
            activeOpacity={0.85}
            onPress={() => router.push('/reviews')}
          >
            <View style={styles.ratingScoreBox}>
              <Text style={styles.ratingScore}>{avgRating.toFixed(1)}</Text>
              <Ionicons name="star" size={14} color="#FBBF24" />
            </View>

            <View style={styles.ratingMiddle}>
              <Text style={styles.ratingTitle}>{t('yourRating')}</Text>
              <StarRating rating={avgRating} size={16} />
              <Text style={styles.ratingCount}>
                {totalReviews > 0 ? t('reviewsCount', { count: totalReviews }) : t('noRatingYet')}
              </Text>
            </View>

            <View style={styles.ratingChevron}>
              <Entypo name="chevron-right" size={20} color="#6750A4" />
            </View>
          </TouchableOpacity>

          {/* --- MENU OPTIONS --- */}
          <View style={styles.menuContainer}>
            <MenuItem
              icon={<Ionicons name="person-outline" size={20} color="#fff" />}
              label={t('editProfile')}
              onPress={() => router.push("/myprofile")}
            />

            <MenuItem
              icon={<Ionicons name="language-outline" size={20} color="#fff" />}
              label={t('language')}
              onPress={() => router.push("/language")}
            />

            <MenuItem
              icon={<Ionicons name="document-text-outline" size={20} color="#fff" />}
              label={t('termsAndConditions')}
            onPress={() => router.push("/terms")}
            />

            <MenuItem
              icon={<Ionicons name="shield-checkmark-outline" size={20} color="#fff" />}
              label={t('privacyPolicy')}
            onPress={() => router.push("/privacy-policy")}
            />

            <MenuItem
              icon={<Ionicons name="help-circle-outline" size={20} color="#fff" />}
              label={t('helpAndSupport')}
            onPress={() => router.push("/help")}
            />

            <MenuItem
              icon={<Ionicons name="share-social-outline" size={20} color="#fff" />}
              label={t('shareApp', { defaultValue: 'Share App' })}
              onPress={handleShareApp}
            />

            <MenuItem
              icon={<MaterialIcons name="logout" size={20} color="#ff6b6b" />}
              label={t('signOut')}
              danger
              onPress={() => setShowLogoutConfirm(true)}
            />
          </View>

          <Text style={styles.versionText}>{t('activeDeliveryApp')}</Text>

          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text
              style={{
                textAlign: "center",
                fontSize: 10,
                color: "#1f2937",
              }}
            >
              {t("app.poweredBy")}{" "}
            </Text>
            <Text
              style={{
                fontWeight: "bold",
                color: "#8F3C01",
                fontSize: 10,
              }}
              onPress={() => Linking.openURL("https://activetechet.com")}
            >
              Active Technology PLC
            </Text>
          </View>
        </ScrollView>

        <ConfirmActionModal
          visible={showLogoutConfirm}
          title={t('signOutConfirmTitle')}
          description={t('signOutConfirmDescription')}
          confirmText={t('yes')}
          cancelText={t('no')}
          onConfirm={logout}
          onClose={() => setShowLogoutConfirm(false)}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  avatarWrapper: { marginBottom: 8 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#6750A4',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6750A4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { fontSize: 32, color: '#fff', fontWeight: '800' },
  userName: { fontSize: 22, fontWeight: '700', color: '#6750A4', letterSpacing: -0.3 },
  userHandle: { fontSize: 14, color: '#9B8BB5', fontWeight: '500' },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  ratingScoreBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#6750A4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ratingScore: { fontSize: 24, fontWeight: '900', color: '#fff' },
  ratingMiddle: { flex: 1, gap: 4 },
  ratingTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  ratingCount: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  ratingChevron: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6750A415',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContainer: {
    backgroundColor: '#6750A4',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: '#6750A4', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 5,
  },
  versionText: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginTop: 40, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});