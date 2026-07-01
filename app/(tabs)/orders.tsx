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
  Alert,
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
import { useTranslation } from "react-i18next";
// Helper to get display label for status
const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'out_for_delivery': 'In Transit',
    'pending': 'Assigned',
    'failed': 'Failed',
    'delivered': 'Completed',
  };
  return statusMap[status] || status;
};

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

  // State to store location names
  const [locationNames, setLocationNames] = useState<Record<number, string>>({});
  // ADD: State for loading locations
  const [loadingLocations, setLoadingLocations] = useState<Record<number, boolean>>({});

  // Helper to get location name from coordinates using OpenStreetMap
  const getLocationName = useCallback(async (lat: string, lon: string, deliveryId: number) => {
    if (locationNames[deliveryId]) return; // Already fetched

    try {
      // Use OpenStreetMap Nominatim API (FREE, no API key required)
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DeliveryApp/1.0 (https://your-app.com)' // Required by OSM
        }
      });

      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        // Wait 1 second and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getLocationName(lat, lon, deliveryId);
      }

      const data = await response.json();

      if (data && data.display_name) {
        // Extract the best location name
        let locationName = data.display_name;

        // Try to get just the city/neighborhood for cleaner display
        if (data.address) {
          const city = data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.suburb ||
            data.address.neighbourhood;
          if (city) {
            locationName = city;
          }
        }

        // If still too long, shorten
        if (locationName.length > 35) {
          const parts = data.display_name.split(',');
          locationName = parts.slice(0, 2).join(',').trim();
        }

        setLocationNames(prev => ({ ...prev, [deliveryId]: locationName }));
      } else {
        // If no display_name, try to get from address object
        if (data && data.address) {
          const addr = data.address;
          const parts = [];
          if (addr.road) parts.push(addr.road);
          if (addr.suburb) parts.push(addr.suburb);
          if (addr.city) parts.push(addr.city);
          if (parts.length > 0) {
            setLocationNames(prev => ({ ...prev, [deliveryId]: parts.join(', ') }));
            return;
          }
        }

        // Fallback: show formatted coordinates
        const latNum = parseFloat(lat).toFixed(4);
        const lonNum = parseFloat(lon).toFixed(4);
        setLocationNames(prev => ({ ...prev, [deliveryId]: `📍 ${latNum}, ${lonNum}` }));
      }
    } catch (error) {
      console.log('Error fetching location name:', error);
      // Show formatted coordinates as fallback
      const latNum = parseFloat(lat).toFixed(4);
      const lonNum = parseFloat(lon).toFixed(4);
      setLocationNames(prev => ({ ...prev, [deliveryId]: `📍 ${latNum}, ${lonNum}` }));
    }
  }, [locationNames]);

  // Fetch location names when deliveries load with throttling
  useEffect(() => {
    if (allDeliveries.length > 0) {
      allDeliveries.forEach((delivery, index) => {
        if (delivery.customer_lat && delivery.customer_lon) {
          // Add delay between requests to avoid rate limiting
          setTimeout(() => {
            getLocationName(
              delivery.customer_lat,
              delivery.customer_lon,
              delivery.id
            );
          }, index * 300); // 300ms between requests
        }
      });
    }
  }, [allDeliveries, getLocationName]);

  // Navigation helper - opens in-app tracking map with customer location (view-only)
  const openNavigation = (deliveryId: number, orderId: number) => {
    router.push({
      pathname: "/delivery/tracking",
      params: {
        id: deliveryId.toString(),
        order_id: orderId.toString(),
        viewOnly: "true" // ADDED: Tells tracking screen to hide complete button
      }
    });
  };

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
  /**
   * Get the effective display status of a delivery.
   * This centralizes the logic for determining what status to show.
   * 
   * Why: A delivery's display status might differ from its actual status
   * when the associated order is cancelled/rejected/failed.
   */
  const getEffectiveStatus = (delivery: DeliveryAssignment): DeliveryStatus => {
    const deliveryStatus = delivery.status?.toLowerCase?.() || 'pending';
    const orderStatus = (delivery as any)?.vendor_order_detail?.status?.toLowerCase?.() || '';
    
    // Check if the order is in a failed state
    const isOrderFailed = ['cancelled', 'rejected', 'failed'].includes(orderStatus);
    const hasFailureReason = !!(delivery as any)?.failure_reason || 
                            !!(delivery as any)?.cancellation_reason ||
                            !!(delivery as any)?.vendor_order_detail?.failure_reason ||
                            !!(delivery as any)?.vendor_order_detail?.cancellation_reason;
    
    // If order is failed or has failure reason, show as failed
    if (isOrderFailed || hasFailureReason) {
      return 'failed';
    }
    
    // Otherwise return the actual delivery status
    return deliveryStatus as DeliveryStatus;
  };

  /**
   * Check if a delivery should be considered "failed" for filtering purposes.
   */
  const isFailedDelivery = (delivery: DeliveryAssignment): boolean => {
    return getEffectiveStatus(delivery) === 'failed';
  };

  // Derive filtered + sorted deliveries from context
  const deliveries =
    activeTab === "all"
      ? [...allDeliveries].sort((a, b) => b.vendor_order - a.vendor_order)
      : allDeliveries
        .filter((d) => {
          // For "failed" tab, show failed deliveries
          if (activeTab === 'failed') {
            return isFailedDelivery(d);
          }
          // For "delivered" tab, exclude failed deliveries
          if (activeTab === 'delivered') {
            return d.status === 'delivered' && !isFailedDelivery(d);
          }
          // For all other tabs, filter by status
          return d.status === activeTab;
        })
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
    // Get the effective display status using the centralized helper
    const normalizedStatus = getEffectiveStatus(item);
    
    const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;

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

    // ✅ Function to get the best available address
    const getDeliveryAddress = () => {
      const detail = (item as any)?.vendor_order_detail;

      // 1. Try API result FIRST (from latitude/longitude - MOST ACCURATE)
      if (locationNames[item.id] && locationNames[item.id] !== '📍 Location available') {
        return locationNames[item.id];
      }

      // 2. If coordinates exist but API failed or loading, show formatted coordinates
      if (item.customer_lat && item.customer_lon) {
        // If loading, show loading message
        if (loadingLocations[item.id]) {
          return "Loading location...";
        }
        // Otherwise show formatted coordinates
        const lat = parseFloat(item.customer_lat).toFixed(4);
        const lon = parseFloat(item.customer_lon).toFixed(4);
        return `📍 ${lat}, ${lon}`;
      }

      // 3. Try shipping_address_text (if API didn't return anything)
      if (detail?.shipping_address_text && detail.shipping_address_text !== 'Addis Ababa') {
        return detail.shipping_address_text;
      }

      // 4. Try company_address
      if (item.company_address) {
        return item.company_address;
      }

      // 5. Try shipping_address_text as fallback
      if (detail?.shipping_address_text) {
        return detail.shipping_address_text;
      }

      // 6. Final fallback
      return t("customerLocation");
    };

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
                {getStatusLabel(normalizedStatus)}
              </Text>
            </View>
          </View>

          {/* Route Visualization - Combined Clickable Area */}
          <View style={styles.routeContainer}>
            <View style={styles.routeIcons}>
              <View style={[styles.dot, { backgroundColor: "#6750A4" }]} />
              <View style={styles.line} />
              {/* Location Icon - Now inside the border area */}
              {(item.customer_lat && item.customer_lon) ? (
                <View style={styles.locationIconWrapper}>
                  <Ionicons 
                    name="location" 
                    size={28} 
                    color={normalizedStatus === 'delivered' ? '#6750A4' : '#EF4444'} 
                  />
                </View>
              ) : (
                <View style={styles.locationIconWrapper}>
                  <Ionicons name="location" size={22} color="#CBD5E1" />
                </View>
              )}
            </View>

            <View style={styles.addressContainer}>
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>{t("pickupFrom")}</Text>
                <Text style={{ flexShrink: 1 }}>{companyName}</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {item.company_address}
                </Text>
              </View>

              {/* Deliver To - Combined Clickable Area (Icon + Name + Address) */}
              {(item.customer_lat && item.customer_lon && item.status === 'pending') ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    openNavigation(item.id, item.vendor_order);
                  }}
                  activeOpacity={0.7}
                  style={styles.deliverToClickable}
                >
                  <View style={styles.addressBlock}>
                    <View style={styles.locationHeaderRow}>
                      <Text style={styles.addressLabel}>{t("deliverTo")}</Text>
                      <View style={styles.locationIndicator}>
                        <Ionicons name="location-outline" size={10} color="#EF4444" />
                        <Text style={styles.locationIndicatorText}>Tap to track</Text>
                      </View>
                    </View>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {customerName}
                    </Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {loadingLocations[item.id]
                        ? 'Loading location...'
                        : getDeliveryAddress()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.addressBlock}>
                  <Text style={styles.addressLabel}>{t("deliverTo")}</Text>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {customerName}
                  </Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {loadingLocations[item.id]
                      ? 'Loading location...'
                      : getDeliveryAddress()}
                  </Text>
                </View>
              )}
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
    borderRadius: 20,
    padding: 0,
    marginBottom: 14,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  verticalLine: {
    width: 3.5,
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    borderRadius: 2,
    opacity: 0.6,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderIdText: { fontSize: 16, fontWeight: "700", color: "#6750A4", letterSpacing: -0.2 },
  timeText: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  routeContainer: { flexDirection: "row", marginBottom: 15 },
  routeIcons: {
    alignItems: "center",
    width: 52,
    marginRight: 0,
    paddingVertical: 5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, backgroundColor: "#E2E8F0", marginVertical: 4 },
  addressContainer: { flex: 1, gap: 16 },
  addressBlock: { gap: 2 },
  addressLabel: {
    fontSize: 9,
    color: "#8B7BB5",
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  companyName: { fontSize: 14, fontWeight: "600", color: "#1E293B", letterSpacing: -0.2 },
  customerName: { fontSize: 15, fontWeight: "700", color: "#0F172A", letterSpacing: -0.2 },

  // Location icon wrapper
  locationIconWrapper: {
    position: 'relative',
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ✅ Clickable Deliver To container - Light red border
  deliverToClickable: {
    padding: 10,
    paddingLeft: 44,  // More left padding to create space
    borderRadius: 12,
    marginLeft: -44,   // Pull further left to create space around icon
    marginRight: -8,
    borderWidth: 1.5,
    borderColor: '#f9d4d4',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  // Location header row with indicator
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  locationIndicatorText: {
    color: '#EF4444',
    fontSize: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  addressText: { fontSize: 12, color: "#64748B", fontWeight: "500", letterSpacing: 0.1 },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 14,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  tapHintText: { color: "#6750A4", fontWeight: "600", fontSize: 12, letterSpacing: 0.2 },
  arrowCircle: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: "#6750A4",
    shadowColor: "#6750A4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  footerAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerActionText: { color: "#6750A4", fontWeight: "700", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#6750A4",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
});
