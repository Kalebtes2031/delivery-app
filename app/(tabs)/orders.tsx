import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Animated,
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

  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Reset animation when component mounts or filter changes
  const resetAnimation = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useFocusEffect(
    useCallback(() => {
      resetAnimation();
    }, [resetAnimation])
  );

  // Also trigger animation when filter param changes
  useEffect(() => {
    resetAnimation();
  }, [filter, resetAnimation]);
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
        {/* Vertical Line - Left Side */}
        <View style={styles.verticalLine} />
        
        {/* Card Content */}
        <View style={styles.cardContent}>
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
                {item.status === 'out_for_delivery' ? 'In Transit' : 
                 item.status === 'pending' ? 'Assigned' : 
                 t(`status.${item.status}`)}
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

          {/* Card Footer — tap hint so users know the whole card is tappable */}
          <View style={styles.cardFooter}>
            <Text style={styles.tapHintText}>{t("viewDetails")}</Text>
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
            <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View>
          <Text style={styles.titleText}>{t("allOrders")}</Text>
        </View>
        {/* <ToggleSwitch /> */}
      </Animated.View>

      {/* Status Filter Tabs */}
      <Animated.View 
        style={{
          marginBottom: 15, 
          backgroundColor: "white",
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
      >
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
      </Animated.View>

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
                color="#6750A4"
              />
              <Text style={styles.emptyTitle}>{t("noAssignments")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("newOrdersWillAppear")}
              </Text>
            </View>
          }
        />
      )}
      </Animated.View>
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
  titleText: { color: "#6750A4", fontSize: 24, fontWeight: "800" },
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
    padding: 0,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: "row",
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  verticalLine: {
    width: 3.5,
    alignSelf: "stretch",
    backgroundColor: "#6750A4",
    borderRadius: 2,
    opacity: 0.6,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
orderIdText: { fontSize: 16, fontWeight: "700", color: "#6750A4", letterSpacing: -0.2 },
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
  addressContainer: { gap: 20 },
  addressBlock: { gap: 2 },
addressLabel: {
    fontSize: 10,
    color: "#8B7BB5",
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
},
  companyName: { fontSize: 15, fontWeight: "600", color: "#334155" },
  customerName: { fontSize: 15, fontWeight: "600", color: "#334155" },
  addressText: { fontSize: 13, color: "#64748B" },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  tapHintText: { color: "#6750A4", fontWeight: "700", fontSize: 13 },
  arrowCircle: { padding: 8, borderRadius: 24, backgroundColor: "#6750A4" },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerActionText: { color: "#6750A4", fontWeight: "700", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6750A4",
    marginTop: 16,
  },
  emptySubtitle: { fontSize: 14, color: "#8B7BB5", marginTop: 4 },
});
