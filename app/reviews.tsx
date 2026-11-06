import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import StarRating from "@/components/StarRating";
import { getMyDeliveryReviews } from "@/services/api";
import type { DeliveryReview, DeliveryReviewsResponse } from "@/types";
import { useAppTheme } from "@/context/ThemeContext";

export default function ReviewsScreen() {
  const router = useRouter();
  const { t } = useTranslation("driverProfile");
  const { colors, isDark } = useAppTheme();

  const [data, setData] = useState<DeliveryReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setError(false);
      const res = await getMyDeliveryReviews();
      setData(res.data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, [fetchReviews]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const avg = parseFloat(data?.average_rating || "0") || 0;
  const total = data?.total_reviews ?? 0;
  const distribution = data?.distribution || {};
  const reviews = data?.reviews || [];

  const renderReview = ({ item }: { item: DeliveryReview }) => {
    const date = item.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : "";
    const initial = (item.customer_name?.[0] || "C").toUpperCase();

    return (
      <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.reviewHeader}>
          {item.customer_image ? (
            <Image source={{ uri: item.customer_image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.reviewerName, { color: colors.text }]} numberOfLines={1}>
              {item.customer_name || t("customerLabel")}
            </Text>
            <View style={styles.reviewMetaRow}>
              <StarRating rating={item.rating} size={13} gap={1} />
              {!!date && <Text style={[styles.reviewDate, { color: colors.textMuted }]}>{date}</Text>}
            </View>
          </View>
        </View>
        {!!item.comment && <Text style={[styles.reviewComment, { color: colors.text }]}>{item.comment}</Text>}
      </View>
    );
  };

  const Header = () => (
    <View>
      {/* Summary hero */}
      <View
        style={[
          styles.summaryCard,
          isDark && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <Text style={styles.summaryAverage}>{avg.toFixed(1)}</Text>
        <StarRating rating={avg} size={22} color="#FBBF24" emptyColor={isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.3)"} />
        <Text style={styles.summaryCount}>
          {total > 0 ? t("reviewsCount", { count: total }) : t("noRatingYet")}
        </Text>
      </View>

      {reviews.length > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.text }]}>{t("recentReviews")}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { borderColor: isDark ? colors.border : colors.primary }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: isDark ? colors.text : colors.primary }]}>{t("ratingsAndReviews")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={56} color={colors.textMuted} />
          <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>{t("reviewsError")}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchReviews}>
            <Text style={[styles.retryText, { color: colors.onPrimary }]}>{t("retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReview}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primarySoft }]}>
                <MaterialCommunityIcons name="star-outline" size={56} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("noReviewsTitle")}</Text>
              <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>{t("noReviewsMessage")}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#6750A4",
  },
  topBarTitle: { fontSize: 18, fontWeight: "800", color: "#6750A4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  listContent: { padding: 20, paddingBottom: 40 },

  // Summary hero
  summaryCard: {
    backgroundColor: "#6750A4",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#6750A4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  summaryAverage: { color: "#fff", fontSize: 56, fontWeight: "900", lineHeight: 60 },
  summaryCount: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600", marginTop: 10 },

  // Distribution
  distributionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  distRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  distStar: { fontSize: 13, fontWeight: "700", color: "#475569", width: 10, textAlign: "center" },
  distTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginHorizontal: 4,
  },
  distFill: { height: "100%", borderRadius: 4, backgroundColor: "#FBBF24" },
  distCount: { fontSize: 12, fontWeight: "700", color: "#94A3B8", width: 24, textAlign: "right" },

  sectionLabel: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginBottom: 12 },

  // Review card
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F1F5F9" },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6750A415",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 18, fontWeight: "800", color: "#6750A4" },
  reviewerName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  reviewMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  reviewDate: { fontSize: 11, color: "#94A3B8" },
  reviewComment: { fontSize: 14, color: "#475569", lineHeight: 20, marginTop: 12 },

  // Empty / error
  emptyWrapper: { alignItems: "center", justifyContent: "center", paddingHorizontal: 30, marginTop: 30 },
  emptyIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#6750A412",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#1E293B", textAlign: "center" },
  emptyMessage: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8, lineHeight: 21 },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#6750A4",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});