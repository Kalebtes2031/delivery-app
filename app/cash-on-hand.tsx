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

export default function CashOnHandScreen() {
  const router = useRouter();
  const { t } = useTranslation("deliveryHome");

  const [orders, setOrders] = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const { data } = await getCashOnHandOrders();
      const list = Array.isArray(data) ? data : (data as any)?.results || [];
      setOrders(list);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || t("cashErrorMessage"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Total cash still in the driver's hand
  const total = orders.reduce((sum, o) => {
    const amount = parseFloat((o as any)?.vendor_order_detail?.amount || "0");
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const renderItem = ({ item }: { item: DeliveryAssignment }) => {
    const amount = (item as any)?.vendor_order_detail?.amount || "0.00";
    const customerName = item.customer_name || t("customer");
    const deliveredDate = item.completed_at
      ? new Date(item.completed_at).toLocaleDateString()
      : "";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push(`/delivery/${item.id}`)}
      >
        <View style={styles.cardIcon}>
          <MaterialCommunityIcons name="cash" size={22} color="#10B981" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardOrderNumber} numberOfLines={1}>
            {t("orderNumber", { id: item.vendor_order })}
          </Text>
          <Text style={styles.cardCustomer} numberOfLines={1}>
            {customerName}
          </Text>
          <View style={styles.codRow}>
            <View style={styles.codTag}>
              <Text style={styles.codTagText}>{t("codTag")}</Text>
            </View>
            {!!deliveredDate && (
              <Text style={styles.cardDate}>
                {t("deliveredOn", { date: deliveredDate })}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{amount}</Text>
          <Text style={styles.cardCurrency}>ETB</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#6750A4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("cashTitle")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={56} color="#CBD5E1" />
          <Text style={styles.errorText}>{t("cashErrorMessage")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryText}>{t("retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        // Beautiful empty state — nothing owed to admin
        <View style={styles.emptyWrapper}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="check-decagram" size={64} color="#10B981" />
          </View>
          <Text style={styles.emptyTitle}>{t("cashAllSettledTitle")}</Text>
          <Text style={styles.emptyMessage}>{t("cashAllSettledMessage")}</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
            />
          }
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconCircle}>
                <Ionicons name="wallet-outline" size={26} color="#fff" />
              </View>
              <Text style={styles.summaryLabel}>{t("cashTotalLabel")}</Text>
              <Text style={styles.summaryValue}>
                {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <Text style={styles.summaryCurrency}> ETB</Text>
              </Text>
              <Text style={styles.summarySubtitle}>{t("cashSubtitle")}</Text>
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
    paddingBottom: 6,
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
    backgroundColor: "#fff",
    borderWidth:1,
    borderColor:"#6750A4"
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#6750A4" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },

  listContent: { padding: 20, paddingBottom: 40 },

  // Summary card
  summaryCard: {
    backgroundColor: "#6750A4",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#6750A4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  summaryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryValue: { color: "#fff", fontSize: 38, fontWeight: "900", marginTop: 4 },
  summaryCurrency: { fontSize: 20, fontWeight: "700" },
  summarySubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },

  // Order cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10B98115",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardOrderNumber: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  cardCustomer: { fontSize: 13, color: "#64748B", marginTop: 1 },
  codRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8, flexWrap: "wrap" },
  codTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codTagText: { fontSize: 10, fontWeight: "800", color: "#B45309", textTransform: "uppercase" },
  cardDate: { fontSize: 11, color: "#94A3B8" },
  cardRight: { alignItems: "flex-end", marginLeft: 8 },
  cardAmount: { fontSize: 18, fontWeight: "900", color: "#6750A4" },
  cardCurrency: { fontSize: 11, fontWeight: "700", color: "#94A3B8" },

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
    backgroundColor: "#10B98112",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: "900", color: "#1E293B", textAlign: "center" },
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
    backgroundColor: "#10B981",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
