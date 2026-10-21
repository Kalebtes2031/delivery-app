import { View, Text, ScrollView, TouchableOpacity, StatusBar, Animated } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND_COLOR = "#6750A4";

type Section = {
  titleKey: string;
  bodyKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function TermsScreen() {
  const { t } = useTranslation("terms");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const sections: Section[] = [
    { titleKey: "section1Title", bodyKey: "section1Body", icon: "person-outline" },
    { titleKey: "section2Title", bodyKey: "section2Body", icon: "bicycle-outline" },
    { titleKey: "section3Title", bodyKey: "section3Body", icon: "cash-outline" },
    { titleKey: "section4Title", bodyKey: "section4Body", icon: "shield-checkmark-outline" },
    { titleKey: "section5Title", bodyKey: "section5Body", icon: "alert-circle-outline" },
    { titleKey: "section6Title", bodyKey: "section6Body", icon: "document-text-outline" },
    { titleKey: "section7Title", bodyKey: "section7Body", icon: "close-circle-outline" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_COLOR} />

      {/* Header */}
      <Animated.View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 24,
          paddingTop: 16,
          backgroundColor: BRAND_COLOR,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
            {t("title")}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 12 }}>
          {t("lastUpdated")}
        </Text>
      </Animated.View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        // @ts-ignore
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Introduction Card */}
        <View
          style={{
            backgroundColor: "#F5F0FF",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: "#E8DFF5",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="information-circle" size={22} color={BRAND_COLOR} />
            <Text style={{ color: BRAND_COLOR, fontWeight: "700", fontSize: 16 }}>
              {t("introductionTitle")}
            </Text>
          </View>
          <Text style={{ color: "#6B7280", lineHeight: 24 }}>{t("introductionBody")}</Text>
        </View>

        {/* Sections */}
        {sections.map((section, index) => (
          <View key={section.titleKey} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "rgba(103,80,164,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={section.icon} size={18} color={BRAND_COLOR} />
              </View>
              <Text style={{ color: BRAND_COLOR, fontWeight: "700", fontSize: 17, flex: 1 }}>
                {index + 1}. {t(section.titleKey)}
              </Text>
            </View>
            <Text style={{ color: "#6B7280", lineHeight: 24, marginLeft: 46 }}>
              {t(section.bodyKey)}
            </Text>
          </View>
        ))}

        {/* Contact Section */}
        <View
          style={{
            backgroundColor: "#F9FAFB",
            borderRadius: 16,
            padding: 20,
            marginTop: 8,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="mail-outline" size={20} color={BRAND_COLOR} />
            <Text style={{ color: BRAND_COLOR, fontWeight: "600" }}>{t("contactTitle")}</Text>
          </View>
          <Text style={{ color: "#6B7280", fontSize: 14 }}>
            {t("contactBody")}{" "}
            <Text style={{ color: BRAND_COLOR, fontWeight: "600" }}>support@elilitapp.com</Text>
          </Text>
        </View>

        {/* Accept Button */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: fadeAnim }] }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: BRAND_COLOR,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
              shadowColor: BRAND_COLOR,
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
              {t("acceptButton")}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}