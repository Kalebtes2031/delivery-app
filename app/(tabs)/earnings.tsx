import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getDriverEarnings, getDriverEarningsSummary } from '@/services/api';
import type { DriverEarningItem, DriverEarningsSummary } from '@/types';
import OrderEarningDetailModal from '@/components/OrderEarningDetailModal';

const { width } = Dimensions.get('window');

type PeriodType = 'today' | 'this_week' | 'this_month' | 'all';
type PaymentFilterType = 'all' | 'bank_transfer' | 'cod' | 'chapa' | 'telebirr';

export default function EarningsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('deliveryHome');
  const isAmharic = i18n.language?.startsWith('am');

  const [period, setPeriod] = useState<PeriodType>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>('all');
  const [allEarnings, setAllEarnings] = useState<DriverEarningItem[]>([]);
  const [summary, setSummary] = useState<DriverEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DriverEarningItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch earnings data for the selected period
  const fetchData = useCallback(async () => {
    try {
      const [earningsRes, summaryRes] = await Promise.all([
        getDriverEarnings({ period }),
        getDriverEarningsSummary(),
      ]);

      const list = Array.isArray(earningsRes.data)
        ? earningsRes.data
        : (earningsRes.data as any)?.results || [];

      setAllEarnings(list);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('[EarningsScreen] Error fetching earnings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Compute order counts per payment method from the current period dataset
  const counts = useMemo(() => {
    const res = {
      all: allEarnings.length,
      bank_transfer: 0,
      cod: 0,
      chapa: 0,
      telebirr: 0,
    };
    for (const item of allEarnings) {
      const pm = item.payment_method?.toLowerCase();
      if (pm === 'bank_transfer') res.bank_transfer++;
      else if (pm === 'cod') res.cod++;
      else if (pm === 'chapa') res.chapa++;
      else if (pm === 'telebirr') res.telebirr++;
    }
    return res;
  }, [allEarnings]);

  // Filtered dataset according to active tab
  const filteredEarnings = useMemo(() => {
    if (paymentFilter === 'all') return allEarnings;
    return allEarnings.filter(
      (item) => item.payment_method?.toLowerCase() === paymentFilter
    );
  }, [allEarnings, paymentFilter]);

  // Payment filter tabs list with counts
  const filterTabs: Array<{ key: PaymentFilterType; label: string; count: number }> = [
    { key: 'all', label: t('allPayments', 'All'), count: counts.all },
    { key: 'bank_transfer', label: t('paymentBankTransfer', 'Bank Transfer'), count: counts.bank_transfer },
    { key: 'cod', label: t('paymentCOD', 'COD'), count: counts.cod },
    { key: 'chapa', label: t('paymentChapa', 'Chapa'), count: counts.chapa },
    { key: 'telebirr', label: t('paymentTelebirr', 'Telebirr'), count: counts.telebirr },
  ];

  // Determine hero card display amount based on selected period
  const getHeroAmount = () => {
    if (!summary) return '0.00';
    switch (period) {
      case 'today':
        return summary.today_earnings || '0.00';
      case 'this_week':
        return summary.week_earnings || '0.00';
      case 'this_month':
        return summary.month_earnings || '0.00';
      case 'all':
      default:
        return summary.total_lifetime_earnings || '0.00';
    }
  };

  // Determine completed trips based on selected period
  const getPeriodCompletedTrips = () => {
    if (!summary) return allEarnings.length;
    switch (period) {
      case 'today':
        return summary.today_completed_trips ?? allEarnings.length;
      case 'this_week':
        return summary.week_completed_trips ?? allEarnings.length;
      case 'this_month':
        return summary.month_completed_trips ?? allEarnings.length;
      case 'all':
      default:
        return summary.total_completed_trips ?? allEarnings.length;
    }
  };

  // Determine average per delivery based on selected period
  const getPeriodAvgPerDelivery = () => {
    if (!summary) {
      const trips = allEarnings.length;
      if (trips === 0) return '0.00';
      const sum = allEarnings.reduce((acc, it) => acc + parseFloat(it.driver_earning || it.delivery_fee || '0'), 0);
      return (sum / trips).toFixed(2);
    }
    switch (period) {
      case 'today':
        if (summary.today_average_per_order !== undefined) return summary.today_average_per_order;
        break;
      case 'this_week':
        if (summary.week_average_per_order !== undefined) return summary.week_average_per_order;
        break;
      case 'this_month':
        if (summary.month_average_per_order !== undefined) return summary.month_average_per_order;
        break;
      case 'all':
      default:
        return summary.average_per_order || '0.00';
    }
    const trips = getPeriodCompletedTrips();
    if (trips === 0) return '0.00';
    const amount = parseFloat(getHeroAmount());
    return (amount / trips).toFixed(2);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return t('todayEarnings', "TODAY'S EARNINGS");
      case 'this_week':
        return t('weekEarnings', "THIS WEEK'S EARNINGS");
      case 'this_month':
        return t('monthEarnings', "THIS MONTH'S EARNINGS");
      case 'all':
      default:
        return t('lifetimeEarnings', 'TOTAL LIFETIME EARNINGS');
    }
  };

  // Payment badge helper
  const renderPaymentBadge = (method: string, displayLabel?: string) => {
    switch (method?.toLowerCase()) {
      case 'bank_transfer':
        return (
          <View style={[styles.paymentBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <MaterialCommunityIcons name="bank" size={12} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={[styles.paymentBadgeText, { color: '#2563EB' }]}>
              {t('paymentBankTransfer', 'Bank Transfer')}
            </Text>
          </View>
        );
      case 'cod':
        return (
          <View style={[styles.paymentBadge, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={12} color="#EA580C" style={{ marginRight: 4 }} />
            <Text style={[styles.paymentBadgeText, { color: '#EA580C' }]}>
              {t('paymentCOD', 'COD')}
            </Text>
          </View>
        );
      case 'chapa':
        return (
          <View style={[styles.paymentBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <MaterialCommunityIcons name="credit-card-check-outline" size={12} color="#16A34A" style={{ marginRight: 4 }} />
            <Text style={[styles.paymentBadgeText, { color: '#16A34A' }]}>
              {t('paymentChapa', 'Chapa')}
            </Text>
          </View>
        );
      case 'telebirr':
        return (
          <View style={[styles.paymentBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
            <MaterialCommunityIcons name="cellphone-check" size={12} color="#7C3AED" style={{ marginRight: 4 }} />
            <Text style={[styles.paymentBadgeText, { color: '#7C3AED' }]}>
              {t('paymentTelebirr', 'Telebirr')}
            </Text>
          </View>
        );
      case 'online':
      default:
        return (
          <View style={[styles.paymentBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <MaterialCommunityIcons name="credit-card-check-outline" size={12} color="#16A34A" style={{ marginRight: 4 }} />
            <Text style={[styles.paymentBadgeText, { color: '#16A34A' }]}>
              {displayLabel || t('paymentOnline', 'Online')}
            </Text>
          </View>
        );
    }
  };

  const renderOrderItem = ({ item }: { item: DriverEarningItem }) => {
    const fee = parseFloat(item.driver_earning || item.delivery_fee || '0').toFixed(2);
    const dateStr = item.completed_at
      ? new Date(item.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : item.assigned_at
        ? new Date(item.assigned_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : '';

    const companyName = isAmharic && item.company_name_am
      ? item.company_name_am
      : item.company_name || t('vendor', 'Store');

    const orderId = item.master_order_id && item.vendor_order_id
      ? `${item.master_order_id}-${item.vendor_order_id}`
      : (item.order_number || '').replace(/^MO-/, '').replace(/-VO-/, '-');
    const displayOrderNumber = t('orderNumber', { id: orderId, defaultValue: `Order #${orderId}` });

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedOrder(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.orderNumberRow}>
            <View style={styles.cardIconCircle}>
              <MaterialCommunityIcons name="moped" size={18} color="#6750A4" />
            </View>
            <View>
              <Text style={styles.orderNumberText}>{displayOrderNumber}</Text>
              <Text style={styles.storeNameText} numberOfLines={1}>{companyName}</Text>
            </View>
          </View>

          <View style={styles.earningAmountBox}>
            <Text style={styles.earningPlusText}>+{fee}</Text>
            <Text style={styles.earningCurrencyText}>{t('etb', 'ETB')}</Text>
          </View>
        </View>

        <View style={styles.cardBottomRow}>
          <View style={styles.customerRow}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            <Text style={styles.customerText} numberOfLines={1}>
              {item.customer_name || t('customer', 'Customer')}
            </Text>
          </View>

          <View style={styles.badgeAndDate}>
            {renderPaymentBadge(item.payment_method, item.payment_method_display)}
            {!!dateStr && <Text style={styles.dateText}>{dateStr}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top App Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>{t('driverEarningsTitle', 'Earning History')}</Text>
          {/* <Text style={styles.screenSubtitle}>
            {t('earningsSubtitle', 'Transparent per-order delivery compensation')}
          </Text> */}
        </View>
        <TouchableOpacity style={styles.headerActionBtn} onPress={onRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh" size={26} color="#6750A4" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <FlatList
        data={filteredEarnings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6750A4']} />
        }
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Period Segment Selector */}
            <View style={styles.periodSelector}>
              {[
                { key: 'today', label: t('periodToday', 'Today') },
                { key: 'this_week', label: t('periodWeek', 'Week') },
                { key: 'this_month', label: t('periodMonth', 'Month') },
                { key: 'all', label: t('periodAll', 'All Time') },
              ].map((p) => {
                const active = period === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.periodTab, active && styles.periodTabActive]}
                    onPress={() => setPeriod(p.key as PeriodType)}
                    activeOpacity={0.7}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={[styles.periodTabText, active && styles.periodTabTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Primary Hero Financial Card */}
            <View style={styles.heroCard}>
              {/* <View style={styles.heroGlow} /> */}
              <Text style={styles.heroLabel}>{getPeriodLabel()}</Text>

              <View style={styles.heroAmountRow}>
                <Text style={styles.heroCurrency}>{t('etb', 'ETB')}</Text>
                <Text style={styles.heroAmount}>+{getHeroAmount()}</Text>
              </View>

              {/* Quick Sub-Stats inside Hero */}
              <View style={styles.heroMetricsRow}>
                <View style={styles.heroMetricItem}>
                  <Text style={styles.heroMetricVal}>{getPeriodCompletedTrips()}</Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={styles.heroMetricLbl}>{t('completedTrips', 'Completed Deliveries')}</Text>
                </View>
                <View style={styles.heroMetricDivider} />
                <View style={styles.heroMetricItem}>
                  <Text style={styles.heroMetricVal}>
                    {getPeriodAvgPerDelivery()} {t('etb', 'ETB')}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={styles.heroMetricLbl}>{t('avgPerDelivery', 'Avg / Delivery')}</Text>
                </View>
              </View>
            </View>

            {/* Channels Earning Breakdown (Pure Delivery Compensation) */}
            {/* <View style={styles.channelsCard}>
              <Text style={styles.channelsHeaderTitle}>
                {t('earningsByChannel', 'LIFETIME EARNINGS BY PAYMENT CHANNEL')}
              </Text>
              <View style={styles.channelsRow}>
               
                <View style={styles.channelCol}>
                  <View style={[styles.channelIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <MaterialCommunityIcons name="bank" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.channelLabel} numberOfLines={1}>{t('paymentBankTransfer', 'Bank Transfer')}</Text>
                  <Text style={[styles.channelValue, { color: '#2563EB' }]}>
                    {summary?.payment_breakdown?.bank_transfer || '0.00'} {t('etb', 'ETB')}
                  </Text>
                </View>

                <View style={styles.channelDivider} />

                
                <View style={styles.channelCol}>
                  <View style={[styles.channelIconBox, { backgroundColor: '#FFF7ED' }]}>
                    <MaterialCommunityIcons name="cash-multiple" size={16} color="#EA580C" />
                  </View>
                  <Text style={styles.channelLabel} numberOfLines={1}>{t('paymentCOD', 'COD')}</Text>
                  <Text style={[styles.channelValue, { color: '#EA580C' }]}>
                    {summary?.payment_breakdown?.cod || '0.00'} {t('etb', 'ETB')}
                  </Text>
                </View>

                <View style={styles.channelDivider} />

               
                <View style={styles.channelCol}>
                  <View style={[styles.channelIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <MaterialCommunityIcons name="credit-card-check-outline" size={16} color="#16A34A" />
                  </View>
                  <Text style={styles.channelLabel} numberOfLines={1}>{t('paymentChapa', 'Chapa')}</Text>
                  <Text style={[styles.channelValue, { color: '#16A34A' }]}>
                    {summary?.payment_breakdown?.chapa || '0.00'} {t('etb', 'ETB')}
                  </Text>
                </View>

                <View style={styles.channelDivider} />

               
                <View style={styles.channelCol}>
                  <View style={[styles.channelIconBox, { backgroundColor: '#F5F3FF' }]}>
                    <MaterialCommunityIcons name="cellphone-check" size={16} color="#7C3AED" />
                  </View>
                  <Text style={styles.channelLabel} numberOfLines={1}>{t('paymentTelebirr', 'Telebirr')}</Text>
                  <Text style={[styles.channelValue, { color: '#7C3AED' }]}>
                    {summary?.payment_breakdown?.telebirr || '0.00'} {t('etb', 'ETB')}
                  </Text>
                </View>
              </View>
            </View> */}


            {/* Payment Method Filter Tabs (Horizontally scrollable with count badges like cash-on-hand) */}
            <View style={styles.filterSection}>
              <Text style={styles.filterHeaderTitle}>{t('filterByPaymentMethod', 'FILTER BY PAYMENT')}</Text>
              <View style={styles.tabsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsScrollContent}
                >
                  {filterTabs.map((tab) => {
                    const active = paymentFilter === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.tabButton, active && styles.tabButtonActive]}
                        onPress={() => setPaymentFilter(tab.key)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>
                          {tab.label}
                        </Text>
                        <View
                          style={[
                            styles.tabCountBadge,
                            active ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.tabCountBadgeText,
                              active && styles.tabCountBadgeTextActive,
                            ]}
                          >
                            {tab.count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Feed Section Title */}
            <View style={styles.feedHeader}>
              <Text style={styles.feedTitle}>{t('orderEarningsFeed', 'Delivered Orders & Compensation')}</Text>
              <Text style={styles.feedCount}>{filteredEarnings.length} {t('orders', 'Orders')}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#6750A4" />
              <Text style={styles.loadingText}>{t('loadingEarnings', 'Loading earning records...')}</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="wallet-outline" size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>{t('noEarningsFound', 'No Earning History Yet')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('noEarningsSub', 'Completed delivered orders will appear here with transparent delivery fees.')}
              </Text>
            </View>
          )
        }
      />

      {/* Order Earning Detail Modal */}
      <OrderEarningDetailModal
        visible={modalVisible}
        order={selectedOrder}
        onClose={() => {
          setModalVisible(false);
          setSelectedOrder(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#6750A4',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    // backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerComponent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  periodTabTextActive: {
    color: '#6750A4',
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: '#6750A4',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E9D5FF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  heroCurrency: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3E8FF',
  },
  heroAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  heroMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroMetricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroMetricLbl: {
    fontSize: 10,
    color: '#E9D5FF',
    fontWeight: '600',
    marginTop: 2,
  },
  heroMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  channelsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  channelsHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  channelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelCol: {
    flex: 1,
    alignItems: 'center',
  },
  channelIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  channelLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 2,
  },
  channelValue: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  channelDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 4,
    paddingHorizontal: 4,
  },
  tabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabButton: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 140,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#6750A4',
    paddingHorizontal: 12,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountBadgeInactive: {
    backgroundColor: '#CBD5E1',
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  tabCountBadgeTextActive: {
    color: '#FFFFFF',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  feedCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  storeNameText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  earningAmountBox: {
    alignItems: 'flex-end',
  },
  earningPlusText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A',
  },
  earningCurrencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  customerText: {
    fontSize: 12,
    color: '#64748B',
  },
  badgeAndDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
