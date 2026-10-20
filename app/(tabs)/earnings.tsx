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
import {
  getDriverEarnings,
  getDriverEarningsSummary,
  getDriverPayouts,
} from '@/services/api';
import type { DriverEarningItem, DriverEarningsSummary, DriverPayout } from '@/types';
import OrderEarningDetailModal from '@/components/OrderEarningDetailModal';
import PayoutDetailModal from '@/components/PayoutDetailModal';

const { width } = Dimensions.get('window');

type PeriodType = 'today' | 'this_week' | 'this_month' | 'all';
type PaymentFilterType = 'all' | 'bank_transfer' | 'cod' | 'chapa' | 'telebirr';
type MainTabType = 'orders' | 'payouts';

export default function EarningsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation('deliveryHome');
  const isAmharic = i18n.language?.startsWith('am');

  const [mainTab, setMainTab] = useState<MainTabType>('orders');
  const [period, setPeriod] = useState<PeriodType>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>('all');
  const [allEarnings, setAllEarnings] = useState<DriverEarningItem[]>([]);
  const [summary, setSummary] = useState<DriverEarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<DriverPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DriverEarningItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<DriverPayout | null>(null);
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);

  // Fetch earnings & payouts data
  const fetchData = useCallback(async () => {
    try {
      const [earningsRes, summaryRes, payoutsRes] = await Promise.all([
        getDriverEarnings({ period }),
        getDriverEarningsSummary(),
        getDriverPayouts().catch((err) => {
          console.warn('[EarningsScreen] Error fetching payouts:', err);
          return { data: [] };
        }),
      ]);

      const list = Array.isArray(earningsRes.data)
        ? earningsRes.data
        : (earningsRes.data as any)?.results || [];

      const payoutList = Array.isArray(payoutsRes.data)
        ? payoutsRes.data
        : (payoutsRes.data as any)?.results || [];

      setAllEarnings(list);
      setSummary(summaryRes.data);
      setPayouts(payoutList);
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

  // Payout settlement status badge on delivered orders
  const renderPayoutStatusBadge = (status?: string) => {
    if (status === 'confirmed') {
      return (
        <View style={[styles.payoutStatusPill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Ionicons name="checkmark-done" size={10} color="#16A34A" style={{ marginRight: 2 }} />
          <Text style={[styles.payoutStatusPillText, { color: '#16A34A' }]}>{t('paid', 'Paid')}</Text>
        </View>
      );
    }
    if (status === 'disbursed') {
      return (
        <View style={[styles.payoutStatusPill, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Ionicons name="time" size={10} color="#D97706" style={{ marginRight: 2 }} />
          <Text style={[styles.payoutStatusPillText, { color: '#D97706' }]}>{t('disbursed', 'Disbursed')}</Text>
        </View>
      );
    }
    if (status === 'disputed') {
      return (
        <View style={[styles.payoutStatusPill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Ionicons name="alert-circle" size={10} color="#DC2626" style={{ marginRight: 2 }} />
          <Text style={[styles.payoutStatusPillText, { color: '#DC2626' }]}>{t('disputed', 'Disputed')}</Text>
        </View>
      );
    }
    return (
      <View style={[styles.payoutStatusPill, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
        <Ionicons name="hourglass-outline" size={10} color="#64748B" style={{ marginRight: 2 }} />
        <Text style={[styles.payoutStatusPillText, { color: '#64748B' }]}>{t('unpaid', 'Unpaid')}</Text>
      </View>
    );
  };

  // Payouts awaiting driver confirmation
  const pendingPayouts = useMemo(() => {
    return payouts.filter((p) => p.status === 'disbursed');
  }, [payouts]);
  const pendingPayout = pendingPayouts.length > 0 ? pendingPayouts[0] : null;

  // Disputed payouts under review
  const disputedPayouts = useMemo(() => {
    return payouts.filter((p) => p.status === 'disputed');
  }, [payouts]);

  const renderOrderItem = ({ item }: { item: DriverEarningItem }) => {
    const fee = parseFloat(item.driver_earning || item.delivery_fee || '0').toFixed(2);
    const dateStr = item.completed_at
      ? new Date(item.completed_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : item.assigned_at
      ? new Date(item.assigned_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      : '';

    const companyName =
      isAmharic && item.company_name_am
        ? item.company_name_am
        : item.company_name || t('vendor', 'Store');

    const orderId =
      item.master_order_id && item.vendor_order_id
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
        {/* Row 1: Order # + Store & Delivery Fee */}
        <View style={styles.cardTopRow}>
          <View style={styles.orderNumberRow}>
            <View style={styles.cardIconCircle}>
              <MaterialCommunityIcons name="moped" size={18} color="#6750A4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderNumberText}>#{orderId}</Text>
              <Text style={styles.storeNameText} numberOfLines={1}>
                {companyName}
              </Text>
            </View>
          </View>

          <View style={styles.earningAmountBox}>
            <Text style={styles.earningPlusText}>+{fee}</Text>
            <Text style={styles.earningCurrencyText}>{t('etb', 'ETB')}</Text>
          </View>
        </View>

        {/* Row 2: Customer Name & Completion Time */}
        <View style={styles.cardMiddleRow}>
          <View style={styles.customerRow}>
            <Ionicons name="person-outline" size={13} color="#64748B" />
            <Text style={styles.customerText} numberOfLines={1}>
              {item.customer_name || t('customer', 'Customer')}
            </Text>
          </View>
          {!!dateStr && (
            <View style={styles.dateRow}>
              <Ionicons name="time-outline" size={12} color="#94A3B8" />
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
          )}
        </View>

        {/* Row 3: Responsive Badges (Payment, Payout Status, COD Handover) */}
        <View style={styles.cardBadgesRow}>
          {renderPaymentBadge(item.payment_method, item.payment_method_display)}
          {renderPayoutStatusBadge(item.payout_status)}
          {item.payment_method?.toLowerCase() === 'cod' && (
            <View
              style={[
                styles.payoutStatusPill,
                {
                  backgroundColor: item.cod_payment_confirmed ? '#F0FDF4' : '#FFFBEB',
                  borderColor: item.cod_payment_confirmed ? '#BBF7D0' : '#FDE68A',
                },
              ]}
            >
              <Ionicons
                name={item.cod_payment_confirmed ? 'checkmark-circle' : 'cash-outline'}
                size={10}
                color={item.cod_payment_confirmed ? '#16A34A' : '#D97706'}
                style={{ marginRight: 2 }}
              />
              <Text
                style={[
                  styles.payoutStatusPillText,
                  { color: item.cod_payment_confirmed ? '#16A34A' : '#D97706' },
                ]}
              >
                {item.cod_payment_confirmed
                  ? t('codHandedIn', 'COD Handed In')
                  : t('codPendingTurnIn', 'COD Pending Turn-in')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render payout batch item
  const renderPayoutItem = ({ item }: { item: DriverPayout }) => {
    const compName = isAmharic && item.company_name_am ? item.company_name_am : item.company_name;
    const isAwaiting = item.status === 'disbursed';
    const isConfirmed = item.status === 'confirmed';
    const isDisputed = item.status === 'disputed';

    const dateStr = item.disbursed_at
      ? new Date(item.disbursed_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date(item.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });

    return (
      <TouchableOpacity
        style={[styles.payoutCard, isAwaiting && styles.payoutCardAwaiting]}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedPayout(item);
          setPayoutModalVisible(true);
        }}
      >
        {/* Row 1: Payout Number & Store on left, Net Amount on right */}
        <View style={styles.payoutCardTopRow}>
          <View style={styles.payoutNumberGroup}>
            <View
              style={[
                styles.payoutIconCircle,
                isAwaiting
                  ? { backgroundColor: '#FEF3C7' }
                  : isConfirmed
                  ? { backgroundColor: '#DCFCE7' }
                  : isDisputed
                  ? { backgroundColor: '#FEE2E2' }
                  : { backgroundColor: '#F1F5F9' },
              ]}
            >
              <MaterialCommunityIcons
                name={isAwaiting ? 'alert-circle' : isConfirmed ? 'check-decagram' : isDisputed ? 'alert-octagon' : 'cash-multiple'}
                size={18}
                color={isAwaiting ? '#D97706' : isConfirmed ? '#16A34A' : isDisputed ? '#DC2626' : '#64748B'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.payoutNumberText}>#{item.payout_number}</Text>
                {/* <View style={styles.payoutTypeTag}>
                  <Text style={styles.payoutTypeTagText}>{item.payout_type?.toUpperCase()}</Text>
                </View> */}
              </View>
              <Text style={styles.payoutStoreText} numberOfLines={1}>{compName}</Text>
            </View>
          </View>

          <View style={styles.payoutAmountBox}>
            <Text style={styles.payoutAmountText}>
              {parseFloat(item.net_payout_amount).toFixed(2)}
            </Text>
            <Text style={styles.payoutCurrencyText}>{t('etb', 'ETB')}</Text>
          </View>
        </View>

        {/* Row 2: Metadata (Items count, date, payment channel) */}
        <View style={styles.payoutCardMiddleRow}>
          {item.status === 'cancelled' ? (
            <View style={styles.payoutMetaItem}>
              <Ionicons name="arrow-undo-outline" size={12} color="#64748B" />
              <Text style={styles.payoutMetaText}>
                {t('ordersReleased', 'Orders Released')}
              </Text>
            </View>
          ) : (
            <View style={styles.payoutMetaItem}>
              <Ionicons name="receipt-outline" size={12} color="#64748B" />
              <Text style={styles.payoutMetaText}>
                {item.items_count === 1
                  ? t('orderSettled_one', { count: 1, defaultValue: '1 Order Settled' })
                  : t('ordersSettled_other', { count: item.items_count, defaultValue: `${item.items_count} Orders Settled` })}
              </Text>
            </View>
          )}
          <Text style={styles.payoutMetaDot}>•</Text>
          <Text style={styles.payoutMetaText}>{dateStr}</Text>
          {!!item.payment_method && (
            <>
              <Text style={styles.payoutMetaDot}>•</Text>
              <Text style={styles.payoutMetaText}>{item.payment_method.toUpperCase()}</Text>
            </>
          )}
        </View>

        {/* Row 3: Status Badge & Tap Action Hint */}
        <View style={styles.payoutCardBottomRow}>
          <View
            style={[
              styles.payoutBadge,
              isAwaiting
                ? { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }
                : isConfirmed
                ? { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }
                : isDisputed
                ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
                : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
            ]}
          >
            <Ionicons
              name={
                isAwaiting
                  ? 'time'
                  : isConfirmed
                  ? 'checkmark-circle'
                  : isDisputed
                  ? 'alert-circle'
                  : 'close-circle'
              }
              size={12}
              color={
                isAwaiting
                  ? '#D97706'
                  : isConfirmed
                  ? '#16A34A'
                  : isDisputed
                  ? '#DC2626'
                  : '#64748B'
              }
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.payoutBadgeText,
                {
                  color: isAwaiting
                    ? '#D97706'
                    : isConfirmed
                    ? '#16A34A'
                    : isDisputed
                    ? '#DC2626'
                    : '#64748B',
                },
              ]}
            >
              {isAwaiting
                ? t('awaitingYourConfirmation', 'Awaiting Your Confirmation')
                : isConfirmed
                ? t('confirmedAndPaid', 'Confirmed & Paid')
                : isDisputed
                ? t('disputedUnderReview', 'Disputed / Under Review')
                : item.status === 'cancelled'
                ? t('cancelled', 'Cancelled')
                : item.status}
            </Text>
          </View>

          <View style={styles.payoutActionHint}>
            <Text
              style={[
                styles.payoutActionHintText,
                isAwaiting
                  ? { color: '#6750A4' }
                  : isDisputed
                  ? { color: '#DC2626' }
                  : { color: '#64748B' },
              ]}
            >
              {isAwaiting
                ? t('reviewAndConfirm', 'Review & Confirm')
                : isDisputed
                ? t('viewDispute', 'View Dispute')
                : t('receiptDetails', 'Receipt Details')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={13}
              color={isAwaiting ? '#6750A4' : isDisputed ? '#DC2626' : '#64748B'}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentListData = mainTab === 'orders' ? filteredEarnings : (payouts as any[]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top App Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>{t('driverEarningsTitle', 'Earning History')}</Text>
        </View>
        <TouchableOpacity style={styles.headerActionBtn} onPress={onRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh" size={26} color="#6750A4" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <FlatList
        data={currentListData}
        keyExtractor={(item: any) =>
          mainTab === 'orders'
            ? item.id.toString()
            : item.id ? `payout-${item.id}` : item.payout_number
        }
        renderItem={({ item }: any) =>
          mainTab === 'orders'
            ? renderOrderItem({ item })
            : renderPayoutItem({ item })
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6750A4']} />
        }
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Urgent Payout Confirmation Banner (Single Payout) */}
            {pendingPayouts.length === 1 && pendingPayout && (
              <TouchableOpacity
                style={styles.pendingActionBanner}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedPayout(pendingPayout);
                  setPayoutModalVisible(true);
                }}
              >
                <View style={styles.pendingBannerIcon}>
                  <MaterialCommunityIcons name="hand-coin" size={24} color="#D97706" />
                </View>
                <View style={styles.pendingBannerContent}>
                  <View style={styles.pendingBannerTitleRow}>
                    <Text style={styles.pendingBannerTitle}>
                      {t('payoutActionTitle', 'Payout Received?')}
                    </Text>
                    <View style={styles.pendingBannerBadge}>
                      <Text style={styles.pendingBannerBadgeText}>{t('actionNeeded', 'Action Needed')}</Text>
                    </View>
                  </View>
                  <Text style={styles.pendingBannerSub}>
                    {isAmharic && pendingPayout.company_name_am ? pendingPayout.company_name_am : pendingPayout.company_name} · ETB {parseFloat(pendingPayout.net_payout_amount).toFixed(2)}
                  </Text>
                  <View style={styles.pendingBannerBtnRow}>
                    <View style={styles.confirmInlineBtn}>
                      <Text style={styles.confirmInlineBtnText}>{t('confirmReceived', 'Confirm Received')}</Text>
                      <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Multi-Payout Action Banner (When multiple stores disbursed) */}
            {pendingPayouts.length > 1 && (
              <TouchableOpacity
                style={styles.pendingActionBanner}
                activeOpacity={0.9}
                onPress={() => {
                  setMainTab('payouts');
                }}
              >
                <View style={styles.pendingBannerIcon}>
                  <MaterialCommunityIcons name="wallet-giftcard" size={24} color="#D97706" />
                </View>
                <View style={styles.pendingBannerContent}>
                  <View style={styles.pendingBannerTitleRow}>
                    <Text style={styles.pendingBannerTitle}>
                      {t('multiPayoutsAwaitingTitle', {
                        count: pendingPayouts.length,
                        defaultValue: `${pendingPayouts.length} Payouts Awaiting Confirmation`,
                      })}
                    </Text>
                    <View style={styles.pendingBannerBadge}>
                      <Text style={styles.pendingBannerBadgeText}>{t('actionNeeded', 'Action Needed')}</Text>
                    </View>
                  </View>
                  <Text style={styles.pendingBannerSub}>
                    {t('multiPayoutsAwaitingSub', {
                      count: pendingPayouts.length,
                      total: pendingPayouts
                        .reduce((sum, p) => sum + parseFloat(p.net_payout_amount || '0'), 0)
                        .toFixed(2),
                      defaultValue: `Total: ETB ${pendingPayouts
                        .reduce((sum, p) => sum + parseFloat(p.net_payout_amount || '0'), 0)
                        .toFixed(2)} across ${pendingPayouts.length} stores`,
                    })}
                  </Text>
                  <View style={styles.pendingBannerBtnRow}>
                    <View style={styles.confirmInlineBtn}>
                      <Text style={styles.confirmInlineBtnText}>{t('reviewPayouts', 'Review Payouts')}</Text>
                      <Ionicons name="arrow-forward" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Disputed Payouts Notice Banner */}
            {disputedPayouts.length > 0 && (
              <TouchableOpacity
                style={[styles.pendingActionBanner, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                activeOpacity={0.9}
                onPress={() => {
                  setMainTab('payouts');
                }}
              >
                <View style={[styles.pendingBannerIcon, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#DC2626" />
                </View>
                <View style={styles.pendingBannerContent}>
                  <View style={styles.pendingBannerTitleRow}>
                    <Text style={[styles.pendingBannerTitle, { color: '#991B1B' }]} numberOfLines={1}>
                      {disputedPayouts.length === 1
                        ? t('disputeTitleSingle', 'Payout Dispute')
                        : t('disputeTitleMulti', {
                            count: disputedPayouts.length,
                            defaultValue: `${disputedPayouts.length} Payout Disputes`,
                          })}
                    </Text>
                    <View style={[styles.pendingBannerBadge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA', borderWidth: 1 }]}>
                      <Text style={[styles.pendingBannerBadgeText, { color: '#DC2626' }]}>{t('underReview', 'Under Review')}</Text>
                    </View>
                  </View>
                  <Text style={[styles.pendingBannerSub, { color: '#B91C1C' }]}>
                    {t('disputeBannerSub', 'Store admin is reviewing your reported issue. Tap to view resolution details.')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

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

            {/* Settlement Overview Card (Unpaid Balance vs Settled Payouts) */}
            <View style={styles.settlementOverviewCard}>
              <View style={styles.settlementCol}>
                <View style={styles.settlementIconRow}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#D97706" />
                  <Text style={styles.settlementLabel}>{t('unpaidBalance', 'Unpaid Balance')}</Text>
                </View>
                <Text style={styles.settlementValueUnpaid}>
                  {summary?.unpaid_balance ?? '0.00'} <Text style={styles.settlementCurrency}>{t('etb', 'ETB')}</Text>
                </Text>
              </View>

              <View style={styles.settlementDivider} />

              <View style={styles.settlementCol}>
                <View style={styles.settlementIconRow}>
                  <Ionicons name="checkmark-done-circle-outline" size={14} color="#16A34A" />
                  <Text style={styles.settlementLabel}>{t('totalPaidOut', 'Settled Payouts')}</Text>
                </View>
                <Text style={styles.settlementValuePaid}>
                  {summary?.total_paid_out ?? '0.00'} <Text style={styles.settlementCurrency}>{t('etb', 'ETB')}</Text>
                </Text>
              </View>
            </View>

            {/* Main Tabs Switcher: Orders vs Payouts */}
            <View style={styles.mainTabSwitch}>
              <TouchableOpacity
                style={[styles.mainTabBtn, mainTab === 'orders' && styles.mainTabBtnActive]}
                onPress={() => setMainTab('orders')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="moped-outline"
                  size={16}
                  color={mainTab === 'orders' ? '#6750A4' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.mainTabText, mainTab === 'orders' && styles.mainTabTextActive]}>
                  {t('ordersTab', 'Orders')} ({filteredEarnings.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainTabBtn, mainTab === 'payouts' && styles.mainTabBtnActive]}
                onPress={() => setMainTab('payouts')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={16}
                  color={mainTab === 'payouts' ? '#6750A4' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.mainTabText, mainTab === 'payouts' && styles.mainTabTextActive]}>
                  {t('payoutsTab', 'Payouts')} ({payouts.length})
                </Text>
                {payouts.some((p) => p.status === 'disbursed') && (
                  <View style={styles.pendingDot} />
                )}
              </TouchableOpacity>
            </View>

            {/* Payment Method Filter Tabs (Only shown when orders tab is active) */}
            {mainTab === 'orders' && (
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
            )}

            {/* Feed Section Title */}
            <View style={styles.feedHeader}>
              <Text style={styles.feedTitle}>
                {mainTab === 'orders'
                  ? t('orderEarningsFeed', 'Delivered Orders & Compensation')
                  : t('payoutHistory', 'Payout History')}
              </Text>
              <Text style={styles.feedCount}>
                {mainTab === 'orders'
                  ? filteredEarnings.length === 1
                    ? t('ordersCount_one', { count: 1, defaultValue: '1 Order' })
                    : t('ordersCount_other', { count: filteredEarnings.length, defaultValue: `${filteredEarnings.length} Orders` })
                  : payouts.length === 1
                    ? t('payoutCount_one', { count: 1, defaultValue: '1 Payout' })
                    : t('payoutCount_other', { count: payouts.length, defaultValue: `${payouts.length} Payouts` })}
              </Text>
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
                <MaterialCommunityIcons
                  name={mainTab === 'orders' ? 'wallet-outline' : 'cash-remove'}
                  size={36}
                  color="#94A3B8"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {mainTab === 'orders'
                  ? t('noEarningsFound', 'No Earning History Yet')
                  : t('noPayoutsFound', 'No Payouts Yet')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {mainTab === 'orders'
                  ? t('noEarningsSub', 'Completed delivered orders will appear here with transparent delivery fees.')
                  : t('noPayoutsSub', 'When companies issue your payouts, they will appear here.')}
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
        onViewPayout={(payoutId) => {
          setModalVisible(false);
          const found = payouts.find((p) => p.id === payoutId);
          if (found) {
            setSelectedPayout(found);
            setPayoutModalVisible(true);
          } else {
            setMainTab('payouts');
          }
        }}
      />

      {/* Payout Detail & Confirmation Modal */}
      <PayoutDetailModal
        visible={payoutModalVisible}
        payout={selectedPayout}
        onClose={() => {
          setPayoutModalVisible(false);
          setSelectedPayout(null);
        }}
        onPayoutUpdated={(updated) => {
          fetchData();
          setSelectedPayout(updated);
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
  cardMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  customerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
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
  // Pending Action Banner
  pendingActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pendingBannerContent: {
    flex: 1,
  },
  pendingBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    flex: 1,
    flexShrink: 1,
  },
  pendingBannerBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  pendingBannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingBannerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    marginBottom: 8,
  },
  pendingBannerBtnRow: {
    flexDirection: 'row',
  },
  confirmInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6750A4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  confirmInlineBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Settlement Overview Card
  settlementOverviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
    alignItems: 'center',
  },
  settlementCol: {
    flex: 1,
    alignItems: 'center',
  },
  settlementIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  settlementLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  settlementValueUnpaid: {
    fontSize: 16,
    fontWeight: '900',
    color: '#D97706',
  },
  settlementValuePaid: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A',
  },
  settlementCurrency: {
    fontSize: 10,
    fontWeight: '700',
  },
  settlementDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  // Main Tabs Switcher (Orders vs Payouts)
  mainTabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    position: 'relative',
  },
  mainTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  mainTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  mainTabTextActive: {
    color: '#6750A4',
    fontWeight: '800',
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    position: 'absolute',
    top: 8,
    right: 12,
  },
  // Order Payout Status Pill
  payoutStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  payoutStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Payout Batch Cards
  payoutCard: {
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
  payoutCardAwaiting: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF7',
  },
  payoutCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payoutNumberGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  payoutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  payoutTypeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  payoutTypeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  payoutStoreText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  payoutAmountBox: {
    alignItems: 'flex-end',
  },
  payoutAmountText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A',
  },
  payoutCurrencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  payoutCardMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  payoutCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  payoutMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payoutMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  payoutMetaDot: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  payoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  payoutBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  payoutActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  payoutActionHintText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
