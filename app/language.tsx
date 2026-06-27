import { LanguageSwitcher } from "@/components/language/LanguageSwitcher";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TouchableOpacity, View, StatusBar, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND_COLOR = "#6750A4";

export default function LanguageScreen() {
  const router = useRouter();
  const { t } = useTranslation(["common", "language"]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_COLOR} />

      {/* Header Section */}
      <View style={styles.headerWrapper}>
        <View style={[styles.header, { backgroundColor: BRAND_COLOR }]}>
          <View style={styles.headerContent}>
            {/* Back Button - LEFT SIDE */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="white" />
            </TouchableOpacity>

            {/* Title and Image Container - PUSHED TO RIGHT */}
            <View style={styles.headerRight}>
              {/* Title Text - Left side of this container */}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>
                  {t("common:app.name") || "Active Mart"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {t("language:chooseYourLanguage") || "Choose your language"}
                </Text>
              </View>
              {/* Image - Pushed to far right */}
              <View style={styles.logoWrapper}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require("@/assets/images/active mart.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Language Switcher Card */}
        <View style={styles.languageCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="globe" size={20} color={BRAND_COLOR} />
            </View>
<Text style={styles.cardTitleSecondary}>
  {t("language:selectLanguage") || "Select Language"}
</Text>
          </View>

          <View style={styles.switcherWrapper}>
            <LanguageSwitcher showText={false} />
          </View>
        </View>

        {/* Coming Soon Info Card */}
        <View style={styles.comingSoonCard}>
          <View style={styles.comingSoonIcon}>
            <Ionicons name="time-outline" size={20} color="#D97706" />
          </View>
          <View style={styles.comingSoonContent}>
            <Text style={styles.comingSoonTitle}>
              🚧 {t("language:comingSoon.title") || "More Languages Coming Soon"}
            </Text>
            <Text style={styles.comingSoonMessage}>
              {t("language:comingSoon.message") || 
                "We're working on adding more languages to serve you better."}
            </Text>
          </View>
        </View>

        {/* Supported Languages List */}
        <View style={styles.languageListContainer}>
          <Text style={styles.languageListTitle}>
            {t("language:supportLanguages") || "Supported Languages"}
          </Text>
          <View style={styles.languageList}>
            {[
              {
                code: "en",
                name: t("language:plannedLanguages.english") || "English",
                flag: "🇺🇸",
                status: "available",
              },
              {
                code: "am",
                name: t("language:plannedLanguages.amharic") || "Amharic",
                flag: "🇪🇹",
                status: "available",
              },
              {
                code: "om",
                name: t("language:plannedLanguages.afaanOromo") || "Afaan Oromo",
                flag: "🇪🇹",
                status: "coming",
              },
              {
                code: "ti",
                name: t("language:plannedLanguages.tigrinya") || "Tigrinya",
                flag: "🇪🇹",
                status: "coming",
              },
              {
                code: "so",
                name: t("language:plannedLanguages.somali") || "Somali",
                flag: "🇪🇹",
                status: "coming",
              },
            ].map((lang) => (
              <View
                key={lang.code}
                style={[
                  styles.languageTag,
                  lang.status === "available"
                    ? styles.languageTagAvailable
                    : styles.languageTagComing
                ]}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.languageName,
                    lang.status === "available"
                      ? styles.languageNameAvailable
                      : styles.languageNameComing
                  ]}
                >
                  {lang.name}
                </Text>
                {lang.status === "coming" && (
                  <Text style={styles.badgeComing}>
                    {t("language:status.soon") || "Soon"}
                  </Text>
                )}
                {lang.status === "available" && (
                  <Text style={styles.badgeActive}>
                    {t("language:status.active") || "Active"}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Footer Note */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t("language:footer") || "Select your preferred language"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrapper: {
    position: 'relative',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    marginLeft: 12,
  },
  headerTextContainer: {
    alignItems: 'flex-end',
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'right',
  },
  logoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    flexShrink: 0,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImage: {
    width: 32,
    height: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 20,
  },
  languageCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E8E0F0',
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8E0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '600',
  },
    cardTitleSecondary: {
    color: '#6750A4',
    fontSize: 16,
    fontWeight: '600',
  },
  switcherWrapper: {
    marginTop: 8,
  },
  comingSoonCard: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  comingSoonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonContent: {
    flex: 1,
  },
  comingSoonTitle: {
    color: '#B45309',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  comingSoonMessage: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
  },
  languageListContainer: {
    marginTop: 24,
  },
  languageListTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  languageTagAvailable: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  languageTagComing: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  languageFlag: {
    fontSize: 14,
  },
  languageName: {
    fontSize: 12,
    fontWeight: '500',
  },
  languageNameAvailable: {
    color: '#065F46',
  },
  languageNameComing: {
    color: '#6B7280',
  },
  badgeComing: {
    fontSize: 8,
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '700',
  },
  badgeActive: {
    fontSize: 8,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '700',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 24,
    marginTop: 16,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
});