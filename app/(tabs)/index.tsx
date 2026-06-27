import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useDelivery } from '@/context/DeliveryContext';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import ToggleSwitch from '@/components/ToggleButton';
import { STATUS_CONFIG, STATUS_ORDER } from '@/constants/deliveryConstants';
import { useTranslation } from 'react-i18next'; // 👈 added
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

const { width } = Dimensions.get('window');


export default function HomeScreen() {
  const router = useRouter();
  const { unread: unreadCount } = useUnreadNotifications();
  const { user, toggleOnlineStatus } = useAuth();
  const { deliveries, driverStats, isLoading: loading, isRefreshing: refreshing, refreshAll } = useDelivery();
  const [isToggling, setIsToggling] = useState(false);
  const { t } = useTranslation('deliveryHome');

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useFocusEffect(
    useCallback(() => {
      // Reset to initial values before animating
      fadeAnim.setValue(0);
      slideAnim.setValue(20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, slideAnim])
  );

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
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.scrollContent}>

          {/* --- SECTION 1: HEADER WITH CURVED BOTTOM RIGHT --- */}
          <View style={{ position: 'relative', marginBottom: 15, marginHorizontal: -20 }}>
            <View style={styles.headerGradient}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity
                    onPress={() => router.push('/profile')}
                    activeOpacity={0.8}
                    style={styles.avatarTouchable}
                  >
                    <View style={styles.avatarContainer}>
                      {user?.profile_image ? (
                        <Image
                          source={{ uri: user.profile_image }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {(user?.first_name?.[0] || user?.username?.[0] || 'D').toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.avatarRing} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.greetingText}>
                      {t('helloUser', { name: user?.first_name || 'Delivery' })}
                    </Text>
                    <Text style={styles.userName}>{t('goodAfternoon')}</Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <ToggleSwitch
                    isOn={!!isOnline}
                    onToggle={handleToggleOnline}
                    isLoading={isToggling}
                  />
                  <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifButton}>
                    <View style={styles.notifIconWrapper}>
                      <Ionicons name="notifications-outline" size={20} color="#fff" />
                      {unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationBadgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Curved bottom right corner effect */}
            <View style={{
              position: 'absolute',
              bottom: -30,
              right: 0,
              width: 50,
              height: 30,
              backgroundColor: '#ffffff',
              borderTopRightRadius: 150,
              zIndex: 1,
            }} />
            <View style={{
              position: 'absolute',
              bottom: -30,
              right: 0,
              width: 50,
              height: 30,
              backgroundColor: '#6750A4',
              zIndex: 0,
            }} />
          </View>

          {/* --- SECTION 2: THE FOUNDATION (Performance Stats) --- */}
          <View style={styles.statsGrid}>
            {[
              {
                label: t('cashOnHand'),
                value: `${driverStats.cash_on_hand || '0.00'} ETB`,
                icon: 'wallet-outline',
                color: '#10B981',
                type: 'ion',
                onPress: () => {
                  router.push('/cash-on-hand');
                }
              },
              {
                label: t('assignedOrders'),
                value: driverStats.pending_orders.toString(),
                icon: 'package-variant-closed',
                color: '#6366F1',
                type: 'material',
                onPress: () => {
                  // Navigate with a small delay for smooth transition
                  setTimeout(() => {
                    router.push({
                      pathname: '/orders',
                      params: { filter: 'pending' }
                    });
                  }, 100);
                }
              },
              {
                label: t('totalOrders'),
                value: driverStats.total_orders.toString(),
                icon: 'package-variant-closed', color: '#6366F1',
                type: 'material',
                onPress: () => {
                  // Force navigation with a unique key to trigger animation
                  setTimeout(() => {
                    router.push({
                      pathname: '/orders',
                      params: { filter: 'all', t: Date.now() }
                    });
                  }, 100);
                }
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
                activeOpacity={0.7}
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
            <View style={styles.sectionTitleWrapper}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>{t('currentShipment')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/orders')}>
              <Text style={styles.seeAllText}>{t('viewAll')}</Text>
            </TouchableOpacity>
          </View>

          {activeDelivery ? (
            <TouchableOpacity
              style={styles.heroCard}
              onPress={() => router.push(`/delivery/${activeDelivery.id}`)}
              activeOpacity={0.85}
            >
              {/* Card Header with Order Number and Status */}
              <View style={styles.heroCardHeader}>
                <View style={styles.heroOrderInfo}>
                  <View style={styles.heroOrderIcon}>
                    <MaterialCommunityIcons name="receipt-text-outline" size={16} color="#fff" />
                  </View>
                  <Text style={styles.heroOrderText}>
                    {t('orderNumber', { id: activeDelivery.vendor_order || 'Customer' })}
                  </Text>
                </View>
                <View style={[styles.heroStatusBadge, { backgroundColor: STATUS_CONFIG[activeDelivery.status.toLowerCase()]?.bg }]}>
                  <View style={[styles.heroStatusDot, { backgroundColor: STATUS_CONFIG[activeDelivery.status.toLowerCase()]?.text }]} />
                  <Text style={[styles.heroStatusText, { color: STATUS_CONFIG[activeDelivery.status.toLowerCase()]?.text }]}>
                    {activeDelivery.status === 'pending' ? 'ASSIGNED' :
                      activeDelivery.status === 'out_for_delivery' ? 'IN TRANSIT' :
                        t(`status.${activeDelivery.status.toLowerCase()}`).toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Customer Info */}
              <View style={styles.heroCustomerSection}>
                <View style={styles.heroCustomerAvatarWrapper}>
                  {activeDelivery?.customer_image ? (
                    <Image source={{ uri: activeDelivery?.customer_image }} style={styles.heroCustomerAvatar} />
                  ) : (
                    <View style={styles.heroCustomerAvatarPlaceholder}>
                      <Text style={styles.heroCustomerAvatarText}>
                        {activeDelivery.customer_name?.charAt(0) || 'C'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.heroCustomerDetails}>
                  <Text style={styles.heroCustomerName}>{activeDelivery.customer_name || t('customer')}</Text>
                  <View style={styles.heroCustomerPhone}>
                    <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.heroCustomerPhoneText}>{activeDelivery.customer_phone}</Text>
                  </View>
                </View>
              </View>

              {/* Progress Tracker */}
              <View style={styles.heroProgressContainer}>
                {STATUS_ORDER.map((status, index) => {
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  const isFuture = index > currentIndex;
                  const config = STATUS_CONFIG[status];
                  const isLast = index === STATUS_ORDER.length - 1;

                  return (
                    <View key={status} style={styles.heroStepWrapper}>
                      <View style={styles.heroNodeZone}>
                        {!isLast && (
                          <View
                            style={[
                              styles.heroProgressLine,
                              {
                                backgroundColor: isCompleted || isCurrent ? '#16A34A' : 'rgba(255,255,255,0.15)',
                              }
                            ]}
                          />
                        )}
                        <View style={[
                          styles.heroStepIndicator,
                          isCompleted && styles.heroIndicatorCompleted,
                          isCurrent && styles.heroIndicatorCurrent,
                          isFuture && styles.heroIndicatorFuture
                        ]}>
                          <MaterialCommunityIcons
                            name={isCompleted ? 'check-bold' : STATUS_CONFIG[status].icon}
                            size={isCurrent ? 14 : 12}
                            color={isFuture ? 'rgba(255,255,255,0.4)' : '#fff'}
                          />
                          {isCurrent && <View style={styles.heroPulseRing} />}
                        </View>
                      </View>
                      <Text style={[
                        styles.heroStepLabel,
                        isCompleted && styles.heroStepCompleted,
                        isCurrent && styles.heroStepCurrent,
                        isFuture && styles.heroStepFuture
                      ]}>
                        {status === 'pending' ? 'ASSIGNED' :
                          status === 'out_for_delivery' ? 'IN TRANSIT' :
                            t(`status.${status}`).toUpperCase()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          ) : loading ? (
            <View style={styles.emptyHeroCard}>
              <MaterialCommunityIcons name="radar" size={40} color="#6750A4" style={{ opacity: 0.5 }} />
              <Text style={styles.emptyHeroText}>{t('searchingForOrders')}</Text>
            </View>
          ) : (
            <View style={styles.emptyHeroCard}>
              <MaterialCommunityIcons name="package-variant-closed-remove" size={40} color="#94A3B8" style={{ opacity: 0.6 }} />
              <Text style={styles.emptyHeroText}>{t('noActiveDeliveries')}</Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>{t('newOrdersWillAppear')}</Text>
            </View>
          )}

          {/* --- SECTION 4: DELIVERY SUMMARY --- */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrapper}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionTitle}>{t('deliverySummary')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/orders')}>
              <Text style={styles.seeAllText}>{t('seeAll')}</Text>
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
                  <View style={styles.summaryItemWrapper}>
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
                      <View style={styles.summaryAccentBar} />
                      <View style={styles.customerInfo}>
                        <Text style={styles.summaryCustomerName} numberOfLines={1}>{delivery.customer_name || t('customer')}</Text>
                        <Text style={styles.summaryCustomerEmail} numberOfLines={1}>{delivery.customer_email || t('noEmailProvided')}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[delivery.status.toLowerCase()]?.bg }]}>
                      <MaterialCommunityIcons name={STATUS_CONFIG[delivery.status.toLowerCase()]?.icon} size={14} color={STATUS_CONFIG[delivery.status.toLowerCase()]?.text} />
                      <Text style={[styles.statusText, { color: STATUS_CONFIG[delivery.status.toLowerCase()]?.text }]}>
                        {delivery.status === 'pending' ? 'ASSIGNED' :
                          delivery.status === 'out_for_delivery' ? 'IN TRANSIT' :
                            t(`status.${delivery.status.toLowerCase()}`).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptySummary}>
                <Text style={styles.emptySummaryText}>{t('noRecentActivities')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// Sub-component for Quick Actions (unused, but kept as is)
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

  // Modern Header with Curved Bottom Right
  headerGradient: {
    backgroundColor: '#6750A4',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 0,
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextContainer: {
    marginLeft: 4,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  avatarRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  greetingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
    marginTop: -1,
    letterSpacing: -0.2,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifButton: {
    position: 'relative',
  },
  notifIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#6750A4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#6750A4',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
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
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionAccentBar: {
    width: 2.5,
    height: 20,
    borderRadius: 1.5,
    backgroundColor: '#6750A4',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#6750A4', marginBottom: 0 },
  seeAllText: { color: '#6750A4', fontWeight: '700' },

  // Hero Card - Professional Style
  heroCard: {
    backgroundColor: '#6750A4',
    borderRadius: 20,
    padding: 18,
    marginBottom: 25,
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  // Card Header
  heroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  heroOrderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroOrderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOrderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  heroStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Customer Section
  heroCustomerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  heroCustomerAvatarWrapper: {
    position: 'relative',
  },
  heroCustomerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroCustomerAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroCustomerAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  heroCustomerDetails: {
    flex: 1,
    gap: 2,
  },
  heroCustomerName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroCustomerPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCustomerPhoneText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  // Progress Tracker
  heroProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 2,
  },
  heroStepWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  heroNodeZone: {
    height: 36,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
    paddingHorizontal: 0,
  },
  heroProgressLine: {
    position: 'absolute',
    height: 2.5,
    top: '50%',
    marginTop: -1.25,
    left: '50%',
    width: '100%',
    zIndex: -1,
  },
  heroStepIndicator: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 2,
  },
  heroIndicatorCompleted: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  heroIndicatorCurrent: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    transform: [{ scale: 1.1 }],
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  heroIndicatorFuture: {
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroPulseRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    opacity: 0.3,
  },
  heroStepLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  heroStepCompleted: {
    color: '#fff',
    fontWeight: '700',
  },
  heroStepCurrent: {
    color: '#F59E0B',
    fontWeight: '800',
  },
  heroStepFuture: {
    color: 'rgba(255,255,255,0.3)',
  },
  heroAddress: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
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
    gap: 10,
    marginBottom: 20,
  },
  summaryItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    borderWidth: 1,
    borderColor: '#F0F2F5',
    overflow: 'hidden',
  },
  summaryItemWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 14,
  },
  summaryAccentBar: {
    width: 2.5,
    height: 30,
    backgroundColor: '#6750A4',
    borderRadius: 2,
    marginHorizontal: 8,
    opacity: 0.5,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
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