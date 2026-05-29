import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useDelivery } from "@/context/DeliveryContext";
import type { DeliveryAssignment, DeliveryStatus } from "@/types";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import ToggleSwitch from "@/components/ToggleButton";
import { STATUS_TABS, STATUS_CONFIG } from "@/constants/deliveryConstants";
import { useTranslation } from "react-i18next"; // 👈 added

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    deliveries: allDeliveries,
    isLoading,
    isRefreshing,
    refreshDeliveries,
  } = useDelivery();
  const { filter } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<DeliveryStatus | "all">(
    (filter as any) || "all",
  );

  const { t, i18n } = useTranslation("driverOrders");
  const isAmharic = i18n.language?.startsWith("am");

  // Derive filtered + sorted deliveries from context
  const deliveries =
    activeTab === "all"
      ? [...allDeliveries].sort((a, b) => b.vendor_order - a.vendor_order)
      : allDeliveries
          .filter((d) => d.status === activeTab)
          .sort((a, b) => b.vendor_order - a.vendor_order);

  const loading = isLoading;
  const refreshing = isRefreshing;

  useEffect(() => {
    refreshDeliveries();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (filter) {
        setActiveTab(filter as any);
        router.setParams({ filter: undefined });
      }
      refreshDeliveries();
    }, [filter]),
  );

  const onRefresh = () => {
    refreshDeliveries();
  };

  const renderDeliveryCard = ({ item }: { item: DeliveryAssignment }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    console.log(item.status);
    const timeAssigned = new Date(item.assigned_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateAssigned = new Date(item.assigned_at).toLocaleDateString();
    const dateTimeAssigned = `${dateAssigned} at ${timeAssigned}`;
    
    // Localized names with fallback
   const company =
  (item as any)?.vendor_order_detail?.company;

const companyName = isAmharic
  ? company?.name_am || company?.name || t("vendor")
  : company?.name || company?.name_am || t("vendor");
   const customerName = isAmharic
  ? (item as any)?.customer_name_am || item.customer_name || t("customer")
  : item.customer_name || (item as any)?.customer_name_am || t("customer");

    return (
      <TouchableOpacity
        onPress={() => router.push(`/delivery/${item.id}`)}
        activeOpacity={0.9}
        style={styles.card}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderIdText}>
              {t("orderNumber", { id: item.vendor_order })}
            </Text>
            <Text style={styles.timeText}>
              {t("assignedAt", { time: timeAssigned })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <MaterialCommunityIcons
              name={config.icon}
              size={14}
              color={config.text}
            />
            <Text style={[styles.statusText, { color: config.text }]}>
              {t(`status.${item.status}`)}
            </Text>
          </View>
        </View>

        {/* Route Visualization */}
        <View style={styles.routeContainer}>
          <View style={styles.routeIcons}>
            <View style={[styles.dot, { backgroundColor: "#6750A4" }]} />
            <View style={styles.line} />
            <Ionicons name="location" size={18} color="#EF4444" />
          </View>

          <View style={styles.addressContainer}>
            <View style={styles.addressBlock}>
              <Text style={styles.addressLabel}>{t("pickupFrom")}</Text>
              <Text style={{ flexShrink: 1 }}>{companyName}</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {item.company_address}
              </Text>
            </View>

            <View style={styles.addressBlock}>
              <Text style={styles.addressLabel}>{t("deliverTo")}</Text>
              <Text style={styles.customerName} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {t("customerLocation")}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Footer */}
        {/* <View style={styles.cardFooter}>
          <View style={styles.footerAction}>
            <Ionicons name="navigate-circle-outline" size={20} color="#6750A4" />
            <Text style={styles.footerActionText}>{t('viewMap')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </View> */}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          {/* <Text style={styles.welcomeText}>{t('helloUser', { name: user?.first_name || 'Driver' })}</Text> */}
          <Text style={styles.titleText}>{t("allOrders")}</Text>
        </View>
        {/* <ToggleSwitch /> */}
      </View>

      {/* Status Filter Tabs */}
      <View style={{ marginBottom: 15, backgroundColor: "white" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              onPress={() => setActiveTab(tab.value)}
              style={[styles.tab, activeTab === tab.value && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.value && styles.activeTabText,
                ]}
              >
                {t(`tabs.${tab.value}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Deliveries List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6750A4" />
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDeliveryCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6750A4"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={80}
                color="#E2E8F0"
              />
              <Text style={styles.emptyTitle}>{t("noAssignments")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("newOrdersWillAppear")}
              </Text>
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
    paddingHorizontal: 24,
    paddingVertical: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  welcomeText: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  titleText: { color: "#1E293B", fontSize: 24, fontWeight: "800" },
  tabsContainer: { paddingHorizontal: 24, paddingTop: 5 },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  activeTab: { backgroundColor: "#6750A4", borderColor: "#6750A4" },
  tabText: { color: "#64748B", fontWeight: "600" },
  activeTabText: { color: "#fff" },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  orderIdText: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  timeText: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  routeContainer: { flexDirection: "row", marginBottom: 15 },
  routeIcons: {
    alignItems: "center",
    width: 20,
    marginRight: 15,
    paddingVertical: 5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, backgroundColor: "#E2E8F0", marginVertical: 4 },
  addressContainer: { flex: 1, gap: 20 },
  addressBlock: { gap: 2 },
  addressLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  companyName: { fontSize: 15, fontWeight: "600", color: "#334155" },
  customerName: { fontSize: 15, fontWeight: "600", color: "#334155" },
  addressText: { fontSize: 13, color: "#64748B" },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerActionText: { color: "#6750A4", fontWeight: "700", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#475569",
    marginTop: 16,
  },
  emptySubtitle: { fontSize: 14, color: "#94A3B8", marginTop: 4 },
});
