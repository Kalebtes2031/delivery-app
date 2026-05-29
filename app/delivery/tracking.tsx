import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, StatusBar, Linking, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { getDeliveryDetail, updateDeliveryStatus } from '@/services/api';
import { firebaseTracking } from '@/services/firebaseTracking';
import * as Location from 'expo-location';
import { STATUS_TABS, STATUS_CONFIG } from '@/constants/deliveryConstants';
import { useTranslation } from 'react-i18next'; // 👈 added

export default function DriverTrackingScreen() {
  const { MapView, Camera, MarkerView, ShapeSource, LineLayer, RasterSource, RasterLayer } = MapLibreGL as any;
  const { id, order_id } = useLocalSearchParams();
  const router = useRouter();

  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

  const locationSubscription = useRef<Location.LocationObjectSubscription | null>(null);
  const hasFetchedRoute = useRef(false);

  const { t, i18n } = useTranslation('driverOrders'); // 👈 translation hook
  const isAmharic = i18n.language?.startsWith('am');

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

  const onConfirmComplete = async () => {
    if (!delivery) return;
    setUpdating(true);
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
      setUpdating(false);
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
              paddingLeft: 40, paddingRight: 40, paddingTop: 40, paddingBottom: 150
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

      <View style={styles.bottomSheet}>
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
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: config.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
              <MaterialCommunityIcons name={config.icon} size={16} color={config.text} />
              <Text style={{
                color: config.text, fontSize: 10,
                fontWeight: "700",
                textTransform: "uppercase",
                marginLeft: 5
              }}>
                {t(`status.${delivery.status}`)} {/* 👈 translated status */}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", paddingHorizontal: 4 }}>
            {/* customer image */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {delivery?.customer_image ?
                <View style={{ height: 50, width: 50, backgroundColor: "#F1F5F9", borderRadius: 125, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#aeb1b8ff" }}>
                  <Image
                    source={{ uri: delivery.customer_image }}
                    style={{ height: 50, width: 50, borderRadius: 125, resizeMode: "cover" }} />
                </View>
                :
                <View style={{ height: 50, width: 50, backgroundColor: "#F1F5F9", borderRadius: 125, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#aeb1b8ff" }}>
                  <Ionicons name="person" size={24} color="#64748B" />
                </View>
              }
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
            <View>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => delivery?.customer_phone && Linking.openURL(`tel:${delivery.customer_phone}`)}
              >
                <Ionicons name="call" size={18} color="#fff" />
                {/* <Text style={styles.callButtonText}>Call</Text> */}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => setIsConfirmModalVisible(true)}
          >
            <Text style={styles.completeButtonText}>{t('completeDelivery')}</Text>
          </TouchableOpacity>
        </View>
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
              <TouchableOpacity style={styles.confirmButton} onPress={onConfirmComplete} disabled={updating}>
                {updating ? <ActivityIndicator color="white" /> : <Text style={styles.confirmButtonText}>{t('confirm')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, elevation: 20 },
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
  actionButtons: { flexDirection: 'row', marginTop: 24, gap: 12 },
  callButton: { paddingHorizontal: 10, height: 40, borderRadius: 116, borderWeight: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: "#16A34A" },
  callButtonText: { color: '#fff', fontWeight: '600' },
  completeButton: { flex: 2, height: 50, backgroundColor: '#059669', borderRadius: 116, alignItems: 'center', justifyContent: 'center' },
  completeButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
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
  confirmButtonText: { color: '#fff', fontWeight: '600' }
});