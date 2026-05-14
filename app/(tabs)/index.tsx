import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useDelivery } from '@/context/DeliveryContext';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import ToggleSwitch from '@/components/ToggleButton';
import { STATUS_CONFIG, STATUS_ORDER } from '@/constants/deliveryConstants';

const { width } = Dimensions.get('window');


export default function HomeScreen() {
  const router = useRouter();
  const { user, toggleOnlineStatus } = useAuth();
  const { deliveries, driverStats, isLoading: loading, isRefreshing: refreshing, refreshAll } = useDelivery();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleOnline = async () => {
    setIsToggling(true);
    try {
      await toggleOnlineStatus();
    } catch (error) {
      console.error(error);
    } finally {
      setIsToggling(false);
    }
  };

  const isOnline = user?.memberships?.some(m => m.role === 'delivery' && m.is_active);

  const onRefresh = () => {
    refreshAll();
  };

  useEffect(() => {
    refreshAll();
  }, []);


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

  const currentIndex = STATUS_ORDER.indexOf(activeDelivery?.status.toLowerCase());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView

        showsVerticalScrollIndicator={false}

        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}>

        {/* --- SECTION 1: THE SKYLINE (Header) --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Hello {user?.first_name || 'Delivery'},</Text>
            <Text style={styles.userName}>Good Afternoon</Text>
          </View>
          <View style={styles.headerActions}>
            <ToggleSwitch 
              isOn={!!isOnline} 
              onToggle={handleToggleOnline} 
              isLoading={isToggling}
            />
            <TouchableOpacity  >
              <Ionicons name="notifications-outline" size={24} color="#1E293B" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- SECTION 2: THE FOUNDATION (Performance Stats) --- */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Earnings', value: `${driverStats.earnings} ETB`, icon: 'cash-outline', color: '#10B981', type: 'ion' },
            { 
              label: 'Assigned Orders', 
              value: driverStats.pending_orders.toString(), 
              icon: 'package-variant-closed', 
              color: '#6366F1', 
              type: 'material',
              onPress: () => router.push({ pathname: '/orders', params: { filter: 'pending' } })
            },
            { label: 'Total Orders', 
              value: driverStats.total_orders.toString(), 
              icon: 'package-variant-closed', color: '#6366F1', 
              type: 'material',
              onPress: () => router.push({ pathname: '/orders', params: { filter: 'all' } }) 
            },
          ].map((stat, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.statCard,
                { 
                  borderColor: stat.color + '20',
                  shadowColor: stat.color,
                }
              ]}
              onPress={stat.onPress}
              disabled={!stat.onPress}
            >
              <View style={[styles.statIconCircle, { backgroundColor: stat.color + '15' }]}>
                {stat.type === 'ion' ? (
                  <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                ) : (
                  <MaterialCommunityIcons name={stat.icon as any} size={20} color={stat.color} />
                )}
              </View>
              <Text style={[styles.statValue, { textAlign: "center", fontSize: 14 }]} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
              <Text style={[styles.statLabel, { textAlign: "center" }]}>{stat.label}</Text>
            </TouchableOpacity>
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
            <View style={styles.heroRow}>
              <View style={styles.heroInfo}>
                <Text style={styles.heroCustomerName}>Order #{activeDelivery.vendor_order || 'Customer'}</Text>
                {/* <Text style={styles.heroAddress} numberOfLines={1}>{activeDelivery.company_address}</Text> */}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[activeDelivery.status.toLowerCase()]?.bg }]}>
                <MaterialCommunityIcons name={STATUS_CONFIG[activeDelivery.status.toLowerCase()]?.icon} size={14} color={STATUS_CONFIG[activeDelivery.status.toLowerCase()]?.text} />
                <Text style={[styles.statusText, { color: STATUS_CONFIG[activeDelivery.status.toLowerCase()]?.text }]}>{STATUS_CONFIG[activeDelivery.status.toLowerCase()]?.label}</Text>
              </View>
            </View>
            <View style={styles.heroRow}>
              <View style={styles.herocusotmerContainer}>
                <View style={styles.heroCustomerAvator}>
                  {activeDelivery?.customer_image ? (
                    <Image source={{ uri: activeDelivery?.customer_image }} style={styles.customerAvatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {activeDelivery.customer_name?.charAt(0) || 'C'}
                      </Text>
                    </View>
                  )}
                </View>
                <View>

                  <Text style={styles.heroCustomerName}>{activeDelivery.customer_name || 'Customer'}</Text>
                  <Text style={styles.heroAddress} numberOfLines={1}>{activeDelivery.customer_phone}</Text>
                </View>
              </View>
              {/* <View style={styles.heroActionBtn}>
                <FontAwesome6 name="location-arrow" size={20} color="#fff" />
              </View> */}
            </View>
            {/* progress tracker */}
            <View style={styles.progressContainer}>
              {STATUS_ORDER.map((status, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isFuture = index > currentIndex;
                const config = STATUS_CONFIG[status];

                return (
                  <View key={status} style={styles.stepWrapper}>

                    {/* --- THE NODE ZONE (Handles vertical centering) --- */}
                    <View style={styles.nodeZone}>

                      {/* Connecting Line - Now centered perfectly via top: '50%' */}
                      {index !== 0 && (
                        <View
                          style={[
                            styles.progressLine,
                            {
                              backgroundColor: isCompleted || isCurrent ? '#16A34A' : 'rgba(255,255,255,0.2)',
                              // Adjusting width to bridge the gap perfectly between centers
                              left: '-50%',
                              right: '50%'
                            }
                          ]}
                        />
                      )}

                      {/* Step Indicator */}
                      <View style={[
                        styles.stepIndicator,
                        isCompleted && styles.indicatorCompleted,
                        isCurrent && styles.indicatorCurrent,
                        isFuture && styles.indicatorFuture
                      ]}>
                        <MaterialCommunityIcons
                          name={isCompleted ? 'check-bold' : STATUS_CONFIG[status].icon}
                          size={isCurrent ? 18 : 14}
                          color={isFuture ? 'rgba(255,255,255,0.5)' : '#fff'}
                        />
                        {isCurrent && <View style={styles.pulseRing} />}
                      </View>
                    </View>

                    {/* --- THE LABEL ZONE --- */}
                    <Text style={[
                      styles.stepLabel,
                      isCompleted && { color: '#fff', fontWeight: '600' },
                      isCurrent && { color: '#F59E0B', fontWeight: '900' },
                      isFuture && { color: 'rgba(255,255,255,0.4)' }
                    ]}>
                      {config.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        ) : loading ? (
          <View style={styles.emptyHeroCard}>
            <MaterialCommunityIcons name="radar" size={40} color="#6750A4" style={{ opacity: 0.5 }} />
            <Text style={styles.emptyHeroText}>Searching for new orders...</Text>
          </View>
        ) : (
          <View style={styles.emptyHeroCard}>
            <MaterialCommunityIcons name="package-variant-closed-remove" size={40} color="#94A3B8" style={{ opacity: 0.6 }} />
            <Text style={styles.emptyHeroText}>No active deliveries right now</Text>
            <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>New orders will appear here when assigned</Text>
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
            deliveries.sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()).slice(0, 5).map((delivery) => (
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
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[delivery.status.toLowerCase()]?.bg }]}>
                  <MaterialCommunityIcons name={STATUS_CONFIG[delivery.status.toLowerCase()]?.icon} size={14} color={STATUS_CONFIG[delivery.status.toLowerCase()]?.text} />
                  <Text style={[styles.statusText, { color: STATUS_CONFIG[delivery.status.toLowerCase()]?.text }]}>{STATUS_CONFIG[delivery.status.toLowerCase()]?.label}</Text>
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
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
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
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 15,
  },

  heroBadgeText: { color: '#36a13bff', fontSize: 10, fontWeight: '800' },
  heroCustomerAvator: {
    width: 48,
    height: 48,
    borderRadius: 124,
    backgroundColor: '#fff',
  },
  herocusotmerContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heroInfo: { flex: 1 },
  heroCustomerName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  heroAddress: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
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
    gap: 10,
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
  // statusBadge: {
  //   paddingHorizontal: 10,
  //   paddingVertical: 6,
  //   borderRadius: 10,
  // },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
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
  footerNoteText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  // This container creates a safe "structural bay" for the node and line
  nodeZone: {
    height: 44, // Matches the pulseRing height
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center', // This is the secret to perfect vertical centering
    position: 'relative',
    marginBottom: 4,
  },
  progressLine: {
    position: 'absolute',
    height: 4,
    // Using top: '50%' and a negative margin of half the height (2)
    // ensures it stays in the mathematical center of the nodeZone
    top: '50%',
    marginTop: -2,
    width: '100%',
    zIndex: -1,
  },
  stepIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 2, // Ensure node is above the line
  },
  indicatorCompleted: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  indicatorCurrent: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    transform: [{ scale: 1.2 }],
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  indicatorFuture: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    opacity: 0.4,
  },
  stepLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});