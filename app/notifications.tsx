// app/notifications.tsx — Delivery notification center.
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getNotifications, markNotificationsRead } from '@/services/api';
import { useDelivery } from '@/context/DeliveryContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

interface Notif {
  id: number;
  event: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data?: {
    type?: string;
    event?: string;
    tracking_id?: string;
    vendor_order_id?: number;
  };
}

const META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  'order.paid': { icon: 'card-outline', color: '#059669', bg: '#ecfdf5' },
  'order.payment_failed': { icon: 'alert-circle-outline', color: '#dc2626', bg: '#fef2f2' },
  'vendororder.new': { icon: 'bag-handle-outline', color: '#6750A4', bg: '#eef2ff' },
  'vendororder.preparing': { icon: 'time-outline', color: '#d97706', bg: '#fffbeb' },
  'delivery.assigned': { icon: 'car-outline', color: '#6750A4', bg: '#eff6ff' },
  'delivery.out_for_delivery': { icon: 'car-outline', color: '#2563eb', bg: '#eff6ff' },
  'delivery.delivered': { icon: 'checkmark-circle-outline', color: '#059669', bg: '#ecfdf5' },
};

function meta(event: string) {
  return META[event] ?? { icon: 'notifications-outline' as const, color: '#64748B', bg: '#f1f5f9' };
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { deliveries, refreshDeliveries } = useDelivery();
  const { refetch: refetchUnread } = useUnreadNotifications();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (page: number = 1) => {
    try {
      const { data } = await getNotifications({ page, page_size: 20 });
      const results = (data as { results?: Notif[]; next?: string }).results ?? (data as Notif[]);
      const next = (data as { results?: Notif[]; next?: string }).next ?? null;
      
      if (page > 1) {
        // Loading more - append to existing items, but prevent duplicates
        setItems(prev => {
          // Create a Set of existing IDs for quick lookup
          const existingIds = new Set(prev.map(item => item.id));
          // Only add items that don't already exist
          const newItems = results.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        // Initial load - replace items
        setItems(results);
      }
      
      setNextPage(next);
      setHasMore(!!next);
      
      // ✅ Sync badge count
      await refetchUnread();
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [refetchUnread]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  const onRefresh = () => {
    setRefreshing(true);
    load();
    refetchUnread();
  };
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    // Extract page number from nextPage URL or use current page + 1
    const currentPage = Math.ceil(items.length / 20) + 1;
    await load(currentPage);
  }, [hasMore, loadingMore, loading, items.length, load]);

  const markAll = async () => {
    try {
      await markNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      await refetchUnread();
    } catch {
      /* ignore */
    }
  };

  // Navigation handler - finds delivery ID from vendor_order_id
  const onPressItem = async (n: Notif) => {
    // Mark as read first
    if (!n.is_read) {
      try {
        await markNotificationsRead([n.id]);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
        // ✅ Sync badge count
        await refetchUnread();
      } catch {
        /* ignore */
      }
    }

    // Get vendor_order_id from notification data
    const vendorOrderId = n.data?.vendor_order_id;
    
    if (!vendorOrderId) {
      Alert.alert('Info', 'No linked delivery found for this notification');
      return;
    }

    // Get deliveries from context (already available)
    const deliveryList = deliveries || [];
    
    // Find the delivery assignment that matches the vendor_order_id
    let matchedDelivery = deliveryList.find(
      (delivery) => delivery.vendor_order === vendorOrderId
    );

    // If not found in existing deliveries, try refreshing once
    if (!matchedDelivery) {
      await refreshDeliveries();
      // Get updated deliveries from context
      const updatedList = deliveries || [];
      matchedDelivery = updatedList.find(
        (delivery) => delivery.vendor_order === vendorOrderId
      );
    }

    if (matchedDelivery) {
      // Navigate to delivery detail using the delivery assignment ID
      router.push(`/delivery/${matchedDelivery.id}`);
    } else {
      // If not found, show alert instead of trying fallback
      Alert.alert('Info', 'Delivery not found for this notification');
    }
  };

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAll} style={styles.markAll}>
            <Ionicons name="checkmark-done" size={14} color="#fff" />
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6750A4" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6750A4" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#6750A4" />
                <Text style={styles.footerLoaderText}>Loading more...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={28} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>New delivery assignments will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const m = meta(item.event);
            return (
              <TouchableOpacity
                onPress={() => onPressItem(item)}
                activeOpacity={0.7}
                style={[styles.card, !item.is_read && styles.cardUnread]}
              >
                <View style={[styles.iconWrap, { backgroundColor: m.bg }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.is_read && <View style={styles.dot} />}
                  </View>
                  <Text style={styles.body}>{item.body}</Text>
                  <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#6750A4',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  markAllText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
    footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  footerLoaderText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  cardUnread: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, color: '#0F172A', fontWeight: '700', fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6750A4', marginLeft: 8 },
  body: { color: '#475569', fontSize: 13, marginTop: 2 },
  time: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 96 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { color: '#64748B', fontWeight: '600' },
  emptySub: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
});
