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
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDeliveryDetail, updateDeliveryStatus } from '@/services/api';
import type { DeliveryAssignment, DeliveryStatus } from '@/types';
import { Ionicons, MaterialCommunityIcons, FontAwesome6, Feather, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const STATUS_ORDER = ["pending", "accepted", "picked_up", "out_for_delivery", "delivered"];

const NEXT_ACTION: Record<string, { label: string; next: DeliveryStatus; color: string; icon: string }> = {
  pending: { label: 'Accept Order', next: 'accepted', color: '#6366F1', icon: 'check-circle' },
  accepted: { label: 'Confirm Pickup', next: 'picked_up', color: '#8B5CF6', icon: 'package-variant' },
  picked_up: { label: 'Start Navigation', next: 'out_for_delivery', color: '#10B981', icon: 'navigation' },
  out_for_delivery: { label: 'Complete Delivery', next: 'delivered', color: '#059669', icon: 'check-all' },
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: any }> = {
  pending: { bg: '#FFF7ED', text: '#EA580C', label: 'Assigned', icon: 'clock-outline' },
  accepted: { bg: '#EFF6FF', text: '#2563EB', label: 'Accepted', icon: 'check-circle-outline' },
  picked_up: { bg: '#FAF5FF', text: '#9333EA', label: 'Picked Up', icon: 'package-variant' },
  out_for_delivery: { bg: '#F0FDF4', text: '#16A34A', label: 'In Transit', icon: 'truck-fast-outline' },
  delivered: { bg: '#F8FAFC', text: '#64748B', label: 'Fulfilled', icon: 'check-all' },
};

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<any | null>(null); // Use any to access vendor_order_detail
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { fetchDelivery(); }, [id]);

  const fetchDelivery = async () => {
    try {
      const { data } = await getDeliveryDetail(Number(id));
      setDelivery(data);
    } catch (error) {
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

    Alert.alert('Confirm Status Change', `Move order to ${action.next.replace('_', ' ')}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setUpdating(true);
          try {
            const { data } = await updateDeliveryStatus(delivery.id, action.next);
            setDelivery(data);
            if (action.next === 'delivered') router.back();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Update failed');
          } finally { setUpdating(false); }
        },
      },
    ]);
  };

  if (loading) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#6750A4" />
    </View>
  );

  if (!delivery) return null;
  const action = NEXT_ACTION[delivery.status];
  const currentIndex = STATUS_ORDER.indexOf(delivery.status.toLowerCase());
  const orderDetail = delivery.vendor_order_detail;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- HERO HEADER --- */}
      <View style={styles.heroSection}>
        <Image
          source={require('@/assets/images/order.jpg')}
          style={styles.heroBg}
        />
        <View style={styles.heroOverlay} />
        <SafeAreaView>
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.glassCircle}>
              <Ionicons name="arrow-back" size={24} color="#6750A4" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.heroOrderTitle}>Order #{delivery.vendor_order}</Text>
              {/* <Text style={styles.heroInvoiceTitle}>{orderDetail?.tax_invoice?.invoice_number}</Text> */}
            </View>
            <View></View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150, paddingTop: 20 }}
      >
        {/* --- STATUS PIPELINE --- */}
        <View style={styles.card}>
          <View style={styles.progressContainer}>
            {STATUS_ORDER.map((status, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isFuture = index > currentIndex;
              return (
                <View key={status} style={styles.stepWrapper}>
                  <View style={styles.nodeZone}>
                    {index !== 0 && (
                      <View style={[styles.progressLine, { backgroundColor: isCompleted || isCurrent ? '#16A34A' : '#E5E7EB', left: '-50%', right: '50%' }]} />
                    )}
                    <View style={[styles.stepIndicator, isCompleted && styles.indicatorCompleted, isCurrent && styles.indicatorCurrent, isFuture && styles.indicatorFuture]}>
                      <MaterialCommunityIcons name={isCompleted ? 'check-bold' : STATUS_CONFIG[status].icon} size={isCurrent ? 16 : 12} color={isFuture ? '#9CA3AF' : '#fff'} />
                      {isCurrent && <View style={styles.pulseRing} />}
                    </View>
                  </View>
                  <Text style={[styles.stepLabel, isCurrent && { color: '#F59E0B', fontWeight: '900' }]}>{STATUS_CONFIG[status].label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* --- VENDOR & CUSTOMER CARDS --- */}
        <View style={styles.dualCardRow}>
          <View style={[styles.miniCard, { borderLeftColor: '#6750A4', borderLeftWidth: 4 }]}>
            <Text style={styles.miniLabel}>PICKUP FROM</Text>
            <Text style={styles.miniTitle} numberOfLines={1}>{delivery.company_name}</Text>
            <TouchableOpacity
              style={styles.miniAction}
            // onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${delivery.company_address}`)}
            >
              {/* <Feather name="map-pin" size={12} color="#6750A4" /> */}
              <Text style={styles.miniActionText}>{delivery.vendor_order_detail.company.business_type}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.miniCard, { borderLeftColor: '#10B981', borderLeftWidth: 4, position:"relative"}]}>
            <Text style={styles.miniLabel}>DELIVER TO</Text>
            <View style={{flexDirection:"row",justifyContent:"flex-start", alignItems:"center", gap:12}}>
            {delivery.customer_image ? 
            (<Image source={{uri: delivery.customer_image}} style={styles.customerImage} />)  
          : 
            (<View style={styles.customerImage}><MaterialIcons name="person" size={24} color="#10B981" /></View>)
          }
            <Text style={styles.miniTitle} numberOfLines={1}>{delivery.customer_name}</Text>
            </View>
            <View style={{position:"absolute",bottom:8,right:8}}>

            <TouchableOpacity style={[styles.miniAction, { backgroundColor: '#10B98115', paddingVertical: 8,paddingHorizontal:8, borderRadius: 144 }]} onPress={() => Linking.openURL(`tel:${delivery.customer_phone}`)}>
              <Feather name="phone" size={14} color="#10B981" />
              {/* <Text style={[styles.miniActionText, { color: '#10B981'}]}></Text> */}
            </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* --- ITEM LIST (The Core Addition) --- */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>ORDER ITEMS ({orderDetail?.items?.length || 0})</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{orderDetail?.company?.sub_category_name}</Text>
            </View>
          </View>

          {orderDetail?.items?.map((item: any, index: number) => (
            <View key={item.id} style={[styles.itemRow, index === orderDetail.items.length - 1 && { borderBottomWidth: 0 }]}>
              <Image
                source={{ uri: item.product_image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=200&auto=format&fit=crop' }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemQty}>Qty: {item.qty}</Text>
                  <Text style={styles.itemPrice}>{item.unit_price} {orderDetail?.tax_invoice?.currency}</Text>
                </View>
              </View>
            </View>
          ))}

          {/* --- BILLING SUMMARY --- */}
          <View style={styles.billingSection}>
            <View style={styles.billingRow}>
              <Text style={styles.billingText}>Subtotal</Text>
              <Text style={styles.billingValue}>{orderDetail?.subtotal} {orderDetail?.tax_invoice?.currency}</Text>
            </View>
            <View style={[styles.billingRow, styles.totalRow]}>
              <Text style={styles.totalText}>Total Amount</Text>
              <Text style={styles.totalValue}>{orderDetail?.amount} {orderDetail?.tax_invoice?.currency}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* --- FLOATING TRACKING BUTTON --- */}
      {['accepted', 'picked_up', 'out_for_delivery'].includes(delivery.status) && (
        <TouchableOpacity
          onPress={() => router.push(`/delivery/tracking?id=${delivery.id}`)}
          style={styles.trackingFloatingBtn}
        >
          <FontAwesome6 name="route" size={18} color="#fff" />
          <Text style={styles.trackingFloatingText}>Track Order</Text>
        </TouchableOpacity>
      )}

      {/* --- BOTTOM ACTION HUB --- */}
      <View style={styles.bottomHub}>
        {action && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: action.color }]}
            onPress={handleStatusUpdate}
            disabled={updating}
          >
            {updating ? <ActivityIndicator color="#fff" /> : (
              <>
                <MaterialCommunityIcons name={action.icon as any} size={24} color="#fff" />
                <Text style={styles.primaryBtnText}>{action.label}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero Section
  heroSection: { height: 200, position: 'relative' },
  heroBg: { width: '100%', height: '100%', position: 'absolute' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  glassCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#6750A4' },
  headerInfo: { alignItems: 'center' },
  heroOrderTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  heroInvoiceTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginTop: 2 },

  contentScroll: { marginTop: -35, borderTopLeftRadius: 35, borderTopRightRadius: 35, backgroundColor: '#F8FAFC', paddingHorizontal: 16 },

  // Card System
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  categoryBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryText: { fontSize: 10, fontWeight: '700', color: '#64748B' },

  // Dual Cards
  dualCardRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  miniCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 2 },
  miniLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  miniTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  miniAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6750A410', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniActionText: { fontSize: 10, fontWeight: '700', color: '#6750A4' },

  // Pipeline (The one from previous step, integrated)
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  stepWrapper: { flex: 1, alignItems: 'center' },
  nodeZone: { height: 32, width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  progressLine: { position: 'absolute', height: 3, width: '100%', top: '50%', marginTop: -1.5, zIndex: -1 },
  stepIndicator: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, backgroundColor: '#fff', zIndex: 2 },
  indicatorCompleted: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  indicatorCurrent: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  indicatorFuture: { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  pulseRing: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#F59E0B', opacity: 0.4 },
  stepLabel: { fontSize: 8, color: '#94A3B8', marginTop: 4, fontWeight: '600' },

  // Item List
  itemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  itemImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F8FAFC' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  itemSku: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  itemPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  itemQty: { fontSize: 12, fontWeight: '800', color: '#6750A4' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#475569' },

  // Billing
  billingSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  billingText: { fontSize: 13, color: '#64748B' },
  billingValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  totalRow: { marginTop: 4, paddingTop: 10 },
  totalText: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#6750A4' },

  // Tracking Floating
  trackingFloatingBtn: { position: 'absolute', bottom: 110, right: 20, backgroundColor: '#6750A4', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 5, shadowColor: '#6750A4', shadowOpacity: 0.4, shadowRadius: 10 },
  trackingFloatingText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Bottom Hub
  bottomHub: { position: 'absolute', bottom: 0, width: width, backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  primaryBtn: { height: 56, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  customerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
});