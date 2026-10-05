import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
  Linking,
  Image,
  ScrollView,
  RefreshControl,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { getDeliveryDetail, updateDeliveryStatus } from "@/services/api";
import { firebaseTracking } from "@/services/firebaseTracking";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { STATUS_CONFIG } from "@/constants/deliveryConstants";
import { useTranslation } from "react-i18next";
import SlideToConfirm from "@/components/SlideToConfirm";

// ── Helpers ────────────────────────────────────────────────────────────────
async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch("https://www.google.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

const POLL_INTERVAL = 30_000;
const ROUTE_FETCH_THRESHOLD = 0.005;
const DEFAULT_COORDS: [number, number] = [38.74, 9.03];

export default function DriverTrackingScreen() {
  const {
    MapView,
    Camera,
    MarkerView,
    ShapeSource,
    LineLayer,
    RasterSource,
    RasterLayer,
  } = MapLibreGL as any; // safe in Expo

  const { id, order_id, viewOnly } = useLocalSearchParams();
  const isViewOnly = viewOnly === "true";
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObject | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [slideLoading, setSlideLoading] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [distance, setDistance] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [isImageZoomVisible, setIsImageZoomVisible] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [mapLoading, setMapLoading] = useState(true); // overlay loading
  const [animatedPos, setAnimatedPos] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const locationSubscription =
    useRef<Location.LocationObjectSubscription | null>(null);
  const lastFetchedCoords = useRef<[number, number] | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const offlineInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const { t, i18n } = useTranslation("driverOrders");
  const isAmharic = i18n.language?.startsWith("am");
  const insets = useSafeAreaInsets();

  // ── Offline detection ────────────────────────────────────────────────────
  useEffect(() => {
    const updateConnectivity = async () => {
      const connected = await checkConnectivity();
      setIsOffline(!connected);
    };
    updateConnectivity();
    offlineInterval.current = setInterval(updateConnectivity, 5000);
    return () => clearInterval(offlineInterval.current!);
  }, []);

  // ── Map loading timeout – hide overlay after 5s max ─────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setMapLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // ── Smooth animation ─────────────────────────────────────────────────────
  const animateTo = useCallback(
    (to: { lat: number; lon: number }) => {
      const from = animatedPos || to;
      const startTime = Date.now();
      const duration = 1000;
      const step = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const lat = from.lat + (to.lat - from.lat) * progress;
        const lon = from.lon + (to.lon - from.lon) * progress;
        setAnimatedPos({ lat, lon });
        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        }
      };
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(step);
    },
    [animatedPos],
  );

  // ── Fetch OSRM route ─────────────────────────────────────────────────────
  const fetchRoute = useCallback(
    async (start: [number, number], end: [number, number]) => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes?.length) {
          const route = data.routes[0];
          setRouteGeoJSON({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
          if (route.distance != null) {
            setDistance(
              route.distance >= 1000
                ? `${(route.distance / 1000).toFixed(1)}  ${isAmharic ? "ኪሜ" : "km"}`
                : `${Math.round(route.distance)} ${isAmharic ? "ሜ" : "m"}`
            );
          }
         if (route.duration != null) {
  const mins = Math.round(route.duration / 60);
  if (mins < 1) {
    setEstimatedTime(`< 1 ${isAmharic ? "ደቂቃ" : "min"}`);
  } else if (mins < 60) {
    setEstimatedTime(`~${mins} ${isAmharic ? "ደቂቃ" : "min"}`);
  } else {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    setEstimatedTime(`~${hours} ${isAmharic ? "ሰዓት ከ" : "h"} ${m} ${isAmharic ? "ደቂቃ" : "min"}`);
  }
            setEstimatedArrival(
              new Date(Date.now() + route.duration * 1000).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              ),
            );
          }
          lastFetchedCoords.current = start;
        }
      } catch (err) {
        console.warn("Failed to fetch route:", err);
      }
    },
    [],
  );

  // ── Init tracking ────────────────────────────────────────────────────────
  const initTracking = useCallback(async () => {
    try {
      const res = await getDeliveryDetail(Number(id));
      const data = res.data;
      setDelivery(data);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: t("permissionDenied"),
          text2: t("permissionDeniedMessage"),
        });
        router.back();
        return;
      }

      const destCoords: [number, number] =
        data.customer_lat && data.customer_lon
          ? [Number(data.customer_lon), Number(data.customer_lat)]
          : DEFAULT_COORDS;

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
        },
        (location) => {
          setCurrentLocation(location);
          const driverCoords: [number, number] = [
            location.coords.longitude,
            location.coords.latitude,
          ];
          animateTo({
            lat: location.coords.latitude,
            lon: location.coords.longitude,
          });

          const prev = lastFetchedCoords.current;
          const moved =
            !prev ||
            Math.abs(driverCoords[0] - prev[0]) > ROUTE_FETCH_THRESHOLD ||
            Math.abs(driverCoords[1] - prev[1]) > ROUTE_FETCH_THRESHOLD;

          if (
            moved &&
            data.status !== "delivered" &&
            data.status !== "completed"
          ) {
            fetchRoute(driverCoords, destCoords);
          }

          if (data.tracking_id) {
            firebaseTracking.updateLocation(
              data.tracking_id,
              location.coords.latitude,
              location.coords.longitude,
              location.coords.heading,
            );
          }
        },
      );
    } catch (error) {
      console.error("Tracking init error:", error);
      Toast.show({
        type: "error",
        text1: t("errorTitle"),
        text2: t("couldNotInitializeTracking"),
      });
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router, t, animateTo, fetchRoute]);

  // ── Polling for status updates ─────────────────────────────────────────
  useEffect(() => {
    if (!delivery) return;
    if (delivery.status === "delivered" || delivery.status === "completed")
      return;

    pollTimer.current = setInterval(async () => {
      try {
        const res = await getDeliveryDetail(Number(id));
        setDelivery(res.data);
      } catch {
        // ignore
      }
    }, POLL_INTERVAL);

    return () => clearInterval(pollTimer.current!);
  }, [delivery?.status, id]);

  // ── Auto‑back on completion ───────────────────────────────────────────
  useEffect(() => {
    if (delivery?.status === "delivered" || delivery?.status === "completed") {
      const timer = setTimeout(() => router.back(), 3000);
      return () => clearTimeout(timer);
    }
  }, [delivery?.status, router]);

  // ── Initialization & cleanup ──────────────────────────────────────────
  useEffect(() => {
    initTracking();
    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [initTracking]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSlideConfirm = async () => {
    if (!delivery) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSlideLoading(true);
    try {
      await updateDeliveryStatus(delivery.id, "delivered" as any);
      if (locationSubscription.current) locationSubscription.current.remove();
      if (delivery.tracking_id)
        firebaseTracking.stopTracking(delivery.tracking_id);
      router.back();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("errorTitle"),
        text2: t("updateFailed"),
      });
    } finally {
      setSlideLoading(false);
      setIsConfirmModalVisible(false);
    }
  };

  const handleAccept = async () => {
    if (!delivery) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSlideLoading(true);
    try {
      await updateDeliveryStatus(delivery.id, "accepted" as any);
      router.back();
      setTimeout(() => router.push(`/delivery/${id}`), 300);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("errorTitle"),
        text2: t("updateFailed"),
      });
    } finally {
      setSlideLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await getDeliveryDetail(Number(id));
      setDelivery(res.data);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  const navigateToDestination = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destCoords[1]},${destCoords[0]}`;
    Linking.openURL(url);
  };

  const callCustomer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (delivery?.customer_phone) {
      Linking.openURL(`tel:${delivery.customer_phone}`);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6750A4" />
        <Text style={styles.loadingText}>{t("initializingTracking")}</Text>
      </View>
    );
  }

  const destCoords: [number, number] =
    delivery?.customer_lat && delivery?.customer_lon
      ? [Number(delivery.customer_lon), Number(delivery.customer_lat)]
      : DEFAULT_COORDS;

  const driverCoords: [number, number] = animatedPos
    ? [animatedPos.lon, animatedPos.lat]
    : currentLocation
      ? [currentLocation.coords.longitude, currentLocation.coords.latitude]
      : destCoords;

  const config =
    STATUS_CONFIG[delivery?.status || "pending"] || STATUS_CONFIG.pending;

  const customerName =
    isAmharic && delivery?.customer_name_am
      ? delivery.customer_name_am
      : delivery?.customer_name || t("customer");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Offline banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>{t("offlineMode")}</Text>
        </View>
      )}

      <View style={styles.mapContainer}>
        {/* Always render MapView; loading overlay will hide automatically */}
        <MapView
          style={styles.map}
          styleURL="https://tiles.openfreemap.org/styles/bright"
          logoEnabled={false}
          attributionEnabled={false}
          onDidFinishLoadingStyle={() => setMapLoading(false)}
          onDidFinishRenderingFrame={() => setMapLoading(false)}
        >
          <Camera
            bounds={{
              ne: [
                Math.max(driverCoords[0], destCoords[0]) + 0.005,
                Math.max(driverCoords[1], destCoords[1]) + 0.005,
              ],
              sw: [
                Math.min(driverCoords[0], destCoords[0]) - 0.005,
                Math.min(driverCoords[1], destCoords[1]) - 0.005,
              ],
              paddingLeft: 40,
              paddingRight: 40,
              paddingTop: 40,
              paddingBottom: 150 + insets.bottom,
            }}
            animationMode="flyTo"
            animationDuration={2000}
          />

          <RasterSource
            id="osm"
            tileUrlTemplates={[
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ]}
            tileSize={256}
          >
            <RasterLayer id="osmLayer" sourceID="osm" />
          </RasterSource>

          {routeGeoJSON && (
            <ShapeSource id="routeSource" shape={routeGeoJSON}>
              <LineLayer
                id="routeLayer"
                style={{
                  lineColor: "#6750A4",
                  lineWidth: 5,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </ShapeSource>
          )}

          {/* Destination marker with label */}
          {/* Destination marker – clear & prominent */}
          <MarkerView coordinate={destCoords}>
            <View style={{ alignItems: "center" }}>
              <View style={styles.destMarker}>
                <Ionicons name="location" size={32} color="#FF6B00" />
              </View>
              {/* <View style={styles.destLabel}>
                <Text style={styles.destLabelText}>{t("destination")}</Text>
              </View> */}
            </View>
          </MarkerView>

          {/* Animated driver marker */}
          <MarkerView coordinate={driverCoords}>
            <View
              style={[
                styles.driverMarker,
                {
                  transform: [
                    { rotate: `${currentLocation?.coords.heading || 0}deg` },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons
                name="truck-delivery"
                size={24}
                color="white"
              />
            </View>
          </MarkerView>
        </MapView>

        {/* Loading overlay – disappears automatically */}
        {mapLoading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#6750A4" />
            <Text style={styles.mapLoadingText}>{t("loadingMap")}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navigateButton}
          onPress={navigateToDestination}
        >
          <Ionicons name="navigate-outline" size={24} color="#6750A4" />
        </TouchableOpacity>
      </View>

      {/* Bottom sheet – unchanged (same as before) */}
      <View
        style={[
          styles.bottomSheet,
          {
            paddingBottom: 16 + insets.bottom,
            paddingTop: 8,
            paddingHorizontal: 16,
            backgroundColor: "#fff",
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6750A4"
            />
          }
        >
          {/* ... view‑only / normal mode content (same as previous code) ... */}
          {isViewOnly ? (
            <View style={styles.viewOnlyContainer}>
              <View style={styles.bottomSheetHeader}>
                <View style={styles.cleanHandle} />
                <TouchableOpacity
                  style={styles.bottomCancelButtonSmall}
                  onPress={() => router.back()}
                >
                  <Ionicons name="close-outline" size={14} color="#6750A4" />
                </TouchableOpacity>
              </View>

              <View style={styles.cleanRow}>
                <View style={styles.cleanOrder}>
                  <Text style={styles.cleanOrderLabel}>{t("orderLabel")}</Text>
                  <Text style={styles.cleanOrderNumber}>#{order_id}</Text>
                </View>
                <View
                  style={[
                    styles.premiumStatusBadge,
                    { backgroundColor: config.bg },
                  ]}
                >
                  <View
                    style={[
                      styles.premiumStatusDot,
                      { backgroundColor: config.text },
                    ]}
                  />
                  <MaterialCommunityIcons
                    name={config.icon}
                    size={11}
                    color={config.text}
                  />
                  <Text
                    style={[styles.premiumStatusText, { color: config.text }]}
                  >
                    {delivery.status === "out_for_delivery"
                      ? t("status.inTransit").toUpperCase()
                      : delivery.status === "pending"
                        ? t("status.assigned").toUpperCase()
                        : t(`status.${delivery.status}`).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cleanStats}>
                <View style={styles.cleanStat}>
                  <View style={styles.cleanStatIcon}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="#6750A4"
                    />
                  </View>
                  <Text style={[styles.cleanStatValue, { color: "#6750A4" }]}>
                    {distance || "--"}
                  </Text>
                  <Text style={styles.cleanStatLabel}>{t("distance")}</Text>
                </View>
                <View style={styles.cleanDivider} />
                <View style={styles.cleanStat}>
                  <View
                    style={[
                      styles.cleanStatIcon,
                      { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
                    ]}
                  >
                    <Ionicons name="time-outline" size={18} color="#D97706" />
                  </View>
                  <Text style={[styles.cleanStatValue, { color: "#D97706" }]}>
                    {estimatedTime || "--"}
                  </Text>
                  <Text style={styles.cleanStatLabel}>
                    {t("estimatedTime")}
                  </Text>
                </View>
              </View>

              <View style={styles.cleanCustomerRow}>
                <TouchableOpacity
                  style={styles.cleanCustomerNameCard}
                  onPress={() => {
                    if (delivery?.customer_image) {
                      setZoomImageUri(delivery.customer_image);
                      setIsImageZoomVisible(true);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.customerImageWrapper}>
                    {delivery?.customer_image ? (
                      <Image
                        source={{ uri: delivery.customer_image }}
                        style={styles.cleanCustomerImage}
                      />
                    ) : (
                      <View style={styles.cleanCustomerPlaceholder}>
                        <Ionicons name="person" size={12} color="#6750A4" />
                      </View>
                    )}
                    {delivery?.customer_image && (
                      <View style={styles.zoomIndicatorBelow}>
                        <Ionicons
                          name="expand-outline"
                          size={10}
                          color="#FFFFFF"
                        />
                      </View>
                    )}
                  </View>
                  <Text style={styles.cleanCustomerName} numberOfLines={1}>
                    {customerName}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cleanCallCard}
                  onPress={callCustomer}
                >
                  <Ionicons name="call" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              {delivery?.status === "pending" && (
                <View style={styles.acceptSlideContainer}>
                  <SlideToConfirm
                    label={t("accept")}
                    color="#2D5BD0"
                    icon="check-circle"
                    onConfirm={handleAccept}
                    isLoading={slideLoading}
                  />
                </View>
              )}
            </View>
          ) : (
            <>
              <View style={styles.orderInfo}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderTitleGroup}>
                    <Text style={styles.orderTitleText}>
                      {t("orderNumber", { id: order_id })}
                    </Text>
                    {(distance || estimatedTime) && (
                      <View style={styles.statsRow}>
                        {delivery?.status === "delivered" ||
                        delivery?.status === "completed" ? (
                          <View style={styles.statItem}>
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color="#16A34A"
                            />
                            <Text style={styles.completedText}>
                              ✅ {t("status.completed")}
                            </Text>
                          </View>
                        ) : (
                          <>
                            {distance && (
                              <View style={styles.statItem}>
                                <Ionicons
                                  name="location-outline"
                                  size={14}
                                  color="#6750A4"
                                />
                                <Text style={styles.statText}>
                                  📍 {distance}
                                </Text>
                              </View>
                            )}
                            {estimatedTime && (
                              <View style={styles.statItem}>
                                <Ionicons
                                  name="time-outline"
                                  size={14}
                                  color="#F59E0B"
                                />
                                <Text style={styles.statTimeText}>
                                  🕐 {estimatedTime}
                                </Text>
                              </View>
                            )}
                            {/* {estimatedArrival && (
                              <Text style={styles.arrivalText}>
                                {t("arrivesBy")} {estimatedArrival}
                              </Text>
                            )} */}
                          </>
                        )}
                      </View>
                    )}
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: config.bg }]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: config.text },
                      ]}
                    />
                    <MaterialCommunityIcons
                      name={config.icon}
                      size={12}
                      color={config.text}
                    />
                    <Text style={[styles.statusText, { color: config.text }]}>
                      {delivery.status === "out_for_delivery"
                        ? t("status.inTransit").toUpperCase()
                        : delivery.status === "pending"
                          ? t("status.assigned").toUpperCase()
                          : t(`status.${delivery.status}`).toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.customerRow}>
                  <TouchableOpacity
                    onPress={() => {
                      if (delivery?.customer_image) {
                        setZoomImageUri(delivery.customer_image);
                        setIsImageZoomVisible(true);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    {delivery?.customer_image ? (
                      <View style={styles.customerImageContainer}>
                        <Image
                          source={{ uri: delivery.customer_image }}
                          style={styles.customerImage}
                        />
                      </View>
                    ) : (
                      <View style={styles.customerImagePlaceholder}>
                        <Ionicons name="person" size={24} color="#64748B" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.customerName}>{customerName}</Text>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={callCustomer}
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {!isViewOnly && (
                <View style={styles.actionButtons}>
                  <SlideToConfirm
                    label={t("completeDelivery")}
                    color="#6750A4"
                    icon="check-circle"
                    onConfirm={handleSlideConfirm}
                    isLoading={slideLoading}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Confirmation modal */}
      <Modal visible={isConfirmModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("confirmDelivery")}</Text>
            <Text style={styles.modalText}>
              {t("deliveryConfirmationMessage")}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsConfirmModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSlideConfirm}
                disabled={slideLoading}
              >
                {slideLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>{t("confirm")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image zoom modal */}
      <Modal
        visible={isImageZoomVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageZoomVisible(false)}
      >
        <TouchableOpacity
          style={styles.zoomOverlay}
          activeOpacity={1}
          onPress={() => setIsImageZoomVisible(false)}
        >
          <View style={styles.zoomContainer}>
            {zoomImageUri && (
              <Image
                source={{ uri: zoomImageUri }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.zoomCloseButton}
              onPress={() => setIsImageZoomVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Styles (same as before, added mapLoadingOverlay) ───────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  mapContainer: { flex: 1, position: "relative" },
  map: { flex: 1 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,250,252,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  mapLoadingText: { marginTop: 12, color: "#6750A4", fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: { marginTop: 12, color: "#6750A4", fontWeight: "600" },
  offlineBanner: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: "#F59E0B",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 5,
  },
  offlineBannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 6,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  navigateButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 20,
    maxHeight: "50%",
  },
  orderInfo: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#6750A4",
    borderRadius: 16,
    padding: 12,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  orderTitleGroup: { gap: 10 },
  orderTitleText: { fontWeight: "bold", fontSize: 16, color: "#6750A4" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, color: "#6750A4", fontWeight: "600" },
  statTimeText: { fontSize: 12, color: "#F59E0B", fontWeight: "600" },
  completedText: { fontSize: 12, color: "#16A34A", fontWeight: "600" },
  arrivalText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusText: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  customerName: { fontSize: 18, fontWeight: "700", color: "#1E293B", flex: 1 },
  callButton: {
    backgroundColor: "#16A34A",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  customerImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#aeb1b8ff",
    overflow: "hidden",
  },
  customerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: "cover",
  },
  customerImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#aeb1b8ff",
  },
  actionButtons: { marginTop: 24, width: "100%" },
  destMarker: {
  width: 48,
  height: 48,
  backgroundColor: '#fff',
  borderRadius: 24,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 4,
  borderColor: '#FF6B00',        // bright orange
  shadowColor: '#FF6B00',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.4,
  shadowRadius: 6,
  elevation: 8,
},
destLabel: {
  backgroundColor: '#FF6B00',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 8,
  marginTop: 6,
},
destLabelText: {
  color: '#6750A4',
  fontSize: 11,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},
  driverMarker: {
    width: 40,
    height: 40,
    backgroundColor: "#6750A4",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B" },
  modalText: { fontSize: 16, color: "#64748B", marginTop: 12 },
  modalActions: { flexDirection: "row", marginTop: 24, gap: 12 },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  cancelButtonText: { color: "#64748B", fontWeight: "600" },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6750A4",
  },
  confirmButtonText: { color: "#fff", fontWeight: "600" },
  // ── View‑only styles (same) ──
  viewOnlyContainer: { paddingHorizontal: 0, paddingVertical: 2 },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
    minHeight: 24,
  },
  bottomCancelButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#6750A4",
  },
  cleanHandle: {
    width: 30,
    height: 3,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    opacity: 0.4,
    alignSelf: "center",
  },
  cleanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  cleanOrder: { flexDirection: "row", alignItems: "center", gap: 4 },
  cleanOrderLabel: {
    color: "#6750A4",
    fontSize: 15,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cleanOrderNumber: { color: "#6750A4", fontSize: 15, fontWeight: "700" },
  premiumStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  premiumStatusDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 1 },
  premiumStatusText: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cleanStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#C5AFD9",
    shadowColor: "#6750A4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cleanStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cleanStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C5AFD9",
  },
  cleanStatValue: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  cleanStatLabel: {
    color: "#9CA3AF",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cleanDivider: {
    width: 1.5,
    height: 28,
    backgroundColor: "#C5AFD9",
    opacity: 0.5,
  },
  cleanCustomerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  cleanCustomerNameCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#6750A4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cleanCustomerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: "#6750A4",
  },
  customerImageWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomIndicatorBelow: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#6750A4",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cleanCustomerPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#6750A4",
  },
  cleanCustomerName: { color: "#1F2937", fontSize: 13, fontWeight: "600" },
  cleanCallCard: {
    backgroundColor: "#16A34A",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    marginLeft: "auto",
  },
  acceptSlideContainer: { marginTop: 8, width: "100%" },
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  zoomImage: { width: "100%", height: "80%", borderRadius: 16 },
  zoomCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
});
