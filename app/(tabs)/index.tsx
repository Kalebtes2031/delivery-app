import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import ToggleSwitch from '@/components/ToggleButton';
import { DeliveryAssignment } from '@/types';
import { getDeliveries } from '@/services/api';

const { width } = Dimensions.get('window');

// Mock data for the "Stats" section - in a real app, this comes from an API
const DRIVER_STATS = [
  { label: 'Earnings', value: '$124.50', icon: 'cash-outline', color: '#10B981' },
  { label: 'Orders', value: '12', icon: 'package-variant-closed', color: '#6366F1' },
  // { label: 'Rating', value: '4.9', icon: 'star', color: '#F59E0B' },
];

export default function HomeScreen() {
  const router = useRouter();
    const { user } = useAuth();
    const [deliveries, setDeliveries] = useState<DeliveryAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
  
    const fetchDeliveries = useCallback(async () => {
      try {
        const { data } = await getDeliveries();
        setDeliveries(Array.isArray(data) ? data : (data as any).results || []);
      } catch (error) {
        console.error('Failed to fetch deliveries:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);
  
  
    const onRefresh = () => {
      setRefreshing(true);
      fetchDeliveries();
    };
  
    useEffect(() => {
      setLoading(true);
      fetchDeliveries();
    }, [fetchDeliveries]);
  
  
  // Find the latest delivery that is currently "Out for Delivery"
  const activeDelivery = deliveries
    .filter(d => d.status === 'out_for_delivery')
    .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())[0];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#6366F1';
      case 'picked_up': return '#8B5CF6';
      case 'out_for_delivery': return '#10B981';
      case 'delivered': return '#10B981';
      case 'failed': return '#EF4444';
      default: return '#64748B';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- SECTION 1: THE SKYLINE (Header) --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Hello {user?.first_name || 'Delivery'},</Text>
            <Text style={styles.userName}>Good Afternoon</Text>
          </View>
          <View style={styles.headerActions}>
             <ToggleSwitch />
             <TouchableOpacity  >
                <Ionicons name="notifications-outline" size={24} color="#1E293B" />
                <View style={styles.notificationDot} />
             </TouchableOpacity>
          </View>
        </View>

        {/* --- SECTION 2: THE FOUNDATION (Performance Stats) --- */}
        <View style={styles.statsGrid}>
          {DRIVER_STATS.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: stat.color + '15' }]}>
                {stat.icon === 'package-variant-closed' ? <MaterialCommunityIcons name={stat.icon} size={20} color={stat.color} /> : 
                stat.icon === 'star' ? <MaterialCommunityIcons name={stat.icon} size={20} color={stat.color} /> : 
                <Ionicons name={stat.icon} size={20} color={stat.color} />}
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* --- SECTION 3: THE COMMAND CENTER (Active Task Hero) --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Shipment</Text>
          <TouchableOpacity onPress={() => router.push('/orders')}>
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {activeDelivery ? (
          <TouchableOpacity 
            style={styles.heroCard}
            onPress={() => router.push(`/delivery/${activeDelivery.id}`)}
          >
            <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>LIVE TRACKING</Text>
            </View>
            <View style={styles.heroRow}>
                <View style={styles.heroInfo}>
                    <Text style={styles.heroCustomerName}>{activeDelivery.customer_name || 'Customer'}</Text>
                    <Text style={styles.heroAddress} numberOfLines={1}>{activeDelivery.company_address}</Text>
                </View>
                <View style={styles.heroActionBtn}>
                    <FontAwesome6 name="location-arrow" size={20} color="#fff" />
                </View>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '85%' }]} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyHeroCard}>
            <MaterialCommunityIcons name="radar" size={40} color="#6750A4" style={{ opacity: 0.5 }} />
            <Text style={styles.emptyHeroText}>Searching for new orders...</Text>
          </View>
        )}

        {/* --- SECTION 4: DELIVERY SUMMARY --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery Summary</Text>
          <TouchableOpacity onPress={() => router.push('/orders')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryList}>
          {deliveries.length > 0 ? (
            deliveries.slice(0, 5).map((delivery) => (
              <TouchableOpacity 
                key={delivery.id} 
                style={styles.summaryItem}
                onPress={() => router.push(`/delivery/${delivery.id}`)}
              >
                <View style={styles.summaryLeft}>
                  {delivery.customer_image ? (
                    <Image source={{ uri: delivery.customer_image }} style={styles.customerAvatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {delivery.customer_name?.charAt(0) || 'C'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.customerInfo}>
                    <Text style={styles.summaryCustomerName} numberOfLines={1}>{delivery.customer_name || 'Customer'}</Text>
                    <Text style={styles.summaryCustomerEmail} numberOfLines={1}>{delivery.customer_email || 'No email provided'}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) + '15' }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(delivery.status) }]}>
                    {delivery.status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptySummary}>
                <Text style={styles.emptySummaryText}>No recent activities</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-component for Quick Actions
const ActionButton = ({ icon, label, color }: { icon: any, label: string, color: string }) => (
    <TouchableOpacity style={styles.actionCard}>
        <View style={[styles.actionIconBox, { backgroundColor: color }]}>
            <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  greetingText: { fontSize: 14, color: '#6750A4', fontWeight: '500' },
  userName: { fontSize: 24, color: '#6750A4', fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: '#fff',
    width: (width - 60) / 3,
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconCircle: { padding: 8, borderRadius: 12, marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 2 },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 15 },
  seeAllText: { color: '#6750A4', fontWeight: '700' },

  // Hero Card
  heroCard: {
    backgroundColor: '#6750A4',
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 15,
  },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heroInfo: { flex: 1 },
  heroCustomerName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  heroAddress: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  heroActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },

  // Empty Hero State
  emptyHeroCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
    marginBottom: 25,
  },
  emptyHeroText: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginTop: 10 },
  emptyHeroSubtext: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 5 },

  // Quick Action Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  actionCard: {
    backgroundColor: '#fff',
    width: (width - 55) / 2,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#475569' },

  // Delivery Summary
  summaryList: {
    gap: 12,
    marginBottom: 20,
  },
  summaryItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6750A415',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6750A4',
  },
  customerInfo: {
    flex: 1,
  },
  summaryCustomerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  summaryCustomerEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptySummary: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptySummaryText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footerNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 6 },
  footerNoteText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' }
});