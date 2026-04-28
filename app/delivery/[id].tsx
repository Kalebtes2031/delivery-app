import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDeliveryDetail, updateDeliveryStatus } from '@/services/api';
import type { DeliveryAssignment, DeliveryStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';

const STATUS_FLOW: DeliveryStatus[] = [
  'pending',
  'accepted',
  'picked_up',
  'out_for_delivery',
  'delivered',
];

const NEXT_ACTION: Record<string, { label: string; next: DeliveryStatus; color: string }> = {
  pending: { label: 'Accept Order', next: 'accepted', color: '#6750A4' },
  accepted: { label: 'Mark as Picked Up', next: 'picked_up', color: '#6750A4' },
  picked_up: { label: 'Start Delivery', next: 'out_for_delivery', color: '#059669' },
  out_for_delivery: { label: 'Mark as Delivered', next: 'delivered', color: '#08a029ff' },
};

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  const fetchDelivery = async () => {
    try {
      const { data } = await getDeliveryDetail(Number(id));
      setDelivery(data);
    } catch (error) {
      console.error('Failed to fetch delivery:', error);
      Alert.alert('Error', 'Could not load delivery details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!delivery) return;
    const action = NEXT_ACTION[delivery.status];
    if (!action) return;

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to "${action.label.replace(/[^\w\s]/g, '').trim()}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              const { data } = await updateDeliveryStatus(delivery.id, action.next);
              setDelivery(data);

              if (action.next === 'delivered') {
                Alert.alert('🎉 Delivered!', 'Order has been delivered successfully.', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              }
            } catch (error: any) {
              const message = error.response?.data?.error || 'Failed to update status.';
              Alert.alert('Error', message);
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const callCustomer = () => {
    if (delivery?.customer_phone) {
      Linking.openURL(`tel:${delivery.customer_phone}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!delivery) return null;

  const action = NEXT_ACTION[delivery.status];
  const currentStepIndex = STATUS_FLOW.indexOf(delivery.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <BackButton title={`Order #${delivery.vendor_order}`} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 220, paddingTop: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Steps */}
        <View style={{ backgroundColor: '#6750A4', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
          <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            Progress
          </Text>
          <View style={{ gap: 12 }}>
            {STATUS_FLOW.map((step, i) => {
              const isComplete = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <View key={step} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: isComplete ? '#0ea816ff' : '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isCurrent ? 2 : 0,
                      borderColor: '#818CF8',
                    }}
                  >
                    <Text style={{ color: isComplete ? '#fff' : '#6750A4', fontSize: 12, fontWeight: '800' }}>
                      {isComplete ? '✓' : i + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: isComplete ? '#F1F5F9' : '#fff',
                      fontSize: 14,
                      fontWeight: isCurrent ? '800' : '500',
                      textTransform: 'capitalize',
                    }}
                  >
                    {step.replace(/_/g, ' ')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Customer Info */}
        <View style={{ backgroundColor: '#6750A4', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
            Customer
          </Text>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="person" size={24} color="#d3eb00ff" />
              <Text style={{ color: '#F1F5F9', fontSize: 16, fontWeight: '700' }}>
                {delivery.customer_name || 'Customer'}
              </Text>
            </View>
            {delivery.customer_phone && (
              <TouchableOpacity
                onPress={callCustomer}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <Ionicons name="call" size={20} color="#29ac1dff" />
                <Text style={{ color: '#ffffff', fontSize: 13 }}>
                  {delivery.customer_phone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Company Info */}
        <View style={{ backgroundColor: '#6750A4', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
            Pickup From
          </Text>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="storefront" size={24} color="#d3eb00ff" />
              <Text style={{ color: '#F1F5F9', fontSize: 16, fontWeight: '700' }}>
                {delivery.company_name || 'Company'}
              </Text>
            </View>
            {delivery.company_address && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="location" size={20} color="#f6b840ff" />
                <Text style={{ color: '#94A3B8', fontSize: 14, flex: 1 }}>
                  {delivery.company_address}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Tracking ID */}
        {/* <View style={{ backgroundColor: '#1E293B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#334155' }}>
          <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            Tracking ID
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'monospace' }}>
            {delivery.tracking_id}
          </Text>
        </View> */}
      </ScrollView>

      {/* Bottom Action */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 14,
          paddingBottom: 10,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#ccc',
          gap: 12
        }}
      >
        <View
          style={{
            flexDirection:"row",
            alignItems:"center",
            justifyContent:"center",
            gap:12,
          }}>

          {['accepted', 'picked_up', 'out_for_delivery'].includes(delivery.status) && (
            <TouchableOpacity
              onPress={() => router.push(`/delivery/tracking?id=${delivery.id}`)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 116,
                paddingVertical: 11,
                paddingHorizontal:24,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#6750A4'
              }}
            >
              <Text style={{ color: '#6750A4', fontSize: 14, fontWeight: '800' }}>
                Track Order
              </Text>
            </TouchableOpacity>
          )}

          {action && (
            <TouchableOpacity
              onPress={handleStatusUpdate}
              disabled={updating}
              style={{
                backgroundColor: action.color,
                borderRadius: 116,
                paddingVertical: 11,
                paddingHorizontal:24,
                alignItems: 'center',
                opacity: updating ? 0.7 : 1,
              }}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                  {action.label}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
