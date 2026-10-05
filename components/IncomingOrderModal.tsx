import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapLibreGL from '@maplibre/maplibre-react-native';
import type { DeliveryAssignment } from '@/types';
import { fetchOSRMRoute, RouteResult, Coordinate } from '@/services/routingService';

const {
  MapView,
  Camera,
  MarkerView,
  ShapeSource,
  LineLayer,
  RasterSource,
  RasterLayer,
} = MapLibreGL as any;

const { width, height } = Dimensions.get('window');

interface IncomingOrderModalProps {
  delivery: DeliveryAssignment | null;
  visible: boolean;
  hasActiveDeliveries?: boolean;
  onAccept: (id: number) => Promise<void>;
  onDecline: (id: number, reason?: string, action?: 'declined' | 'expired') => Promise<void>;
  onClose?: () => void;
}

const TOTAL_WAIT_SECONDS = 120;

export default function IncomingOrderModal({
  delivery,
  visible,
  hasActiveDeliveries = false,
  onAccept,
  onDecline,
  onClose,
}: IncomingOrderModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_WAIT_SECONDS);
  const [loadingAction, setLoadingAction] = useState<'accept' | 'decline' | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [driverCoord, setDriverCoord] = useState<Coordinate | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(1)).current;
  const handledRef = useRef<Record<number, boolean>>({});

  // Reset dismissal whenever a different delivery offer arrives
  useEffect(() => {
    setIsDismissed(false);
  }, [delivery?.id]);

  // ── Calculate Route & Real Road Distance ──────────────────────────────────
  useEffect(() => {
    if (!visible || !delivery) {
      setRouteInfo(null);
      setShowMapPreview(false);
      return;
    }

    let isMounted = true;
    setLoadingRoute(true);

    const computeRoute = async () => {
      let driverLocation: Coordinate | null = null;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          driverLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        }
      } catch {
        // Fallback to last known coords from assignment if available
        if (delivery.last_lat && delivery.last_lon) {
          driverLocation = {
            latitude: Number(delivery.last_lat),
            longitude: Number(delivery.last_lon),
          };
        }
      }

      if (driverLocation && isMounted) {
        setDriverCoord(driverLocation);
      }

      // Store coordinates
      const storeLat = delivery.company_lat
        ? Number(delivery.company_lat)
        : delivery.vendor_order_detail?.company?.latitude
          ? Number(delivery.vendor_order_detail.company.latitude)
          : null;
      const storeLon = delivery.company_lon
        ? Number(delivery.company_lon)
        : delivery.vendor_order_detail?.company?.longitude
          ? Number(delivery.vendor_order_detail.company.longitude)
          : null;

      // Customer coordinates
      const custLat = delivery.customer_lat ? Number(delivery.customer_lat) : null;
      const custLon = delivery.customer_lon ? Number(delivery.customer_lon) : null;

      const waypoints: Coordinate[] = [];
      if (driverLocation) {
        waypoints.push(driverLocation);
      }
      if (storeLat != null && storeLon != null) {
        waypoints.push({ latitude: storeLat, longitude: storeLon });
      }
      if (custLat != null && custLon != null) {
        waypoints.push({ latitude: custLat, longitude: custLon });
      }

      if (waypoints.length >= 2) {
        const result = await fetchOSRMRoute(waypoints, true);
        if (isMounted) {
          setRouteInfo(result);
        }
      }
      if (isMounted) {
        setLoadingRoute(false);
      }
    };

    computeRoute();

    return () => {
      isMounted = false;
    };
  }, [visible, delivery?.id]);

  // ── Expiration & Countdown Logic ──────────────────────────────────────────
  useEffect(() => {
    if (!visible || !delivery) {
      setSecondsLeft(TOTAL_WAIT_SECONDS);
      progressAnim.setValue(1);
      return;
    }

    const deliveryId = delivery.id;
    if (handledRef.current[deliveryId]) {
      return;
    }

    const latestAttempt = (delivery as any).attempts?.[0];
    const expiryTimestamp = delivery.expires_at || latestAttempt?.expires_at;
    const hasExpiry = hasActiveDeliveries || !!expiryTimestamp;

    if (!hasExpiry) {
      return;
    }

    let initialRemaining = TOTAL_WAIT_SECONDS;
    if (expiryTimestamp) {
      const expTime = new Date(expiryTimestamp).getTime();
      initialRemaining = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
    } else if (delivery.assigned_at) {
      const assignedTime = new Date(delivery.assigned_at).getTime();
      const elapsed = Math.floor((Date.now() - assignedTime) / 1000);
      initialRemaining = Math.max(0, Math.min(TOTAL_WAIT_SECONDS, TOTAL_WAIT_SECONDS - elapsed));
    }
    setSecondsLeft(initialRemaining);

    if (initialRemaining <= 0) {
      handledRef.current[deliveryId] = true;
      onDecline(deliveryId);
      return;
    }

    progressAnim.setValue(initialRemaining / TOTAL_WAIT_SECONDS);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: initialRemaining * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          if (!handledRef.current[deliveryId]) {
            handledRef.current[deliveryId] = true;
            onDecline(deliveryId, 'Offer expired - no response within 120s (in-transit)', 'expired');
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, delivery?.id]);

  const handleAccept = async () => {
    if (!delivery || loadingAction) return;
    handledRef.current[delivery.id] = true;
    setLoadingAction('accept');
    try {
      await onAccept(delivery.id);
      setShowMapPreview(false);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecline = async () => {
    if (!delivery || loadingAction) return;
    handledRef.current[delivery.id] = true;
    setLoadingAction('decline');
    try {
      await onDecline(delivery.id, 'Declined by driver', 'declined');
      setShowMapPreview(false);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClose = () => {
    setIsDismissed(true);
    setShowMapPreview(false);
    if (onClose) {
      onClose();
    }
  };

  if (!visible || !delivery || isDismissed) return null;

  const orderNum = delivery.order_number || `Order #${delivery.vendor_order}`;
  const companyName = delivery.company_name || delivery.vendor_order_detail?.company?.name || 'Store';
  const customerName = delivery.customer_name || 'Customer';
  const earning = delivery.driver_earning || delivery.vendor_order_detail?.delivery_fee || '0.00';

  // Customer neighborhood / formatted address
  const customerLocationName =
    delivery.customer_neighborhood ||
    delivery.customer_address ||
    delivery.customer_sub_city ||
    (delivery.customer_city ? `${delivery.customer_city}, Ethiopia` : 'Addis Ababa');

  const latestAttempt = (delivery as any)?.attempts?.[0];
  const expiryTimestamp = delivery?.expires_at || latestAttempt?.expires_at;
  const hasExpiry = hasActiveDeliveries || !!expiryTimestamp;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Coordinates for Map & Dynamic Bounds
  const storeCoord: [number, number] = [
    Number(delivery.company_lon || delivery.vendor_order_detail?.company?.longitude || 38.75),
    Number(delivery.company_lat || delivery.vendor_order_detail?.company?.latitude || 9.02),
  ];
  const destCoord: [number, number] = [
    Number(delivery.customer_lon || 38.76),
    Number(delivery.customer_lat || 9.03),
  ];
  const driverPos: [number, number] = driverCoord
    ? [driverCoord.longitude, driverCoord.latitude]
    : storeCoord;

  const allLons = [storeCoord[0], destCoord[0]];
  const allLats = [storeCoord[1], destCoord[1]];
  if (driverCoord) {
    allLons.push(driverCoord.longitude);
    allLats.push(driverCoord.latitude);
  }
  const minLon = Math.min(...allLons);
  const maxLon = Math.max(...allLons);
  const minLat = Math.min(...allLats);
  const maxLat = Math.max(...allLats);
  const lonDelta = Math.max(maxLon - minLon, 0.008);
  const latDelta = Math.max(maxLat - minLat, 0.008);

  const routeGeoJSON = routeInfo?.geometry
    ? {
      type: 'Feature',
      properties: {},
      geometry: routeInfo.geometry,
    }
    : null;

  return (
    <Modal visible={visible && !isDismissed} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Progress bar at top (only shown for expiring offers) */}
          {hasExpiry && (
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressWidth,
                    backgroundColor: secondsLeft < 30 ? '#EF4444' : '#6750A4',
                  },
                ]}
              />
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              {hasActiveDeliveries ? (
                <View style={[styles.badge, styles.onTheWayBadge]}>
                  <Text style={styles.onTheWayBadgeText}> Nearby On-The-Way Order</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.newOfferBadge]}>
                  <Text style={styles.newOfferBadgeText}> New Order Assigned</Text>
                </View>
              )}

              <View style={styles.headerRightActions}>
                {hasExpiry && (
                  <View style={[styles.timerPill, secondsLeft < 30 && styles.timerPillUrgent]}>
                    <Feather name="clock" size={12} color={secondsLeft < 30 ? '#DC2626' : '#6750A4'} />
                    <Text style={[styles.timerText, secondsLeft < 30 && styles.timerTextUrgent]}>
                      {secondsLeft >= 60
                        ? `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`
                        : `${secondsLeft}s`}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.orderTitle}>{orderNum}</Text>
          </View>

          {/* Metrics Row: Payout + Driving Distance */}
          <View style={styles.metricsContainer}>
            <View style={styles.earningBox}>
              <View>
                <Text style={styles.earningLabel}>Estimated Payout</Text>
                <Text style={styles.earningValue}>{earning} ETB</Text>
              </View>
              {/* <View style={styles.earningIconWrapper}>
                <MaterialCommunityIcons name="cash-multiple" size={24} color="#16A34A" />
              </View> */}
            </View>

            <View style={styles.distanceBox}>
              <View>
                <Text style={styles.distanceLabel}>Route Distance</Text>
                {loadingRoute ? (
                  <ActivityIndicator size="small" color="#6750A4" style={{ marginTop: 2 }} />
                ) : (
                  <Text style={styles.distanceValue}>
                    {routeInfo ? `${routeInfo.distanceKm} km` : 'Calculating...'}
                    {routeInfo?.durationMinutes ? ` (${routeInfo.durationMinutes}m)` : ''}
                  </Text>
                )}
              </View>
              {/* <View style={styles.distanceIconWrapper}>
                <MaterialCommunityIcons name="map-marker-distance" size={24} color="#6750A4" />
              </View> */}
            </View>
          </View>

          {/* Route details */}
          <View style={styles.routeContainer}>
            {/* Pickup */}
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: '#6750A4' }]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Pick up at</Text>
                <Text style={styles.routeName} numberOfLines={1}>
                  {companyName}
                </Text>
                {delivery.company_address ? (
                  <Text style={styles.routeSub} numberOfLines={1}>
                    {delivery.company_address}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Connecting line */}
            <View style={styles.routeLine} />

            {/* Dropoff */}
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Deliver to</Text>
                <Text style={styles.routeName} numberOfLines={1}>
                  {customerName}
                </Text>
                {/* Real Customer Location Name */}
                <View style={styles.locationBadgeRow}>
                  <Ionicons name="location-sharp" size={13} color="#EA580C" />
                  <Text style={styles.locationNameText} numberOfLines={2}>
                    {customerLocationName}
                  </Text>
                </View>
                {delivery.customer_phone ? (
                  <Text style={styles.routeSub}>📞 {delivery.customer_phone}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Interactive Route Preview Button */}
          <TouchableOpacity
            style={styles.previewRouteBtn}
            onPress={() => setShowMapPreview(true)}
            activeOpacity={0.8}
          >
            <View style={styles.previewRouteContent}>
              <Ionicons name="map-outline" size={16} color="#6750A4" />
              <Text style={styles.previewRouteText}>Preview Route on Map</Text>
            </View>
            <Feather name="chevron-right" size={15} color="#6750A4" />
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              disabled={loadingAction !== null}
              activeOpacity={0.7}
            >
              {loadingAction === 'decline' ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.declineButtonText}>Decline</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              disabled={loadingAction !== null}
              activeOpacity={0.85}
            >
              {loadingAction === 'accept' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.acceptContent}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept Order</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>

      {/* ── Interactive Map Preview Sub-Modal (Matching Tracking Page Style) ── */}
      <Modal visible={showMapPreview} animationType="slide" transparent={false}>
        <View style={styles.mapModalContainer}>
          <StatusBar barStyle="dark-content" />

          {/* Full Screen Map */}
          <MapView
            style={StyleSheet.absoluteFillObject}
            styleURL="https://tiles.openfreemap.org/styles/bright"
            attributionEnabled={false}
            logoEnabled={false}
          >
            <Camera
              bounds={{
                ne: [maxLon + lonDelta * 0.25, maxLat + latDelta * 0.25],
                sw: [minLon - lonDelta * 0.25, minLat - latDelta * 0.25],
                paddingLeft: 40,
                paddingRight: 40,
                paddingTop: 80,
                paddingBottom: 280,
              }}
              animationMode="flyTo"
              animationDuration={1500}
            />

            <RasterSource
              id="osm"
              tileUrlTemplates={['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png']}
              tileSize={256}
            >
              <RasterLayer id="osmLayer" sourceID="osm" />
            </RasterSource>

            {routeGeoJSON && (
              <ShapeSource id="previewRouteSource" shape={routeGeoJSON}>
                <LineLayer
                  id="previewRouteLayer"
                  style={{
                    lineColor: '#6750A4',
                    lineWidth: 5,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </ShapeSource>
            )}

            {/* Destination Marker (Prominent orange marker identical to tracking page) */}
            <MarkerView coordinate={destCoord}>
              <View style={{ alignItems: 'center' }}>
                <View style={styles.destMarker}>
                  <Ionicons name="location" size={28} color="#FF6B00" />
                </View>
              </View>
            </MarkerView>

            {/* Store Pickup Marker (Purple storefront marker) */}
            <MarkerView coordinate={storeCoord}>
              <View style={{ alignItems: 'center' }}>
                <View style={styles.storeMarker}>
                  <Ionicons name="storefront" size={22} color="#6750A4" />
                </View>
              </View>
            </MarkerView>

            {/* Driver Marker (Animated truck identical to tracking page) */}
            {driverCoord && (
              <MarkerView coordinate={driverPos}>
                <View style={styles.driverMarker}>
                  <MaterialCommunityIcons name="truck-delivery" size={22} color="white" />
                </View>
              </MarkerView>
            )}
          </MapView>

          {/* Floating Back Button (Identical to tracking page) */}
          <TouchableOpacity
            style={[styles.floatingBackButton, { top: Math.max(insets.top + 8, 48) }]}
            onPress={() => setShowMapPreview(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>

          {/* Floating Live Countdown Badge (Top Right) */}
          {hasExpiry && (
            <View
              style={[
                styles.floatingTimerBadge,
                { top: Math.max(insets.top + 8, 48) },
                secondsLeft < 30 && styles.floatingTimerBadgeUrgent,
              ]}
            >
              <Feather
                name="clock"
                size={13}
                color={secondsLeft < 30 ? '#DC2626' : '#6750A4'}
              />
              <Text
                style={[
                  styles.floatingTimerText,
                  secondsLeft < 30 && styles.floatingTimerTextUrgent,
                ]}
              >
                {secondsLeft >= 60
                  ? `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`
                  : `${secondsLeft}s`}
              </Text>
            </View>
          )}

          {/* Premium Bottom Sheet (Identical architecture to tracking page) */}
          <View
            style={[
              styles.bottomSheet,
              { paddingBottom: Math.max(insets.bottom + 12, 24) },
            ]}
          >
            {/* Clean Handle */}
            <View style={styles.cleanHandle} />

            {/* Order Number & Status Row */}
            <View style={styles.cleanRow}>
              <View style={styles.cleanOrder}>
                <Text style={styles.cleanOrderLabel}>ORDER</Text>
                <Text style={styles.cleanOrderNumber}>{orderNum}</Text>
              </View>

              <View style={styles.premiumStatusBadge}>
                <View style={styles.premiumStatusDot} />
                <MaterialCommunityIcons
                  name={hasActiveDeliveries ? 'truck-fast' : 'bell-ring-outline'}
                  size={11}
                  color="#6750A4"
                />
                <Text style={styles.premiumStatusText}>
                  {hasActiveDeliveries ? 'ON-THE-WAY' : 'ASSIGNED'}
                </Text>
              </View>
            </View>

            {/* Clean 3-Box Stats Row */}
            <View style={styles.cleanStats}>
              <View style={styles.cleanStat}>
                <View style={styles.cleanStatIcon}>
                  <Ionicons name="location-outline" size={17} color="#6750A4" />
                </View>
                <View>
                  <Text style={[styles.cleanStatValue, { color: '#6750A4' }]}>
                    {routeInfo ? `${routeInfo.distanceKm} km` : '--'}
                  </Text>
                  <Text style={styles.cleanStatLabel}>DISTANCE</Text>
                </View>
              </View>

              <View style={styles.cleanDivider} />

              <View style={styles.cleanStat}>
                <View style={[styles.cleanStatIcon, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                  <Ionicons name="time-outline" size={17} color="#D97706" />
                </View>
                <View>
                  <Text style={[styles.cleanStatValue, { color: '#D97706' }]}>
                    {routeInfo?.durationMinutes ? `${routeInfo.durationMinutes} min` : '--'}
                  </Text>
                  <Text style={styles.cleanStatLabel}>EST. TIME</Text>
                </View>
              </View>

              <View style={styles.cleanDivider} />

              <View style={styles.cleanStat}>
                <View style={[styles.cleanStatIcon, { backgroundColor: '#DCFCE7', borderColor: '#22C55E' }]}>
                  <Ionicons name="cash-outline" size={17} color="#16A34A" />
                </View>
                <View>
                  <Text style={[styles.cleanStatValue, { color: '#16A34A' }]}>
                    {earning} ETB
                  </Text>
                  <Text style={styles.cleanStatLabel}>PAYOUT</Text>
                </View>
              </View>
            </View>

            {/* Stop-by-stop Route Summary */}
            <View style={styles.previewRouteLocationsCard}>
              <View style={styles.previewLocationItem}>
                <View style={[styles.previewLocationIcon, { backgroundColor: '#F3F0FF', borderColor: '#C5AFD9' }]}>
                  <Ionicons name="storefront" size={13} color="#6750A4" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewLocationLabel}>PICKUP FROM</Text>
                  <Text style={styles.previewLocationName} numberOfLines={1}>{companyName}</Text>
                </View>
              </View>

              <View style={styles.previewLocationConnector}>
                <View style={styles.previewConnectorLine} />
              </View>

              <View style={styles.previewLocationItem}>
                <View style={[styles.previewLocationIcon, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
                  <Ionicons name="location" size={14} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewLocationLabel}>DELIVER TO ({customerName})</Text>
                  <Text style={styles.previewLocationName} numberOfLines={1}>{customerLocationName}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.previewActionRow}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleDecline}
                disabled={loadingAction !== null}
                activeOpacity={0.7}
              >
                {loadingAction === 'decline' ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Text style={styles.declineButtonText}>Decline</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAccept}
                disabled={loadingAction !== null}
                activeOpacity={0.85}
              >
                {loadingAction === 'accept' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={styles.acceptContent}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.acceptButtonText}>Accept Order</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: Math.min(width - 32, 420),
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  onTheWayBadge: {
    backgroundColor: '#EFF6FF',
  },
  onTheWayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  newOfferBadge: {
    backgroundColor: '#FAF5FF',
  },
  newOfferBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6750A4',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
  },
  timerPillUrgent: {
    backgroundColor: '#FEE2E2',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6750A4',
  },
  timerTextUrgent: {
    color: '#DC2626',
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
  },
  earningBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  earningLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  earningValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 2,
  },
  earningIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  distanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6750A4',
  },
  distanceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6750A4',
    marginTop: 2,
  },
  distanceIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeContainer: {
    marginHorizontal: 20,
    marginVertical: 4,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginLeft: 5,
    marginVertical: 2,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  routeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  locationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  locationNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
    flex: 1,
    lineHeight: 16,
  },
  routeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  previewRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAF5FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  previewRouteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewRouteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6750A4',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  declineButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  acceptButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6750A4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // ── Map Preview Modal Styles (Matching Tracking Page) ──
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  floatingBackButton: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 15,
  },
  floatingTimerBadge: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  floatingTimerBadgeUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  floatingTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6750A4',
  },
  floatingTimerTextUrgent: {
    color: '#DC2626',
  },

  // Map Markers
  destMarker: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  storeMarker: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6750A4',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  driverMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  cleanHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    opacity: 0.6,
    alignSelf: 'center',
    marginBottom: 10,
  },
  cleanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  cleanOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cleanOrderLabel: {
    color: '#6750A4',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cleanOrderNumber: {
    color: '#6750A4',
    fontSize: 14,
    fontWeight: '800',
  },
  premiumStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(103, 80, 164, 0.15)',
  },
  premiumStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#6750A4',
  },
  premiumStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6750A4',
    letterSpacing: 0.3,
  },

  // Clean 3-Box Stats Row
  cleanStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#C5AFD9',
    elevation: 2,
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cleanStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cleanStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C5AFD9',
  },
  cleanStatValue: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cleanStatLabel: {
    color: '#9CA3AF',
    fontSize: 8.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cleanDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#C5AFD9',
    opacity: 0.5,
  },

  // Preview Locations Card
  previewRouteLocationsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  previewLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewLocationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  previewLocationLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  previewLocationName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  previewLocationConnector: {
    paddingLeft: 11,
    marginVertical: 2,
  },
  previewConnectorLine: {
    width: 2,
    height: 8,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  previewActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
