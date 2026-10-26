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
import * as FileSystem from 'expo-file-system/legacy';
import RNShare from 'react-native-share';
import { useTranslation } from 'react-i18next';
import Config from '@/constants/Config';

import { LinearGradient } from 'expo-linear-gradient';

const BRAND_COLOR = "#6750A4";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onPress?: () => void;
  style?: any;
}

function MenuItem({
  icon,
  label,
  danger = false,
  onPress,
  style,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 16,
          borderBottomWidth: danger ? 0 : 1,
          borderBottomColor: "rgba(255,255,255,0.1)",
        },
        style,
      ]}
    >
      {/* LEFT SIDE */}
      <View style={{ flexDirection: "row", alignItems: "center", columnGap: 12, flex: 1 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: danger ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.1)",
          }}
        >
          {icon}
        </View>

        <Text
          style={{ fontWeight: '600', fontSize: 16, color: "#fff", flex: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
      </View>

      {/* RIGHT SIDE */}
      {!danger && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 }}>
          <Entypo name="chevron-right" size={20} color="#fff" />
        </View>
      )}
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

    const remoteImageUrl = `${Config.API_ORIGIN}/media/share/elilitadeliveryshare.jpg`;
    const targetFile = `${FileSystem.cacheDirectory}elilitadeliveryshare.jpg`;
    const tempFile = `${FileSystem.cacheDirectory}elilitadeliveryshare.jpg.tmp`;
    const MIN_VALID_SIZE = 30000; // 30 KB
    let isCachedValid = false;

    try {
      try {
        const fileInfo = await FileSystem.getInfoAsync(targetFile);
        if (fileInfo.exists && typeof fileInfo.size === 'number' && fileInfo.size >= MIN_VALID_SIZE) {
          isCachedValid = true;
        } else if (fileInfo.exists) {
          // Truncated or corrupt from interrupted download - delete it so it re-downloads cleanly
          await FileSystem.deleteAsync(targetFile, { idempotent: true });
        }
      } catch (cacheCheckErr) {
        console.warn('Cache verification check error:', cacheCheckErr);
      }

      if (!isCachedValid) {
        try {
          await FileSystem.deleteAsync(tempFile, { idempotent: true });
          const downloadRes = await FileSystem.downloadAsync(remoteImageUrl, tempFile);

          if (downloadRes.status === 200) {
            const tempInfo = await FileSystem.getInfoAsync(tempFile);
            if (tempInfo.exists && typeof tempInfo.size === 'number' && tempInfo.size >= MIN_VALID_SIZE) {
              await FileSystem.moveAsync({
                from: tempFile,
                to: targetFile,
              });
              isCachedValid = true;
            }
          }
        } catch (downloadErr) {
          console.warn('Backend image download failed, attempting asset fallback:', downloadErr);
        } finally {
          try {
            await FileSystem.deleteAsync(tempFile, { idempotent: true });
          } catch {}
        }
      }

      // Dev-mode asset fallback if backend download was not possible
      if (!isCachedValid) {
        try {
          const [asset] = await Asset.loadAsync(
            require('@/assets/images/elilitadeliveryshare.jpg')
          );
          const sourceUri = asset.localUri || asset.uri;
          if (
            sourceUri &&
            (sourceUri.startsWith('file:') ||
              sourceUri.startsWith('http:') ||
              sourceUri.startsWith('content:'))
          ) {
            await FileSystem.copyAsync({
              from: sourceUri,
              to: targetFile,
            });
            const fallbackInfo = await FileSystem.getInfoAsync(targetFile);
            if (fallbackInfo.exists && typeof fallbackInfo.size === 'number' && fallbackInfo.size >= MIN_VALID_SIZE) {
              isCachedValid = true;
            }
          }
        } catch (assetErr) {
          console.warn('Asset fallback copy failed:', assetErr);
        }
      }

      if (isCachedValid) {
        const shareUrl = targetFile.startsWith('file://') ? targetFile : `file://${targetFile}`;
        await RNShare.open({
          title: appName,
          subject: appName,
          message,
          url: shareUrl,
          type: 'image/jpeg',
          filename: 'elilitadeliveryshare',
          failOnCancel: false,
        });
      } else {
        await Share.share({
          title: appName,
          message,
        });
      }
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
          <LinearGradient
            colors={[BRAND_COLOR, "#6750A4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.menuContainer}
          >
            <MenuItem
              icon={<Ionicons name="person-outline" size={18} color="#fff" />}
              label={t('editProfile')}
              onPress={() => router.push("/myprofile")}
            />

            <MenuItem
              icon={<Ionicons name="language-outline" size={18} color="#fff" />}
              label={t('language')}
              onPress={() => router.push("/language")}
            />

            <MenuItem
              icon={<Ionicons name="document-text-outline" size={18} color="#fff" />}
              label={t('termsAndConditions')}
              onPress={() => router.push("/terms")}
            />

            <MenuItem
              icon={<Ionicons name="shield-checkmark-outline" size={18} color="#fff" />}
              label={t('privacyPolicy')}
              onPress={() => router.push("/privacy-policy")}
            />

            <MenuItem
              icon={<Ionicons name="help-circle-outline" size={18} color="#fff" />}
              label={t('helpAndSupport')}
              onPress={() => router.push("/help")}
            />

            <MenuItem
              icon={<Ionicons name="share-social-outline" size={18} color="#fff" />}
              label={t('shareApp', { defaultValue: 'Share App' })}
              onPress={handleShareApp}
            />

            <MenuItem
              icon={<MaterialIcons name="logout" size={18} color="#ef4444" />}
              label={t('signOut')}
              danger
              onPress={() => setShowLogoutConfirm(true)}
            />
          </LinearGradient>

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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, },
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
    borderRadius: 15,
    paddingHorizontal: 16,
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  versionText: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginTop: 40, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});