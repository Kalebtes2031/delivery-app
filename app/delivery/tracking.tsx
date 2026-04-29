import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Linking, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getDeliveryDetail, updateDeliveryStatus } from '@/services/api';
import { firebaseTracking } from '@/services/firebaseTracking';
import { requestLocationPermissions, startLocationWatcher } from '@/services/locationService';
import type { DeliveryAssignment } from '@/types';

const { MapView, Camera, MarkerView, RasterSource, RasterLayer, ShapeSource, LineLayer } = MapLibreGL;

export default function DriverTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryAssignment | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const locationSubscription = useRef<any>(null);
  const hasFetchedRoute = useRef(false);

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
      const { data } = await getDeliveryDetail(Number(id));
      setDelivery(data);
      console.log('[Tracking] Delivery loaded:', data.tracking_id);

      const permissions = await requestLocationPermissions();
      if (!permissions) {
        router.back();
        return;
      }
      console.log('[Tracking] Location permissions granted');

      const destCoords: [number, number] = data.customer_lat && data.customer_lon
        ? [Number(data.customer_lon), Number(data.customer_lat)]
        : [38.74, 9.03];

      locationSubscription.current = await startLocationWatcher((location) => {
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
      });
    } catch (error) {
      console.error('[Tracking] Init failed:', error);
      Alert.alert('Error', 'Could not initialize tracking.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!delivery) return;
    Alert.alert('Complete Delivery', 'Are you sure you have delivered the order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setUpdating(true);
          try {
            await updateDeliveryStatus(delivery.id, 'delivered');
            await firebaseTracking.stopTracking(delivery.tracking_id);
            Alert.alert('Success', 'Order has been successfully fulfilled.', [
              { text: 'OK', onPress: () => router.replace('/(tabs)') },
            ]);
          } catch (error) {
            Alert.alert('Error', 'Failed to update delivery status.');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const callCustomer = () => {
    if (delivery?.customer_phone) {
      Linking.openURL(`tel:${delivery.customer_phone}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6750A4" />
        <Text style={{ color: '#6750A4', marginTop: 16 }}>Initializing GPS Tracking...</Text>
      </View>
    );
  }

  if (!delivery) return null;

  const destCoords: [number, number] =
    delivery.customer_lat && delivery.customer_lon
      ? [Number(delivery.customer_lon), Number(delivery.customer_lat)]
      : [38.74, 9.03];

  const driverCoords: [number, number] = currentLocation
    ? [currentLocation.coords.longitude, currentLocation.coords.latitude]
    : destCoords;

  // Calculate dynamic bounding box encompassing both points
  const minLng = Math.min(driverCoords[0], destCoords[0]);
  const maxLng = Math.max(driverCoords[0], destCoords[0]);
  const minLat = Math.min(driverCoords[1], destCoords[1]);
  const maxLat = Math.max(driverCoords[1], destCoords[1]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" />
      <View>
        <View style={{ width: "100%", height: 500, overflow: "hidden" }}>
          {/* v10 API — identical to Customer App's DeliveryLocation.tsx */}
          <MapView
            style={{ flex: 1 }}
            styleURL="https://tiles.openfreemap.org/styles/bright"
            logoEnabled={false}
            attributionEnabled={false}
            onDidFinishLoadingStyle={() => setMapLoaded(true)}
          >
            <Camera
              bounds={{
                ne: [maxLng, maxLat],
                sw: [minLng, minLat],
                paddingLeft: 40,
                paddingRight: 40,
                paddingTop: 80, // Accommodate back button
                paddingBottom: 40,
              }}
              animationMode="flyTo"
              animationDuration={1500}
            />
            <RasterSource
              id="osm"
              tileUrlTemplates={["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"]}
              tileSize={256}
            >
              <RasterLayer id="osmLayer" sourceID="osm" />
            </RasterSource>

            {/* Route Polyline */}
            {routeGeoJSON && (
              <ShapeSource id="routeSource" shape={routeGeoJSON}>
                <LineLayer
                  id="routeFill"
                  style={{
                    lineColor: '#6750A4',
                    lineWidth: 5,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </ShapeSource>
            )}

            {/* Destination Marker */}
            <MarkerView coordinate={destCoords}>
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 100 }}>
                <View style={{
                  backgroundColor: 'white',
                  padding: 3,
                  borderRadius: 100,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                  zIndex: 4
                }}>
                  <Entypo name="location-pin" size={28} color="#EF4444" />
                </View>
                <View className="bg-[#6C57A5] px-2 py-1 rounded-md mt-1">
                  <Text className="text-secondary text-[10px] font-bold">Destination</Text>
                </View>
              </View>
            </MarkerView>

            {/* Driver Marker */}
            {currentLocation && (
              <MarkerView coordinate={driverCoords}>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#6750A4',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                      shadowColor: '#6750A4',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                      zIndex: 4
                    }}
                  >
                    <MaterialCommunityIcons name="truck-delivery" size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ backgroundColor: '#6750A4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>YOU</Text>
                  </View>
                </View>
              </MarkerView>
            )}
          </MapView>
        </View>

        {/* Map loading overlay */}
        {!mapLoaded && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#6750A4" />
            <Text style={{ marginTop: 8, color: '#94A3B8', fontSize: 12 }}>Loading Map...</Text>
          </View>
        )}
        {/* Floating Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: 50,
            left: 20,
            backgroundColor: '#FFFFFF',
            width: 34,
            height: 34,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#6750A4",
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#6750A4" />
        </TouchableOpacity>
        <View>
          {/* Overlay Info */}
          <View style={{ flexDirection: "column",  padding: 16, gap: 32, borderTopRightRadius: 44, borderTopLeftRadius: 44 }}>
            <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#6750A4' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ color: '#6750A4', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Live Delivery</Text>
                  <Text style={{ color: '#6750A4', fontSize: 18, fontWeight: '900' }}>Order #{delivery.vendor_order}</Text>
                </View>
                <View style={{ backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{delivery.status.replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ backgroundColor: '#ffffff', padding: 8, borderRadius: 118, borderWidth:1, borderColor: '#6750A4' }}>
                  {delivery.customer_image ? (
                    <Image
                      source={{ uri: delivery.customer_image }}
                      style={{ width: 24, height: 24, borderRadius: 12 }}
                    />
                  ) : (
                    <Ionicons name="person" size={16} color="#6750A4" />
                  )}
                </View>
                <Text style={{ color: '#6750A4', fontSize: 14, fontWeight: '600' }}>{delivery.customer_name || 'Customer'}</Text>
              </View>

              {delivery.customer_phone && (
                <TouchableOpacity
                  onPress={callCustomer}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}
                >
                  <Ionicons name="call" size={20} color="#29ac1dff" />
                  <Text style={{ color: '#6750A4', fontSize: 13 }}>
                    {delivery.customer_phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleComplete}
              disabled={updating}
              style={{
                backgroundColor: '#6750A4',
                borderRadius: 120,
                padding: 20,
                alignItems: 'center',
                shadowColor: '#6750A4',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>COMPLETE DELIVERY</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
