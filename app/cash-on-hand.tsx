import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { getCashOnHandOrders } from "@/services/api";
import type { DeliveryAssignment } from "@/types";

type TabType = "all" | "pending" | "settled";

export default function CashOnHandScreen() {
  const router = useRouter();
  const { t } = useTranslation("deliveryHome");

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [allOrders, setAllOrders] = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      // Fetch all COD orders to compute accurate counts for all tabs
      const { data } = await getCashOnHandOrders("all");
      const list = Array.isArray(data) ? data : (data as any)?.results || [];
      setAllOrders(list);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || t("cashErrorMessage"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Helper to determine if an order's MasterOrder is paid / settled with admin
  const isOrderPaid = (o: DeliveryAssignment) => {
    const detail = (o as any)?.vendor_order_detail;
    if (!detail) return false;
    const paymentStatus = (detail.payment_status || "").toString().toLowerCase();
    const masterStatus = (detail.master_status || "").toString().toLowerCase();
    return paymentStatus === "paid" || masterStatus === "paid";
  };

  // Filtered datasets
  const pendingOrders = allOrders.filter((o) => !isOrderPaid(o));
  const settledOrders = allOrders.filter((o) => isOrderPaid(o));

  const activeOrders =
    activeTab === "pending"
      ? pendingOrders
      : activeTab === "settled"
        ? settledOrders
        : allOrders;

  // Counts
  const allCount = allOrders.length;
  const pendingCount = pendingOrders.length;
  const settledCount = settledOrders.length;

  // Totals
  const sumAmount = (list: DeliveryAssignment[]) =>
    list.reduce((sum, o) => {
      const amount = parseFloat((o as any)?.vendor_order_detail?.amount || "0");
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

  const currentTabTotal = sumAmount(activeOrders);
  const pendingTotal = sumAmount(pendingOrders);
  const settledTotal = sumAmount(settledOrders);

  // Theme configuration & i18n texts based on active tab
  const getTabTheme = () => {
    if (activeTab === "pending") {
      return {
        bg: "#6750A4",
        cardBg: "#6750A4",
        label: t("totalCashOnHand", "TOTAL CASH ON HAND"),
        subtitle: t("pendingSummarySubtitle", {
          count: pendingCount,
          defaultValue: `${pendingCount} order(s) pending cash handover to admin`,
        }),
        icon: "hand-coin-outline",
      };
    }
    if (activeTab === "settled") {
      return {
        bg: "#6750A4",
        cardBg: "#6750A4",
        label: t("totalSettledCash", "TOTAL SETTLED CASH"),
        subtitle: t("settledSummarySubtitle", {
          count: settledCount,
          defaultValue: `${settledCount} order(s) cash remitted to admin`,
        }),
        icon: "check-decagram-outline",
      };
    }
    return {
      bg: "#6750A4",
      cardBg: "#6750A4",
      label: t("totalCodVolume", "TOTAL COD VOLUME"),
      subtitle: t("allSummarySubtitle", {
        pendingCount,
        pendingTotal: pendingTotal.toFixed(0),
        settledCount,
        settledTotal: settledTotal.toFixed(0),
        defaultValue: `${pendingCount} pending (${pendingTotal.toFixed(0)} ETB) • ${settledCount} settled (${settledTotal.toFixed(0)} ETB)`,
      }),
      icon: "format-list-bulleted-triangle",
    };
  };

  const currentTheme = getTabTheme();

  // Empty state configuration per active tab
  const getEmptyStateContent = () => {
    if (activeTab === "pending") {
      return {
        title: t("cashAllSettledTitle", "You're all settled!"),
        message: t(
          "cashAllSettledMessage",
          "No pending cash to hand over. Every cash-on-delivery order you delivered has been remitted to the admin."
        ),
        icon: "check-decagram" as const,
        color: "#10B981",
      };
    }
    if (activeTab === "settled") {
      return {
        title: t("noSettledTitle", "No Settled Cash Yet"),
        message: t(
          "noSettledMessage",
          "You haven't turned over any cash on delivery payments to admin yet."
        ),
        icon: "history" as const,
        color: "#64748B",
      };
    }
    return {
      title: t("noCashOrdersTitle", "No Cash Orders Found"),
      message: t(
        "noCashOrdersMessage",
        "There are no cash on delivery orders recorded for your account."
      ),
      icon: "cash-off" as const,
      color: "#94A3B8",
    };
  };

  const emptyContent = getEmptyStateContent();

  const renderItem = ({ item }: { item: DeliveryAssignment }) => {
    const amount = (item as any)?.vendor_order_detail?.amount || "0.00";
    const customerName = item.customer_name || t("customer", "Customer");
    const deliveredDate = item.completed_at
      ? new Date(item.completed_at).toLocaleDateString()
      : "";
    const isSettled = isOrderPaid(item);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push(`/delivery/${item.id}`)}
      >
        {/* Left Color Accent Bar */}
        {/* <View
          style={[
            styles.cardAccentBar,
            { backgroundColor: isSettled ? "#10B981" : "#F59E0B" },
          ]}
        /> */}

        <View
          style={[
            styles.cardIcon,
            { backgroundColor: isSettled ? "#F0FDF4" : "#FFF7ED" },
          ]}
        >
          <MaterialCommunityIcons
            name={isSettled ? "check-circle" : "cash-clock"}
            size={24}
            color={isSettled ? "#16A34A" : "#EA580C"}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardOrderNumber} numberOfLines={1}>
              {t("orderNumber", { id: `${item.vendor_order_detail.master_order_id}-${item.vendor_order}` })}
            </Text>

          </View>

          <Text style={styles.cardCustomer} numberOfLines={1}>
            {customerName}
          </Text>

          {!!deliveredDate && (
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
              <Text style={styles.cardDate}>
                {t("deliveredOn", { date: deliveredDate })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardRight}>
          {isSettled ? (
            <View style={styles.settledBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#16A34A" style={{ marginRight: 3 }} />
              <Text style={styles.settledBadgeText}>{t("badgeSettled", "SETTLED")}</Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <Ionicons name="time" size={12} color="#EA580C" style={{ marginRight: 3 }} />
              <Text style={styles.pendingBadgeText}>{t("badgeCashOnHand", "CASH ON HAND")}</Text>
            </View>
          )}
          <Text
            style={[
              styles.cardAmount,
              { color: isSettled ? "#6750A4" : "#6750A4" },
            ]}
          >
            {amount}
          </Text>
          <Text style={styles.cardCurrency}>{t("etb", "ETB")}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#6750A4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("cashTitle", "Cash on Hand")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Segmented Tabs (Order: All -> Cash on Hand -> Completed) */}
      <View style={styles.tabsContainer}>
        {/* Tab 1: All */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "all" && styles.tabButtonActiveAll]}
          onPress={() => setActiveTab("all")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
            {t("tabAll", "All")}
          </Text>
          <View style={[styles.badge, activeTab === "all" ? styles.badgeActiveAll : styles.badgeInactive]}>
            <Text style={[styles.badgeText, activeTab === "all" && styles.badgeTextActive]}>
              {allCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Tab 2: Cash on Hand */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "pending" && styles.tabButtonActivePending]}
          onPress={() => setActiveTab("pending")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
            {t("tabCashOnHand", "Cash on Hand")}
          </Text>
          <View style={[styles.badge, activeTab === "pending" ? styles.badgeActivePending : styles.badgeInactive]}>
            <Text style={[styles.badgeText, activeTab === "pending" && styles.badgeTextActive]}>
              {pendingCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Tab 3: Completed */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "settled" && styles.tabButtonActiveSettled]}
          onPress={() => setActiveTab("settled")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "settled" && styles.tabTextActive]}>
            {t("tabCompleted", "Completed")}
          </Text>
          <View style={[styles.badge, activeTab === "settled" ? styles.badgeActiveSettled : styles.badgeInactive]}>
            <Text style={[styles.badgeText, activeTab === "settled" && styles.badgeTextActive]}>
              {settledCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6750A4" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={56} color="#CBD5E1" />
          <Text style={styles.errorText}>{t("cashErrorMessage")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryText}>{t("retry", "Retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : activeOrders.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <View style={[styles.emptyIconCircle, { backgroundColor: `${emptyContent.color}15` }]}>
            <MaterialCommunityIcons name={emptyContent.icon} size={64} color={emptyContent.color} />
          </View>
          <Text style={styles.emptyTitle}>{emptyContent.title}</Text>
          <Text style={styles.emptyMessage}>{emptyContent.message}</Text>
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={currentTheme.bg}
            />
          }
          ListHeaderComponent={
            <View style={[styles.summaryCard, { backgroundColor: currentTheme.bg }]}>
              <View style={styles.summaryTopRow}>
                <View style={styles.summaryIconCircle}>
                  <MaterialCommunityIcons name={currentTheme.icon as any} size={26} color="#fff" />
                </View>
                <View style={styles.summaryBadgeChip}>
                  <Text style={styles.summaryBadgeChipText}>
                    {t("ordersCount", {
                      count: activeOrders.length,
                      defaultValue: `${activeOrders.length} ${activeOrders.length === 1 ? "Order" : "Orders"}`,
                    })}
                  </Text>
                </View>
              </View>
              <Text style={styles.summaryLabel}>{currentTheme.label}</Text>
              <Text style={styles.summaryValue}>
                {currentTabTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <Text style={styles.summaryCurrency}> {t("etb", "ETB")}</Text>
              </Text>
              {/* <Text style={styles.summarySubtitle}>{currentTheme.subtitle}</Text> */}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
    // borderBottomWidth: 1,
    // borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#6750A4",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#6750A4" },

  // Tabs Bar
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    paddingHorizontal: 16,
    gap: 10,
  },
  tabButton: {
    // flex: 1,
    flexDirection: "row",
    paddingVertical: 9,
    // paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 140,
    gap: 5,
  },
  tabButtonActiveAll: {
    backgroundColor: "#6750A4",
    paddingHorizontal: 10,
  },
  tabButtonActivePending: {
    backgroundColor: "#6750A4",
    paddingHorizontal: 10,
  },
  tabButtonActiveSettled: {
    backgroundColor: "#6750A4",
    paddingHorizontal: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  // Count Badges inside Tabs
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInactive: {
    backgroundColor: "#CBD5E1",
  },
  badgeActiveAll: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  badgeActivePending: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  badgeActiveSettled: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  badgeTextActive: {
    color: "#FFFFFF",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },

  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Summary Card
  summaryCard: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 12,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  summaryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    // marginTop:3
  },
  summaryBadgeChip: {
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  summaryBadgeChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryValue: { color: "#fff", fontSize: 36, fontWeight: "900", marginTop: 2 },
  summaryCurrency: { fontSize: 18, fontWeight: "700" },
  summarySubtitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },

  // Order cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    paddingLeft: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  cardAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardOrderNumber: { fontSize: 13, fontWeight: "800", color: "#6750A4", flex: 1 },
  cardCustomer: { fontSize: 13, color: "#64748B", marginTop: 1 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  cardDate: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },

  // Status Badges
  pendingBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3
  },
  pendingBadgeText: { fontSize: 10, fontWeight: "800", color: "#EA580C", textTransform: "uppercase" },
  settledBadge: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3
  },
  settledBadgeText: { fontSize: 10, fontWeight: "800", color: "#16A34A", textTransform: "uppercase" },

  cardRight: { alignItems: "flex-end", marginLeft: 8 },
  cardAmount: { fontSize: 17, fontWeight: "900" },
  cardCurrency: { fontSize: 11, fontWeight: "700", color: "#6750A4" },

  // Empty state
  emptyWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#1E293B", textAlign: "center" },
  emptyMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 21,
  },

  // Error state
  errorText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#6750A4",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
