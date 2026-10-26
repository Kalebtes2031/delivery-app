import {
  ActivityIndicator, Animated, LayoutAnimation,
  Linking, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, UIManager, View, useWindowDimensions, Clipboard,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";
// import SuccessModal from "@/components/SuccessModal";

const BRAND_COLOR = "#6750A4";
const BRAND_LIGHT = "#8B6FBC";
const BG_COLOR = "#F7F8FC";
const TEXT_PRIMARY = "#171725";
const TEXT_SECONDARY = "#6B7280";
const BORDER_COLOR = "#E8E8F0";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type HelpItem = {
  titleKey: string;
  bodyKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type VideoTutorial = {
  id: string;
  url: string;
  titleKey: string;
  descriptionKey: string;
  thumbnail: string;
  fallbackThumbnail: string;
};

export default function HelpScreen() {
  const { t } = useTranslation("help");
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [selectedOption, setSelectedOption] = useState<{ copyLabel: string } | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [openGuide, setOpenGuide] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showVideosModal, setShowVideosModal] = useState(false);
  const [preparingVideoId, setPreparingVideoId] = useState<string | null>(null);
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const contactOptions = [
    {
      icon: "call-outline" as const,
      key: "phone",
      action: async () => {
        const url = "tel:+251909527600";
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
      },
      gradient: ["#10B981", "#059669"] as const,
      contactInfo: t("contactOptions.phone.number"),
      copyValue: "+251909527600",
      copyLabel: t("contactOptions.phone.copyLabel"),
    },
    {
      icon: "mail-outline" as const,
      key: "email",
      action: async () => {
        const url = "mailto:support@elilitapp.com";
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
      },
      gradient: ["#3B82F6", "#2563EB"] as const,
      contactInfo: t("contactOptions.email.number"),
      copyValue: "support@elilitapp.com",
      copyLabel: t("contactOptions.email.copyLabel"),
    },
  ];

  const videoTutorials: VideoTutorial[] = [
    {
      id: "itdrxS7Hki0",
      url: "https://youtu.be/itdrxS7Hki0",
      titleKey: "videoTutorials.video1.title",
      descriptionKey: "videoTutorials.video1.description",
      thumbnail: "https://img.youtube.com/vi/itdrxS7Hki0/sddefault.jpg",
      fallbackThumbnail: "https://img.youtube.com/vi/itdrxS7Hki0/hqdefault.jpg",
    },
    {
      id: "NXDYGD1DN_M",
      url: "https://youtu.be/NXDYGD1DN_M",
      titleKey: "videoTutorials.video2.title",
      descriptionKey: "videoTutorials.video2.description",
      thumbnail: "https://img.youtube.com/vi/NXDYGD1DN_M/sddefault.jpg",
      fallbackThumbnail: "https://img.youtube.com/vi/NXDYGD1DN_M/hqdefault.jpg",
    },
  ];

  const guides: HelpItem[] = [
    { titleKey: "sections.gettingStarted.title", bodyKey: "sections.gettingStarted.body", icon: "rocket-outline" },
    { titleKey: "sections.acceptingOrders.title", bodyKey: "sections.acceptingOrders.body", icon: "checkmark-circle-outline" },
    { titleKey: "sections.navigation.title", bodyKey: "sections.navigation.body", icon: "navigate-outline" },
    { titleKey: "sections.earnings.title", bodyKey: "sections.earnings.body", icon: "wallet-outline" },
    { titleKey: "sections.deliveryProof.title", bodyKey: "sections.deliveryProof.body", icon: "camera-outline" },
    { titleKey: "sections.ratings.title", bodyKey: "sections.ratings.body", icon: "star-outline" },
    { titleKey: "sections.support.title", bodyKey: "sections.support.body", icon: "headset-outline" },
  ];

  const faqs: HelpItem[] = [
    { titleKey: "faq1.question", bodyKey: "faq1.answer", icon: "help-circle-outline" },
    { titleKey: "faq2.question", bodyKey: "faq2.answer", icon: "time-outline" },
    { titleKey: "faq3.question", bodyKey: "faq3.answer", icon: "card-outline" },
    { titleKey: "faq4.question", bodyKey: "faq4.answer", icon: "bicycle-outline" },
    { titleKey: "faq5.question", bodyKey: "faq5.answer", icon: "alert-circle-outline" },
  ];

  const toggleSection = (current: number | null, index: number, setter: (v: number | null) => void) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(current === index ? null : index);
  };

  const copyContact = (option: (typeof contactOptions)[number]) => {
    try {
      Clipboard.setString(option.copyValue);
      setSelectedOption({ copyLabel: option.copyLabel });
      setShowCopyModal(true);
    } catch {}
  };

  const openOnYouTube = async (video: VideoTutorial) => {
    if (preparingVideoId) return;
    try {
      setPreparingVideoId(video.id);
      const supported = await Linking.canOpenURL(video.url);
      if (supported) await Linking.openURL(video.url);
      else await Linking.openURL(`https://www.youtube.com/watch?v=${video.id}`);
    } catch {} finally {
      setPreparingVideoId(null);
    }
  };

  const renderAccordion = (items: HelpItem[], openIndex: number | null, onToggle: (i: number) => void) => (
    <View style={{ gap: 12 }}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <View
            key={item.titleKey}
            style={{
              overflow: "hidden", borderRadius: 12, borderWidth: 1,
              borderColor: BORDER_COLOR, backgroundColor: "#fff",
              shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 }, elevation: 1,
            }}
          >
            <TouchableOpacity
              onPress={() => onToggle(index)}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", padding: 16 }}
            >
              <View
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: "rgba(103,80,164,0.08)",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name={item.icon} size={20} color={BRAND_COLOR} />
              </View>
              <Text style={{ marginHorizontal: 12, flex: 1, fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY, lineHeight: 20 }}>
                {t(item.titleKey)}
              </Text>
              <View
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: isOpen ? "rgba(103,80,164,0.12)" : BG_COLOR,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={isOpen ? BRAND_COLOR : TEXT_SECONDARY}
                />
              </View>
            </TouchableOpacity>
            {isOpen && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <View style={{ height: 1, backgroundColor: BORDER_COLOR, marginBottom: 16 }} />
                <View style={{ flexDirection: "row" }}>
                  <View style={{ width: 3, borderRadius: 2, backgroundColor: BRAND_COLOR, marginRight: 12 }} />
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 24, color: TEXT_SECONDARY }}>
                    {t(item.bodyKey)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const playVideoInline = (video: VideoTutorial) => {
    setPlayingVideoId((current) => (current === video.id ? null : video.id));
  };

  const renderVideoCard = (video: VideoTutorial) => {
    const isPreparing = preparingVideoId === video.id;
    const isPlaying = playingVideoId === video.id;
    const thumbFailed = failedThumbs[video.id] === true;
    const coverUri = thumbFailed ? video.fallbackThumbnail : video.thumbnail;
    const playerWidth = SCREEN_WIDTH - 36; // 18px horizontal padding from parent scrollview

    return (
      <View
        key={video.id}
        style={{
          marginBottom: 12,
          overflow: "hidden",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: BORDER_COLOR,
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        }}
      >
        {isPlaying ? (
          <View style={{ backgroundColor: "#000" }}>
            <YoutubePlayer
              height={playerWidth * (9 / 16)}
              width={playerWidth}
              play={true}
              videoId={video.id}
              initialPlayerParams={{
                preventFullScreen: false,
                rel: false,
              }}
            />
            <TouchableOpacity
              onPress={() => setPlayingVideoId(null)}
              activeOpacity={0.7}
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor: "rgba(0,0,0,0.6)",
              }}
              accessibilityRole="button"
              accessibilityLabel="Close video"
            >
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => playVideoInline(video)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Play ${t(video.titleKey)}`}
          >
            <View
              style={{
                width: "100%",
                aspectRatio: 16 / 9,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: BRAND_COLOR,
              }}
            >
              {/* Thumbnail image */}
              <ThumbnailImage
                uri={coverUri}
                onError={() => {
                  if (!thumbFailed) setFailedThumbs((prev) => ({ ...prev, [video.id]: true }));
                }}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFillObject, { justifyContent: "center", alignItems: "center" }]}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "rgba(255,255,255,0.25)",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: "rgba(255,255,255,0.6)",
                  }}
                >
                  <Ionicons name="play" size={28} color="white" style={{ marginLeft: 4 }} />
                </View>
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: "600",
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  {t("videoTutorials.tapToPlay")}
                </Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY }}>{t(video.titleKey)}</Text>
          <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 20, color: TEXT_SECONDARY }}>
            {t(video.descriptionKey)}
          </Text>
          <TouchableOpacity
            onPress={() => openOnYouTube(video)}
            activeOpacity={0.7}
            disabled={isPreparing}
            style={{
              marginTop: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              paddingVertical: 10,
              backgroundColor: "rgba(103,80,164,0.08)",
            }}
            accessibilityRole="button"
            accessibilityState={{ disabled: isPreparing, busy: isPreparing }}
          >
            {isPreparing ? (
              <ActivityIndicator size="small" color={BRAND_COLOR} />
            ) : (
              <Ionicons name="logo-youtube" size={18} color={BRAND_COLOR} />
            )}
            <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: "600", color: BRAND_COLOR }}>
              {t("videoTutorials.watchOnYouTube")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG_COLOR }}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_COLOR} />

      <LinearGradient
        colors={[BRAND_COLOR, BRAND_LIGHT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 20, paddingBottom: 24,
          paddingTop: Math.max(insets.top, 20) + 16,
          borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "white" }}>{t("title")}</Text>
          <TouchableOpacity
            onPress={() => setShowVideosModal(true)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center",
              borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)",
              paddingHorizontal: 14, paddingVertical: 8,
            }}
          >
            <Ionicons name="videocam" size={16} color="white" />
            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "700", color: "white" }}>
              {t("videoTutorials.sectionTitle") || "Videos"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "white" }}>{t("subtitle")}</Text>
          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.8)" }}>
            {t("headerDescription")}
          </Text>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 18, paddingTop: 24,
          paddingBottom: Math.max(insets.bottom, 24) + 40,
        }}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* <SuccessModal
          visible={showCopyModal}
          onClose={() => setShowCopyModal(false)}
          title={t("copied")}
          message={`${selectedOption?.copyLabel || ""} ${t("copiedToClipboard")}`}
        /> */}

        {/* GUIDES */}
        <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center" }}>
          <View style={{ marginRight: 12, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(103,80,164,0.08)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="book" size={20} color={BRAND_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_PRIMARY }}>{t("guideTitle")}</Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: TEXT_SECONDARY }}>{t("guideSubtitle")}</Text>
          </View>
        </View>
        <View style={{ marginBottom: 32 }}>
          {renderAccordion(guides, openGuide, (index) => toggleSection(openGuide, index, setOpenGuide))}
        </View>

        {/* CONTACT SUPPORT */}
        <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center" }}>
          <View style={{ marginRight: 12, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(103,80,164,0.08)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="headset" size={20} color={BRAND_COLOR} />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_PRIMARY }}>{t("contactSupport")}</Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: TEXT_SECONDARY }}>{t("contactSubtitle")}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 32, gap: 12 }}>
          {contactOptions.map((option) => (
            <View
              key={option.key}
              style={{
                overflow: "hidden", borderRadius: 12, borderWidth: 1,
                borderColor: BORDER_COLOR, backgroundColor: "#fff",
                shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 }, elevation: 1,
              }}
            >
              <TouchableOpacity onPress={option.action} activeOpacity={0.75} style={{ padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <LinearGradient
                    colors={option.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" }}
                  >
                    <Ionicons name={option.icon} size={20} color="white" />
                  </LinearGradient>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY }}>
                      {t(`contactOptions.${option.key}.title`)}
                    </Text>
                    <Text style={{ marginTop: 4, fontSize: 12, color: TEXT_SECONDARY }}>
                      {t(`contactOptions.${option.key}.description`)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#C4C4D4" />
                </View>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text numberOfLines={1} style={{ marginRight: 12, flex: 1, fontSize: 12, fontWeight: "600", color: TEXT_PRIMARY }}>
                  {option.contactInfo}
                </Text>
                <TouchableOpacity
                  onPress={() => copyContact(option)}
                  activeOpacity={0.7}
                  style={{ flexDirection: "row", alignItems: "center", borderRadius: 6, backgroundColor: "rgba(103,80,164,0.08)", paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Ionicons name="copy-outline" size={14} color={BRAND_COLOR} />
                  <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "600", color: BRAND_COLOR }}>{t("copyButton")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center" }}>
          <View style={{ marginRight: 12, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(103,80,164,0.08)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="help-circle" size={20} color={BRAND_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_PRIMARY }}>{t("faqTitle")}</Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: TEXT_SECONDARY }}>{t("faqSubtitle")}</Text>
          </View>
        </View>
        <View style={{ marginBottom: 32 }}>
          {renderAccordion(faqs, openFaq, (index) => toggleSection(openFaq, index, setOpenFaq))}
        </View>

        {/* SUPPORT HOURS */}
        <View style={{ marginBottom: 32, borderRadius: 12, borderWidth: 1, borderColor: "rgba(103,80,164,0.15)", backgroundColor: "rgba(103,80,164,0.03)", padding: 20 }}>
          <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(103,80,164,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="time-outline" size={20} color={BRAND_COLOR} />
            </View>
            <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: "700", color: BRAND_COLOR }}>
              {t("supportHours.title")}
            </Text>
          </View>
          <Text style={{ fontSize: 14, lineHeight: 24, color: TEXT_SECONDARY }}>{t("supportHours.weekday")}</Text>
          <Text style={{ fontSize: 14, lineHeight: 24, color: TEXT_SECONDARY }}>{t("supportHours.saturday")}</Text>
          <Text style={{ fontSize: 14, lineHeight: 24, color: TEXT_SECONDARY }}>{t("supportHours.sunday")}</Text>
          <View style={{ height: 1, backgroundColor: "rgba(103,80,164,0.2)", marginVertical: 16 }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="flash-outline" size={14} color={BRAND_COLOR} />
            <Text style={{ marginLeft: 8, fontSize: 12, color: TEXT_SECONDARY }}>{t("supportHours.responseTime")}</Text>
          </View>
        </View>

        <Text style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: TEXT_SECONDARY }}>
          {t("footer")}
        </Text>
      </Animated.ScrollView>

      {/* VIDEO MODAL */}
      <Modal
        visible={showVideosModal}
        animationType="slide"
        onRequestClose={() => {
          setPlayingVideoId(null);
          setShowVideosModal(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: BG_COLOR }}>
          <StatusBar barStyle="light-content" backgroundColor={BRAND_COLOR} />
          <LinearGradient
            colors={[BRAND_COLOR, BRAND_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: 20, paddingBottom: 24,
              paddingTop: Math.max(insets.top, 20) + 16,
              borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ width: 40 }} />
              <Text style={{ fontSize: 18, fontWeight: "700", color: "white" }}>
                {t("videoTutorials.sectionTitle")}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPlayingVideoId(null);
                  setShowVideosModal(false);
                }}
                activeOpacity={0.7}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={22} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.8)" }}>
              {t("videoTutorials.sectionSubtitle")}
            </Text>
          </LinearGradient>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: Math.max(insets.bottom, 24) + 20 }}
          >
            {videoTutorials.map((video) => renderVideoCard(video))}
            <Text style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: TEXT_SECONDARY }}>
              {t("videoTutorials.fallbackNote")}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Small helper to render the thumbnail image without importing Image directly
 * at the top (kept local so the main import list stays clean).
 */
import { Image } from "react-native";
function ThumbnailImage({ uri, onError }: { uri: string; onError: () => void }) {
  return (
    <Image
      source={{ uri }}
      style={StyleSheet.absoluteFillObject}
      resizeMode="cover"
      onError={onError}
    />
  );
}