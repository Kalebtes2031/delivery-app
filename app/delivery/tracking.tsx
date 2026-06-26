import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, StatusBar, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { getDeliveryDetail, updateDeliveryStatus } from '@/services/api';
import { firebaseTracking } from '@/services/firebaseTracking';
import * as Location from 'expo-location';
import { STATUS_TABS, STATUS_CONFIG } from '@/constants/deliveryConstants';
import { useTranslation } from 'react-i18next';
import SlideToConfirm from '@/components/SlideToConfirm'; // ADDED

export default function DriverTrackingScreen() {
  const { MapView, Camera, MarkerView, ShapeSource, LineLayer, RasterSource, RasterLayer } = MapLibreGL as any;
  const { id, order_id, viewOnly } = useLocalSearchParams();
  const isViewOnly = viewOnly === "true";
  const router = useRouter();

  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [slideLoading, setSlideLoading] = useState(false);
  const [distance, setDistance] = useState<string | null>(null); // ADDED
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null); // ADDED
  // ADD: State for image zoom modal
  const [isImageZoomVisible, setIsImageZoomVisible] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);

  const locationSubscription = useRef<Location.LocationObjectSubscription | null>(null);
  const hasFetchedRoute = useRef(false);

  const { t, i18n } = useTranslation('driverOrders'); 
  const isAmharic = i18n.language?.startsWith('am');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initTracking();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        setRouteGeoJSON({
          type: 'Feature',
          properties: {},
          geometry: data.routes[0].geometry,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch route:', err);
    }
  };

  const initTracking = async () => {
    try {
      const response = await getDeliveryDetail(Number(id));
      const data = response.data;
      setDelivery(data);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionDenied'), t('permissionDeniedMessage'));
        router.back();
        return;
      }

      const destCoords: [number, number] = data.customer_lat && data.customer_lon
        ? [Number(data.customer_lon), Number(data.customer_lat)]
        : [38.74, 9.03];

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (location) => {
          setCurrentLocation(location);
          const driverCoords: [number, number] = [location.coords.longitude, location.coords.latitude];

          if (!hasFetchedRoute.current) {
            fetchRoute(driverCoords, destCoords);
            hasFetchedRoute.current = true;
          }

          if (data.tracking_id) {
            firebaseTracking.updateLocation(
              data.tracking_id,
              location.coords.latitude,
              location.coords.longitude,
              location.coords.heading
            );
          }

          //  Calculate distance and estimated time (only if not delivered) ---
          if (data.status !== 'delivered' && data.status !== 'completed') {
            const customerLat = Number(data.customer_lat);
            const customerLon = Number(data.customer_lon);
            if (customerLat && customerLon) {
              // Haversine formula to calculate distance
              const R = 6371;
              const dLat = (customerLat - location.coords.latitude) * Math.PI / 180;
              const dLon = (customerLon - location.coords.longitude) * Math.PI / 180;
              const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(location.coords.latitude * Math.PI / 180) * Math.cos(customerLat * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const dist = R * c;
              
              // Format distance
              if (dist < 1) {
                setDistance(`${Math.round(dist * 1000)}m`);
              } else {
                setDistance(`${dist.toFixed(1)}km`);
              }
              
              // Estimate time
              const avgSpeed = 30;
              const timeHours = dist / avgSpeed;
              const timeMinutes = Math.round(timeHours * 60);
              
              if (timeMinutes < 1) {
                setEstimatedTime('< 1 min');
              } else if (timeMinutes < 60) {
                setEstimatedTime(`~${timeMinutes} min`);
              } else {
                const hours = Math.floor(timeMinutes / 60);
                const mins = timeMinutes % 60;
                setEstimatedTime(`~${hours}h ${mins}m`);
              }
            }
          }
        }
      );
    } catch (error) {
      console.error('Tracking Error:', error);
      Alert.alert(t('errorTitle'), t('couldNotInitializeTracking'));
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSlideConfirm = async () => {
    if (!delivery) return;
    setSlideLoading(true);
    try {
      await updateDeliveryStatus(delivery.id, 'delivered' as any);
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (delivery.tracking_id) {
        firebaseTracking.stopTracking(delivery.tracking_id);
      }
      router.back();
    } catch (error: any) {
      Alert.alert(t('errorTitle'), t('updateFailed'));
    } finally {
      setSlideLoading(false);
      setIsConfirmModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6750A4" />
        <Text style={styles.loadingText}>{t('initializingTracking')}</Text>
      </View>
    );
  }

  const destCoords: [number, number] = delivery?.customer_lat && delivery?.customer_lon
    ? [Number(delivery.customer_lon), Number(delivery.customer_lat)]
    : [38.74, 9.03];

  const driverCoords: [number, number] = currentLocation
    ? [currentLocation.coords.longitude, currentLocation.coords.latitude]
    : destCoords;

  const config = STATUS_CONFIG[delivery?.status || 'pending'] || STATUS_CONFIG.pending;

  // Localized customer name
  const customerDefault = delivery?.customer_name || t('customer');
  const customerAmField = (delivery as any)?.customer_name_am;
  const customerNested = (delivery as any)?.customer;
  const customerName = isAmharic && (customerAmField || customerNested?.name_am)
    ? customerAmField || customerNested?.name_am
    : customerDefault;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          styleURL="https://tiles.openfreemap.org/styles/bright"
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Camera
            bounds={{
              ne: [Math.max(driverCoords[0], destCoords[0]) + 0.005, Math.max(driverCoords[1], destCoords[1]) + 0.005],
              sw: [Math.min(driverCoords[0], destCoords[0]) - 0.005, Math.min(driverCoords[1], destCoords[1]) - 0.005],
              paddingLeft: 40, 
              paddingRight: 40, 
              paddingTop: 40, 
              paddingBottom: 150 + insets.bottom
            }}
            animationMode="flyTo"
            animationDuration={2000}
          />

          <RasterSource id="osm" tileUrlTemplates={["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"]} tileSize={256}>
            <RasterLayer id="osmLayer" sourceID="osm" />
          </RasterSource>

          {routeGeoJSON && (
            <ShapeSource id="routeSource" shape={routeGeoJSON}>
              <LineLayer
                id="routeLayer"
                style={{ lineColor: '#6750A4', lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
              />
            </ShapeSource>
          )}

          <MarkerView coordinate={destCoords}>
            <View style={styles.destMarker}>
              <Ionicons name="location" size={30} color="#EF4444" />
            </View>
          </MarkerView>

          <MarkerView coordinate={driverCoords}>
            <View style={[styles.driverMarker, { transform: [{ rotate: `${currentLocation?.coords.heading || 0}deg` }] }]}>
              <MaterialCommunityIcons name="truck-delivery" size={24} color="white" />
            </View>
          </MarkerView>
        </MapView>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomSheet, { 
        paddingBottom: 16 + insets.bottom,
        paddingTop: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
      }]}>
        
        {/* ===== VIEW-ONLY MODE:  */}
        {isViewOnly ? (
          <View style={styles.viewOnlyContainer}>
            {/* Bottom Sheet Header with Cancel - X Icon Only */}
            <View style={styles.bottomSheetHeader}>
              <View style={styles.cleanHandle} />
              <TouchableOpacity style={styles.bottomCancelButton} onPress={() => router.back()}>
                <Ionicons name="close-outline" size={20} color="#6750A4" />
              </TouchableOpacity>
            </View>

            {/* Row 1: Order + Status (In One Row) - Premium Status */}
            <View style={styles.cleanRow}>
              <View style={styles.cleanOrder}>
                <Text style={styles.cleanOrderLabel}>Order</Text>
                <Text style={styles.cleanOrderNumber}>#{order_id}</Text>
              </View>
              <View style={[styles.premiumStatusBadge, { backgroundColor: config.bg }]}>
                <View style={[styles.premiumStatusDot, { backgroundColor: config.text }]} />
                <MaterialCommunityIcons name={config.icon} size={11} color={config.text} />
                <Text style={[styles.premiumStatusText, { color: config.text }]}>
                  {delivery.status === 'out_for_delivery' ? 'IN TRANSIT' : 
                   delivery.status === 'pending' ? 'ASSIGNED' : 
                   t(`status.${delivery.status}`)}
                </Text>
              </View>
            </View>

            {/* Row 2: Distance + Time  */}
            <View style={styles.cleanStats}>
              <View style={styles.cleanStat}>
                <View style={styles.cleanStatIcon}>
                  <Ionicons name="location-outline" size={18} color="#6750A4" />
                </View>
                <Text style={[styles.cleanStatValue, { color: '#6750A4' }]}>{distance || '--'}</Text>
                <Text style={styles.cleanStatLabel}>Distance</Text>
              </View>
              <View style={styles.cleanDivider} />
              <View style={styles.cleanStat}>
                <View style={[styles.cleanStatIcon, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                  <Ionicons name="time-outline" size={18} color="#D97706" />
                </View>
                <Text style={[styles.cleanStatValue, { color: '#D97706' }]}>{estimatedTime || '--'}</Text>
                <Text style={styles.cleanStatLabel}>Est. Time</Text>
              </View>
            </View>

            {/* Row 3: Customer Name + Call  */}
            <View style={styles.cleanCustomerRow}>
              {/* Customer Name - Dynamic width (fits the name) */}
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
                  <Image source={{ uri: delivery.customer_image }} style={styles.cleanCustomerImage} />
                ) : (
                  <View style={styles.cleanCustomerPlaceholder}>
                    <Ionicons name="person" size={12} color="#6750A4" />
                  </View>
                )}

                  {delivery?.customer_image && (
                    <View style={styles.zoomIndicatorBelow}>
                      <Ionicons name="expand-outline" size={10} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={styles.cleanCustomerName} numberOfLines={1}>{customerName}</Text>
              </TouchableOpacity>
              
              {/* Call Button - Icon Only (Matches Normal Mode) */}
              <TouchableOpacity
                style={styles.cleanCallCard}
                onPress={() => delivery?.customer_phone && Linking.openURL(`tel:${delivery.customer_phone}`)}
              >
                <Ionicons name="call" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ===== NORMAL MODE:  */
          <>
        <View style={styles.orderInfo}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", paddingHorizontal: 4 }}>
            <View style={{ gap: 10 }}>
              <Text style={{
                fontWeight: "bold",
                fontSize: 16,
                color: "#6750A4"
              }}>
                {t('orderNumber', { id: order_id })}
              </Text>
                  {(distance || estimatedTime) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {delivery?.status === 'delivered' || delivery?.status === 'completed' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                          <Text style={{ fontSize: 12, color: "#16A34A", fontWeight: "600" }}>✅ Completed</Text>
                        </View>
                      ) : (
                        <>
                          {distance && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="location-outline" size={14} color="#6750A4" />
                              <Text style={{ fontSize: 12, color: "#6750A4", fontWeight: "600" }}>📍 {distance}</Text>
                            </View>
                          )}
                          {estimatedTime && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name="time-outline" size={14} color="#F59E0B" />
                              <Text style={{ fontSize: 12, color: "#F59E0B", fontWeight: "600" }}>🕐 {estimatedTime}</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: config.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: config.text + '30' }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: config.text }} />
                  <MaterialCommunityIcons name={config.icon} size={12} color={config.text} />
                  <Text style={{ color: config.text, fontSize: 8, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {delivery.status === 'out_for_delivery' ? 'IN TRANSIT' : 
                     delivery.status === 'pending' ? 'ASSIGNED' : 
                     t(`status.${delivery.status}`)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", paddingHorizontal: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (delivery?.customer_image) {
                        setZoomImageUri(delivery.customer_image);
                        setIsImageZoomVisible(true);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    {delivery?.customer_image ?
                      <View style={{ height: 50, width: 50, backgroundColor: "#F1F5F9", borderRadius: 125, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#aeb1b8ff" }}>
                        <Image source={{ uri: delivery.customer_image }} style={{ height: 50, width: 50, borderRadius: 125, resizeMode: "cover" }} />
                      </View>
                    :
                      <View style={{ height: 50, width: 50, backgroundColor: "#F1F5F9", borderRadius: 125, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#aeb1b8ff" }}>
                        <Ionicons name="person" size={24} color="#64748B" />
                      </View>
                    }
                  </TouchableOpacity>
                  <Text style={styles.customerName}>{customerName}</Text>
                </View>
            <View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => delivery?.customer_phone && Linking.openURL(`tel:${delivery.customer_phone}`)}
              >
                <Ionicons name="call" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

            {!isViewOnly && (
              <View style={styles.actionButtons}>
                <SlideToConfirm
                  label={t('completeDelivery')}
                  color="#6750A4"
                  icon="check-circle"
                  onConfirm={handleSlideConfirm}
                  isLoading={slideLoading}
                />
              </View>
            )}
          </>
        )}
      </View>

      <Modal visible={isConfirmModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('confirmDelivery')}</Text>
            <Text style={styles.modalText}>{t('deliveryConfirmationMessage')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsConfirmModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleSlideConfirm} disabled={slideLoading}>
                {slideLoading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmButtonText}>{t('confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Zoom Modal */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#6750A4', fontWeight: '600' },
    backButton: { position: 'absolute', top: 50, left: 20, width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  // NEW: Header Cancel Button (Top Right)
  headerCancelButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  bottomSheet: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    paddingBottom: 24,
    elevation: 20,
  },
  orderInfo: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#6750A4',
    borderRadius: 16,
    padding: 12,
  },
  customerName: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  addressText: { fontSize: 14, color: '#64748B', marginTop: 4 },
  actionButtons: { flexDirection: 'row', marginTop: 24, gap: 12, width: '100%' },
  callButton: { paddingHorizontal: 10, height: 40, borderRadius: 116, borderWeight: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: "#16A34A" },
  callButtonText: { color: '#fff', fontWeight: '600' },
  destMarker: {
    width: 36,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  driverMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#6750A4',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  modalText: { fontSize: 16, color: '#64748B', marginTop: 12 },
  modalActions: { flexDirection: 'row', marginTop: 24, gap: 12 },
  cancelButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  cancelButtonText: { color: '#64748B', fontWeight: '600' },
  confirmButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6750A4' },
  confirmButtonText: { color: '#fff', fontWeight: '600' },

  // ===== VIEW-ONLY PREMIUM STYLES =====
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  premiumHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  premiumHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  premiumHeaderSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  premiumOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  premiumOrderLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  premiumOrderNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginLeft: 'auto',
  },
  premiumStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  premiumStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  premiumStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  premiumStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  premiumStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  premiumStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  premiumCustomerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  premiumCustomerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  premiumCustomerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  premiumCustomerPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCustomerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  premiumCustomerPhone: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  premiumCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  premiumCallText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  premiumCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  premiumCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // ===== VIEW-ONLY COMPACT STYLES =====
  viewOnlyContainer: {
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  // Bottom Sheet Header with Cancel - Center aligned
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
    minHeight: 24,
  },
  // Cancel Button - X Icon Only, White BG, Light Secondary Border
  bottomCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#C5AFD9',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  // Remove bottomCancelText - not needed (X icon only)
  // Clean Handle - Centered vertically
  cleanHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    opacity: 0.5,
    alignSelf: 'center',
  },
  cleanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  cleanOrder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cleanOrderLabel: {
    color: '#6750A4',
    fontSize: 15,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cleanOrderNumber: {
    color: '#6750A4',
    fontSize: 15,
    fontWeight: '700',
  },
  // Legacy status - kept for fallback
  cleanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
    // NEW: Container for Status + Cancel
  cleanStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

    // NEW: Status Row (Below Cancel)
  cleanStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 0,
  },
  cleanStatusText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // ===== PREMIUM STATUS BADGE STYLES - COMPACT =====
  premiumStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  premiumStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 1,
  },
  premiumStatusText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cleanStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#C5AFD9',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cleanStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cleanStatLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cleanDivider: {
    width: 1.5,
    height: 28,
    backgroundColor: '#C5AFD9',
    opacity: 0.5,
  },
  cleanCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  cleanCustomerNameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0,
    shadowColor: '#6750A4',
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
    borderColor: '#6750A4',
  },
    // Wrapper for customer image with zoom indicator below
  customerImageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Zoom indicator at bottom-right of image
  zoomIndicatorBelow: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#6750A4',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  cleanCustomerPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6750A4',
  },
  cleanCustomerName: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
  },
  cleanCallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    marginLeft: 'auto',
  },

  // Image Zoom Modal Styles
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  zoomImage: {
    width: '100%',
    height: '80%',
    borderRadius: 16,
  },
  zoomCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cleanCallText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cleanClose: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 0,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 50,
  },
  cleanCloseText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});