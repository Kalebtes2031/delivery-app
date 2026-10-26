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
  Modal,
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
import Toast from "react-native-toast-message";

import { updateDeliveryStatus } from "@/services/api"; 

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

  // ── State for Decline Modal ──
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [orderToDecline, setOrderToDecline] = useState<DeliveryAssignment | null>(null);
  const [isDeclining, setIsDeclining] = useState(false);

  // ── Get count for each status tab ──
  const getStatusCount = useCallback((status: string | "all") => {
    if (status === "all") {
      return allDeliveries.length;
    }
    if (status === 'failed') {
      return allDeliveries.filter((d) => isFailedDelivery(d)).length;
    }
    if (status === 'delivered') {
      return allDeliveries.filter((d) => d.status === 'delivered' && !isFailedDelivery(d)).length;
    }
    return allDeliveries.filter((d) => d.status === status).length;
  }, [allDeliveries]);

  // State to store location names
  const [locationNames, setLocationNames] = useState<Record<number, string>>({});
  // State for loading locations
  const [loadingLocations, setLoadingLocations] = useState<Record<number, boolean>>({});

  // Helper to get location name from coordinates using OpenStreetMap
  const getLocationName = useCallback(async (lat: string, lon: string, deliveryId: number) => {
    if (locationNames[deliveryId]) return; // Already fetched

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DeliveryApp/1.0 (https://your-app.com)'
        }
      });

      if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getLocationName(lat, lon, deliveryId);
      }

      const data = await response.json();

      if (data && data.display_name) {
        let locationName = data.display_name;

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

        if (locationName.length > 35) {
          const parts = data.display_name.split(',');
          locationName = parts.slice(0, 2).join(',').trim();
        }

        setLocationNames(prev => ({ ...prev, [deliveryId]: locationName }));
      } else {
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

        const latNum = parseFloat(lat).toFixed(4);
        const lonNum = parseFloat(lon).toFixed(4);
        setLocationNames(prev => ({ ...prev, [deliveryId]: `📍 ${latNum}, ${lonNum}` }));
      }
    } catch (error) {
      console.log('Error fetching location name:', error);
      const latNum = parseFloat(lat).toFixed(4);
      const lonNum = parseFloat(lon).toFixed(4);
      setLocationNames(prev => ({ ...prev, [deliveryId]: `📍 ${latNum}, ${lonNum}` }));
    }
  }, [locationNames]);

  useEffect(() => {
    if (allDeliveries.length > 0) {
      allDeliveries.forEach((delivery, index) => {
        if (delivery.customer_lat && delivery.customer_lon) {
          setTimeout(() => {
            getLocationName(
              delivery.customer_lat,
              delivery.customer_lon,
              delivery.id
            );
          }, index * 300);
        }
      });
    }
  }, [allDeliveries, getLocationName]);

  const openNavigation = (deliveryId: number, orderId: number) => {
    router.push({
      pathname: "/delivery/tracking",
      params: {
        id: deliveryId.toString(),
        order_id: orderId.toString(),
        viewOnly: "true"
      }
    });
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

  useEffect(() => {
    resetAnimation();
  }, [filter, resetAnimation]);

  const getEffectiveStatus = (delivery: DeliveryAssignment): DeliveryStatus => {
    const deliveryStatus = delivery.status?.toLowerCase?.() || 'pending';
    const orderStatus = (delivery as any)?.vendor_order_detail?.status?.toLowerCase?.() || '';

    const isOrderFailed = ['cancelled', 'rejected', 'failed'].includes(orderStatus);
    const hasFailureReason = !!(delivery as any)?.failure_reason ||
      !!(delivery as any)?.cancellation_reason ||
      !!(delivery as any)?.vendor_order_detail?.failure_reason ||
      !!(delivery as any)?.vendor_order_detail?.cancellation_reason;

    if (isOrderFailed || hasFailureReason) {
      return 'failed';
    }

    return deliveryStatus as DeliveryStatus;
  };

  const isFailedDelivery = (delivery: DeliveryAssignment): boolean => {
    return getEffectiveStatus(delivery) === 'failed';
  };

  const deliveries =
    activeTab === "all"
      ? [...allDeliveries].sort((a, b) => b.vendor_order - a.vendor_order)
      : allDeliveries
        .filter((d) => {
          if (activeTab === 'failed') {
            return isFailedDelivery(d);
          }
          if (activeTab === 'delivered') {
            return d.status === 'delivered' && !isFailedDelivery(d);
          }
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

  // ── Decline Handlers ──
  const handleDeclinePress = (item: DeliveryAssignment) => {
    setOrderToDecline(item);
    setDeclineModalVisible(true);
  };

  const confirmDecline = async () => {
    if (!orderToDecline) return;
    try {
      setIsDeclining(true);
      
      await updateDeliveryStatus(
        orderToDecline.id, 
        'declined', 
        "Declined by driver", 
        'declined'
      );
      
      // ✅ Applied translation keys
      Toast.show({
        type: "success",
        text1: t("declineSuccessTitle"),
        text2: t("declineSuccessMessage"),
      });
      
      setDeclineModalVisible(false);
      setOrderToDecline(null);
      refreshDeliveries();
    } catch (error: any) {
      console.error("Failed to decline order:", error);
      // ✅ Applied translation keys
      Toast.show({
        type: "error",
        text1: t("declineFailedTitle"),
        text2: error.response?.data?.detail || t("declineFailedMessage"),
      });
    } finally {
      setIsDeclining(false);
    }
  };

  const renderDeliveryCard = ({ item }: { item: DeliveryAssignment }) => {
    const normalizedStatus = getEffectiveStatus(item);
    const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;

    const timeAssigned = new Date(item.assigned_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateAssigned = new Date(item.assigned_at).toLocaleDateString();
    
    const company = (item as any)?.vendor_order_detail?.company;

    const companyName = isAmharic
      ? company?.name_am || company?.name || t("vendor")
      : company?.name || company?.name_am || t("vendor");
    const customerName = isAmharic
      ? (item as any)?.customer_name_am || item.customer_name || t("customer")
      : item.customer_name || (item as any)?.customer_name_am || t("customer");

    const getDeliveryAddress = () => {
      const detail = (item as any)?.vendor_order_detail;

      if (locationNames[item.id] && locationNames[item.id] !== t('locationAvailable')) {
        return locationNames[item.id];
      }

      if (item.customer_lat && item.customer_lon) {
        if (loadingLocations[item.id]) {
          return t('loadingLocation');
        }
        const lat = parseFloat(item.customer_lat).toFixed(4);
        const lon = parseFloat(item.customer_lon).toFixed(4);
        return `📍 ${lat}, ${lon}`;
      }

      if (detail?.shipping_address_text && detail.shipping_address_text !== 'Addis Ababa') {
        return detail.shipping_address_text;
      }

      if (item.company_address) {
        return item.company_address;
      }

      if (detail?.shipping_address_text) {
        return detail.shipping_address_text;
      }

      return t("customerLocation");
    };

    const canDecline = normalizedStatus === 'pending' || normalizedStatus === 'assigned';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/delivery/${item.id}`)}
        activeOpacity={0.9}
        style={styles.card}
      >
        <View style={styles.verticalLine} />

        <View style={styles.cardContent}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderIdText}>
                {t("orderNumber", { id: `${item?.vendor_order_detail?.master_order_id}-${item?.vendor_order}` })}
              </Text>
              <Text style={styles.timeText}>
                {t("assignedAt", { time: timeAssigned })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* NEW: Small Decline Button */}
              {canDecline && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent card press
                    handleDeclinePress(item);
                  }}
                  style={styles.smallDeclineBtn}
                  activeOpacity={0.7}
                >
                  {/* ✅ Applied translation key */}
                  <Text style={styles.smallDeclineText}>{t('decline')}</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                <MaterialCommunityIcons
                  name={config.icon}
                  size={14}
                  color={config.text}
                />
                <Text style={[styles.statusText, { color: config.text }]}>
                  {item.status === 'out_for_delivery' ? t('status.inTransit') :
                    item.status === 'pending' ? t('status.assigned') :
                      t(`status.${item.status}`)}
                </Text>
              </View>
            </View>
          </View>

          {/* Route Visualization */}
          <View style={styles.routeContainer}>
            <View style={styles.routeIcons}>
              <View style={[styles.dot, { backgroundColor: "#6750A4" }]} />
              <View style={styles.line} />
              {(() => {
                const hasCoords = !!(item.customer_lat && item.customer_lon);
                const isDelivered = normalizedStatus === 'delivered';
                const iconColor = isDelivered ? '#6750A4' : '#EF4444';

                return (
                  <View style={styles.locationIconWrapper}>
                    <Ionicons
                      name="location"
                      size={hasCoords ? 28 : 22}
                      color={iconColor}
                    />
                  </View>
                );
              })()}
            </View>

            <View style={styles.addressContainer}>
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>{t("pickupFrom")}</Text>
                <Text style={{ flexShrink: 1 }}>{companyName}</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {item.company_address}
                </Text>
              </View>

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
                        <Text style={styles.locationIndicatorText}>{t('tapToTrack')}</Text>
                      </View>
                    </View>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {customerName}
                    </Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {loadingLocations[item.id]
                        ? t('loadingLocation')
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
                      ? t('loadingLocation')
                      : getDeliveryAddress()}
                  </Text>
                </View>
              )}
            </View>
          </View>

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
        </Animated.View>

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
            {STATUS_TABS.map((tab) => {
              const count = getStatusCount(tab.value);
              const isActive = activeTab === tab.value;
              return (
                <TouchableOpacity
                  key={tab.value}
                  onPress={() => setActiveTab(tab.value)}
                  style={[styles.tab, isActive && styles.activeTab]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isActive && styles.activeTabText,
                    ]}
                  >
                    {t(`tabs.${tab.value}`)}
                  </Text>
                  {count > 0 && (
                    <View style={[
                      styles.badge,
                      isActive && styles.badgeActive
                    ]}>
                      <Text style={[
                        styles.badgeText,
                        isActive && styles.badgeTextActive
                      ]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

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

      {/* ── Decline Confirmation Modal ── */}
      <Modal
        visible={declineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrapper}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#DC2626" />
            </View>
            
            {/* ✅ Applied translation keys */}
            <Text style={styles.modalTitle}>{t('declineModalTitle')}</Text>
            <Text style={styles.modalMessage}>
              {t('declineModalMessage')}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeclineModalVisible(false)}
                disabled={isDeclining}
              >
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmDecline}
                disabled={isDeclining}
              >
                {isDeclining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t('yesDecline')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  welcomeText: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  titleText: { color: "#6750A4", fontSize: 20, fontWeight: "800" },
  tabsContainer: { paddingHorizontal: 20, paddingTop: 3 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeTab: { backgroundColor: "#6750A4", borderColor: "#6750A4" },
  tabText: { color: "#64748B", fontWeight: "600" },
  activeTabText: { color: "#fff" },
  badge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  badgeText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: "#fff",
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 5 },
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10
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
    borderRadius: 40,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  
  // Small Decline Button Styles
  smallDeclineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  smallDeclineText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

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

  locationIconWrapper: {
    position: 'relative',
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliverToClickable: {
    padding: 10,
    paddingLeft: 44,
    borderRadius: 12,
    marginLeft: -44,
    marginRight: -8,
    borderWidth: 1.5,
    borderColor: '#f9d4d4',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
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
    paddingTop: 10,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});