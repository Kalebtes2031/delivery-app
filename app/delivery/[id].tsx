import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Linking,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import SlideToConfirm from "@/components/SlideToConfirm";
import { useDelivery } from "@/context/DeliveryContext";
import type { DeliveryStatus } from "@/types";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome6,
  Feather,
  MaterialIcons,
} from "@expo/vector-icons";
import {
  STATUS_ORDER,
  STATUS_CONFIG,
  NEXT_ACTION,
} from "@/constants/deliveryConstants";
import { useTranslation } from "react-i18next"; // 👈 added

const { width } = Dimensions.get("window");

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getDeliveryById, advanceStatus } = useDelivery();
  const [delivery, setDelivery] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const { t, i18n } = useTranslation("driverOrders");
  const isAmharic = i18n.language?.startsWith("am");
  const insets = useSafeAreaInsets();

  const vendorStatusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#FFF7ED", text: "#EA580C" },
    contacted: { bg: "#EFF6FF", text: "#2563EB" },
    confirmed: { bg: "#EFF6FF", text: "#2563EB" },
    processing: { bg: "#FAF5FF", text: "#6750A4" },
    shipped: { bg: "#F0FDF4", text: "#16A34A" },
    fulfilled: { bg: "#16A34A", text: "#FFFFFF" },
    cancelled: { bg: "#FEF2F2", text: "#DC2626" },
    failed: { bg: "#FEF2F2", text: "#DC2626" },
  };

  // Helper for localized names (same as OrdersScreen)
  const getLocalName = (
    defaultName: string | undefined,
    amField?: string | null,
    nestedObj?: { name_am?: string; name?: string } | null
  ): string => {
    if (!isAmharic) return defaultName || '';
    if (amField) return amField;
    if (nestedObj?.name_am) return nestedObj.name_am;
    return defaultName || '';
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDelivery();
    }, [id]),
  );

  const fetchDelivery = async () => {
    try {
      const data = await getDeliveryById(Number(id));
      setDelivery(data);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: t("errorTitle"),
        text2: t("couldNotLoadDelivery"),
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!delivery) return;
    const action = NEXT_ACTION[delivery.status];
    if (!action) return;

    setUpdating(true);
    try {
      const updated = await advanceStatus(delivery.id, action.next);
      setDelivery(updated);
      if (action.next === "delivered") router.back();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("errorTitle"),
        text2: error.response?.data?.error || t("updateFailed"),
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6750A4" />
      </View>
    );

  if (!delivery) return null;
  const action = NEXT_ACTION[delivery.status];

  // Distinction between terminal non-success states
  const isDeclined = delivery?.status === 'declined';
  const isExpired = delivery?.status === 'expired';
  const isOrderFailed = delivery?.status === 'failed' ||
    delivery?.vendor_order_detail?.status?.toLowerCase?.() === 'cancelled' ||
    delivery?.vendor_order_detail?.status?.toLowerCase?.() === 'rejected';

  // Effective status for index calculation:
  // - If declined or expired, the process terminated at step 0 (pending / dispatch offer)
  // - If order failed during fulfillment, terminate at final step (delivered/failed)
  const effectiveStatus = (isDeclined || isExpired)
    ? 'pending'
    : isOrderFailed
      ? 'delivered'
      : delivery.status;

  const currentIndex = STATUS_ORDER.indexOf(effectiveStatus.toLowerCase());
  const hasBottomActions = delivery.status !== "delivered" && !isDeclined && !isExpired && !isOrderFailed && Boolean(action);
  const orderDetail = delivery.vendor_order_detail;


  // console.log(delivery);
  const companyName =
    isAmharic
      ? orderDetail?.company?.name_am || delivery?.company_name || t("vendor")
      : delivery?.company_name || orderDetail?.company?.name || t("vendor");

  const customerDefault = delivery.customer_name || t('customer');
  const customerAmField = (delivery as any).customer_name_am;
  const customerNested = (delivery as any).customer;
  const customerName = getLocalName(customerDefault, customerAmField, customerNested) || customerDefault;

  // Localized subcategory name (if available)
  const subCategoryDefault = orderDetail?.company?.sub_category_name || '';
  const subCategoryAm = (orderDetail?.company as any)?.sub_category_name_am;
  const subCategoryName = isAmharic && subCategoryAm ? subCategoryAm : subCategoryDefault;

  return (
    <View style={[styles.container,
      // { paddingTop: insets.top }
    ]}>
      <StatusBar barStyle="light-content" />

      {/* --- HERO HEADER --- */}
      <View style={[styles.heroSection, { height: hasBottomActions ? 250 : 300, }]}>
        <Image
          source={require("@/assets/images/order.jpg")}
          style={styles.heroBg}
        />
        <View style={styles.heroOverlay} />
        <SafeAreaView>
          <View style={styles.topNav}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.glassCircle}
            >
              <Ionicons name="arrow-back" size={24} color="#6750A4" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.heroOrderTitle}>
                {t('orderNumber', { id: `${delivery?.vendor_order_detail?.master_order_id}-${delivery?.vendor_order}` })}
              </Text>
              {/* <Text style={styles.heroInvoiceTitle}>{orderDetail?.tax_invoice?.invoice_number}</Text> */}
            </View>
            <View></View>
          </View>

        </SafeAreaView>
        <View style={[styles.headerInfo, {
          position: "absolute", bottom: 50, left: 20,
          backgroundColor: isDeclined ? "#FEF2F2" : isExpired ? "#FFFBEB" : vendorStatusColors[orderDetail?.status]?.bg || "#FEF2F2",
          borderRadius: 20,
          paddingHorizontal: 10, paddingVertical: 4,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          zIndex: 1000,
          borderWidth: 1,
          borderColor: isDeclined ? "#FECACA" : isExpired ? "#FDE68A" : "transparent"
        }]}>
          <Text style={{
            color: isDeclined ? "#DC2626" : isExpired ? "#D97706" : vendorStatusColors[orderDetail?.status]?.text || "#DC2626",
            fontSize: 12,
            fontWeight: "bold",
            textTransform: "uppercase"
          }}>
            {isDeclined
              ? t('status.declined', 'Declined')
              : isExpired
                ? t('status.expired', 'Expired')
                : t(`orderStatus.${orderDetail?.status}`, orderDetail?.status || '')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: hasBottomActions
            ? 140 + insets.bottom
            : 20 + insets.bottom,
        }}
      >

        {/* --- STATUS PIPELINE --- */}
        <View style={styles.card}>
          <View style={styles.progressContainer}>
            {STATUS_ORDER.map((status, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isFuture = index > currentIndex;
              const isDeliveredCurrent = isCurrent && status === "delivered";

              // Distinct step flags for terminal non-success states
              const isStepDeclined = isCurrent && index === 0 && isDeclined;
              const isStepExpired = isCurrent && index === 0 && isExpired;
              const isStepFailed = isDeliveredCurrent && isOrderFailed;

              return (
                <View key={status} style={styles.stepWrapper}>
                  <View style={styles.nodeZone}>
                    {index !== 0 && (
                      <View
                        style={[
                          styles.progressLine,
                          {
                            backgroundColor:
                              isCompleted ? "#16A34A" : "#E5E7EB",
                            left: "-50%",
                            right: "50%",
                          },
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.stepIndicator,
                        isCompleted && styles.indicatorCompleted,
                        isCurrent &&
                        (isStepDeclined
                          ? styles.indicatorFailed
                          : isStepExpired
                            ? styles.indicatorExpired
                            : isStepFailed
                              ? styles.indicatorFailed
                              : isDeliveredCurrent
                                ? styles.indicatorCompleted
                                : styles.indicatorCurrent),
                        isFuture && styles.indicatorFuture,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={
                          (isCompleted
                            ? "check-bold"
                            : isStepDeclined
                              ? "close-circle"
                              : isStepExpired
                                ? "clock-alert-outline"
                                : isStepFailed
                                  ? "close-circle"
                                  : STATUS_CONFIG[status]?.icon || "circle-outline") as any
                        }
                        size={isCurrent ? 16 : 12}
                        color={
                          isFuture
                            ? "#9CA3AF"
                            : (isStepDeclined || isStepExpired || isStepFailed)
                              ? "#FFFFFF"
                              : "#fff"
                        }
                      />
                      {isCurrent && (
                        <View
                          style={[
                            styles.pulseRing,
                            isStepDeclined
                              ? styles.pulseRingFailed
                              : isStepExpired
                                ? styles.pulseRingExpired
                                : isStepFailed
                                  ? styles.pulseRingFailed
                                  : isDeliveredCurrent
                                    ? styles.pulseRingCompleted
                                    : null,
                          ]}
                        />
                      )}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCurrent && {
                        color: isStepDeclined
                          ? "#DC2626"
                          : isStepExpired
                            ? "#D97706"
                            : isStepFailed
                              ? "#DC2626"
                              : isDeliveredCurrent
                                ? "#16A34A"
                                : "#F59E0B",
                        fontWeight: "900",
                      },
                    ]}
                  >
                    {isStepDeclined
                      ? t('status.declined', 'Declined')
                      : isStepExpired
                        ? t('status.expired', 'Expired')
                        : isStepFailed
                          ? t('status.failed', 'Failed')
                          : status === 'out_for_delivery'
                            ? t('status.inTransit')
                            : status === 'pending'
                              ? t('status.assigned')
                              : status === 'delivered'
                                ? t('status.completed')
                                : t(`status.${status}`)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* --- VENDOR & CUSTOMER CARDS --- */}
        <View style={styles.dualCardRow}>
          <View
            style={[
              styles.miniCard,
              { borderLeftColor: "#6750A4", borderLeftWidth: 4 },
            ]}
          >
            <Text style={styles.miniLabel}>{t('pickupFrom')}</Text>
            <Text style={styles.miniTitle} numberOfLines={1}>
              {companyName}
            </Text>
            <TouchableOpacity
              style={styles.miniAction}
            // onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${delivery.company_address}`)}
            >
              {/* <Feather name="map-pin" size={12} color="#6750A4" /> */}
              <Text style={styles.miniActionText}>
                {isAmharic ? t('store') : delivery.vendor_order_detail.company.business_type}
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.miniCard,
              {
                borderLeftColor: "#10B981",
                borderLeftWidth: 4,
                position: "relative",
              },
            ]}
          >
            <Text style={styles.miniLabel}>{t('deliverTo')}</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-start",
                alignItems: "center",
                gap: 12,
              }}
            >
              {delivery.customer_image ? (
                <Image
                  source={{ uri: delivery.customer_image }}
                  style={styles.customerImage}
                />
              ) : (
                <View style={styles.customerImage}>
                  <MaterialIcons name="person" size={24} color="#10B981" />
                </View>
              )}
              <Text style={styles.miniTitle} numberOfLines={1}>
                {customerName}
              </Text>
            </View>
            <View style={{ position: "absolute", bottom: 8, right: 8 }}>
              <TouchableOpacity
                style={[
                  styles.miniAction,
                  {
                    backgroundColor: "#13a132ff",
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                    borderRadius: 144,
                  },
                ]}
                onPress={() =>
                  Linking.openURL(`tel:${delivery.customer_phone}`)
                }
              >
                <Ionicons name="call" size={14} color="#ffffff" />
                {/* <Text style={[styles.miniActionText, { color: '#10B981'}]}></Text> */}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* --- ITEM LIST (The Core Addition) --- */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>
              {t('orderItems', { count: orderDetail?.items?.length || 0 })}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {subCategoryName}
              </Text>
            </View>
          </View>

          {orderDetail?.items?.map((item: any, index: number) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index === orderDetail.items.length - 1 && {
                  borderBottomWidth: 0,
                },
              ]}
            >
              <Image
                source={{
                  uri:
                    item.product_image ||
                    "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200&auto=format&fit=crop",
                }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {/* <Text style={styles.itemSku}>{t('sku')}: {item.sku}</Text> */}
                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemQty}>{t('qty')}: {item.qty}</Text>
                  <Text style={styles.itemPrice}>
                    {item.unit_price} {orderDetail?.tax_invoice?.currency}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* --- BILLING SUMMARY --- */}
          <View style={styles.billingSection}>
            <View style={styles.billingRow}>
              <Text style={styles.billingText}>{t('subtotal')}</Text>
              <Text style={styles.billingValue}>
                {orderDetail?.subtotal} {orderDetail?.tax_invoice?.currency}
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text style={styles.billingText}>{t('deliveryFee')}</Text>
              <Text style={styles.billingValue}>
                {orderDetail?.delivery_fee ?? delivery?.delivery_fee ?? "0.00"} {orderDetail?.tax_invoice?.currency}
              </Text>
            </View>
            <View style={[styles.billingRow, styles.totalRow]}>
              <Text style={styles.totalText}>{t('totalAmount')}</Text>
              <Text style={styles.totalValue}>
                {orderDetail?.amount} {orderDetail?.tax_invoice?.currency}
              </Text>
            </View>
          </View>
        </View>

        {/* Add extra bottom padding when no bottom actions */}
        {!hasBottomActions && <View style={{ height: insets.bottom + 20 }} />}
      </ScrollView>

      {/* --- FLOATING TRACKING BUTTON --- */}
      {["out_for_delivery", "pending"].includes(delivery.status) && (
        <TouchableOpacity
          onPress={() => {
            const isPending = delivery.status === 'pending';
            const url = isPending
              ? `/delivery/tracking?id=${delivery.id}&order_id=${delivery.vendor_order}&viewOnly=true`
              : `/delivery/tracking?id=${delivery.id}&order_id=${delivery.vendor_order}`;
            router.push(url);
          }}
          style={[styles.trackingFloatingBtn, { bottom: 120 + insets.bottom }]}
        >
          <FontAwesome6 name="route" size={18} color="#fff" />
          <Text style={styles.trackingFloatingText}>
            {delivery.status === 'pending' ? t('viewDirection') : t('trackOrder')}
          </Text>
        </TouchableOpacity>
      )}

      {/* --- BOTTOM ACTION HUB --- */}
      {hasBottomActions && (
        <View style={[styles.bottomHub, {
          paddingBottom: 20 + insets.bottom,
          paddingTop: 20
        }]}>

          {action && (
            <SlideToConfirm
              label={t(`actions.${delivery.status}`)} // translated action label
              color={action.color}
              icon={action.icon}
              onConfirm={handleStatusUpdate}
              isLoading={updating}
            />
          )}
          {/* {delivery.status === 'delivered' && (
          <TouchableOpacity
            onPress={() => router.push(`/delivery/tracking?id=${delivery.id}`)}
            style={{
              flexDirection: 'row',
              gap: 12,
              backgroundColor: '#6750A4',
              borderRadius: 120,
              padding: 20,
              alignItems: 'center',
              shadowColor: '#6750A4',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
              justifyContent: "center"
            }}
          >
            <FontAwesome6 name="route" size={18} color="#fff" />
            <Text style={styles.trackingFloatingText}>{t('trackOrder')}</Text>
          </TouchableOpacity>
        )} */}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Hero Section
  heroSection: { position: "relative" },
  heroBg: { width: "100%", height: "100%", position: "absolute" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    // paddingTop: 10,
  },
  glassCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6750A4",
  },
  headerInfo: { alignItems: "center" },
  heroOrderTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  heroInvoiceTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  contentScroll: {
    marginTop: -35,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    position: "relative"
  },

  // Card System
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1.2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  categoryBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: { fontSize: 10, fontWeight: "700", color: "#64748B" },

  // Dual Cards
  dualCardRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  miniCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    elevation: 2,
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    marginBottom: 4,
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  miniAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#6750A410",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  miniActionText: { fontSize: 10, fontWeight: "700", color: "#6750A4" },

  // Pipeline (The one from previous step, integrated)
  progressContainer: { flexDirection: "row", justifyContent: "space-between" },
  stepWrapper: { flex: 1, alignItems: "center" },
  nodeZone: {
    height: 32,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  progressLine: {
    position: "absolute",
    height: 3,
    width: "100%",
    top: "50%",
    marginTop: -1.5,
    zIndex: -1,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    backgroundColor: "#fff",
    zIndex: 2,
  },
  indicatorCompleted: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  indicatorCurrent: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  indicatorFailed: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  indicatorExpired: { backgroundColor: "#D97706", borderColor: "#D97706" },
  indicatorFuture: { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  pulseRing: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F59E0B",
    opacity: 0.4,
  },
  pulseRingCompleted: {
    borderColor: "#16A34A",
  },
  pulseRingFailed: {
    borderColor: "#DC2626",
  },
  pulseRingExpired: {
    borderColor: "#D97706",
  },
  stepLabel: {
    fontSize: 8,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center"
  },

  // Item List
  itemRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  itemInfo: { flex: 1, justifyContent: "center" },
  itemTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  itemSku: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  itemPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  itemQty: { fontSize: 12, fontWeight: "800", color: "#6750A4" },
  itemPrice: { fontSize: 13, fontWeight: "700", color: "#475569" },

  // Billing
  billingSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  billingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  billingText: { fontSize: 13, color: "#64748B" },
  billingValue: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  totalRow: { marginTop: 4, paddingTop: 10 },
  totalText: { fontSize: 16, fontWeight: "900", color: "#1E293B" },
  totalValue: { fontSize: 18, fontWeight: "900", color: "#6750A4" },

  // Tracking Floating
  trackingFloatingBtn: {
    position: "absolute",
    bottom: 120,
    right: 20,
    backgroundColor: "#6750A4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 5,
    shadowColor: "#6750A4",
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  trackingFloatingText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Bottom Hub
  bottomHub: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 118,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  customerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
});