import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { DriverEarningItem } from '@/types';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';

interface OrderEarningDetailModalProps {
  visible: boolean;
  order: DriverEarningItem | null;
  onClose: () => void;
  onViewPayout?: (payoutId: number) => void;
}

const { width } = Dimensions.get('window');

export default function OrderEarningDetailModal({
  visible,
  order,
  onClose,
  onViewPayout,
}: OrderEarningDetailModalProps) {
  const { t, i18n } = useTranslation('deliveryHome');
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const isAmharic = i18n.language?.startsWith('am');

  // ─── Dark-mode aware design tokens ───────────────────────────────
  const brand = isDark ? '#6750A4' : '#6750A4';
  const brandSoftBg = isDark ? '#222222' : '#F5F3FF';
  const brandBorder = isDark ? '#333333' : '#DDD6FE';
  const sectionBg = isDark ? '#1A1A1A' : '#F8FAFC';
  const sectionBorder = isDark ? '#222222' : '#E2E8F0';
  const dividerColor = isDark ? '#333333' : '#E2E8F0';
  const routeLineColor = isDark ? '#444444' : '#CBD5E1';
  const iconCircleBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const closeBtnBg = isDark ? '#222222' : '#F1F5F9';
  const closeBtnIcon = isDark ? '#FFFFFF' : '#64748B';
  const heroBg = isDark ? '#0000002a' : '#6750A4';

  if (!order) return null;

  const earningAmount = parseFloat(order.driver_earning || order.delivery_fee || '0').toFixed(2);
  const orderTotal = parseFloat(order.order_total || '0').toFixed(2);
  const completedDate = order.completed_at
    ? new Date(order.completed_at).toLocaleString()
    : order.assigned_at
    ? new Date(order.assigned_at).toLocaleString()
    : '';

  const companyName = isAmharic && order.company_name_am
    ? order.company_name_am
    : order.company_name || t('vendor', 'Store');

  // Payment Method configuration
  const getPaymentDetails = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'bank_transfer':
        return {
          label: t('paymentBankTransfer', 'Bank Transfer'),
          icon: 'bank' as const,
          color: isDark ? '#93C5FD' : '#2563EB',
          bg: isDark ? '#1E3A5F' : '#EFF6FF',
          badgeText: t('bankTransferBadge', 'Bank Transfer'),
          note: t(
            'bankTransferNote',
            'Customer paid directly to company bank account. 0.00 ETB collected in cash. Delivery fee is fully credited to your earnings.'
          ),
        };
      case 'cod':
        return {
          label: t('paymentCOD', 'Cash on Delivery'),
          icon: 'cash-multiple' as const,
          color: isDark ? '#FDBA74' : '#EA580C',
          bg: isDark ? '#3D2A1A' : '#FFF7ED',
          badgeText: t('codBadge', 'Cash on Delivery'),
          note: t(
            'codNote',
            'Cash was collected from customer upon delivery. Your delivery fee is earned and factored into your net cash reconciliation.'
          ),
        };
      case 'chapa':
      case 'telebirr':
      case 'online':
      default:
        return {
          label: order.payment_method_display || t('paymentOnline', 'Online Payment'),
          icon: 'credit-card-check-outline' as const,
          color: isDark ? '#86EFAC' : '#10B981',
          bg: isDark ? '#1A3D2A' : '#F0FDF4',
          badgeText: order.payment_method_display || t('onlineBadge', 'Online Paid'),
          note: t(
            'onlineNote',
            'Order was prepaid digitally. 0.00 ETB collected in cash.'
          ),
        };
    }
  };

  const payment = getPaymentDetails(order.payment_method);
  const orderId = order.master_order_id && order.vendor_order_id
    ? `${order.master_order_id}-${order.vendor_order_id}`
    : (order.order_number || '').replace(/^MO-/, '').replace(/-VO-/, '-');
  const displayOrderNumber = t('orderNumber', { id: orderId, defaultValue: `Order #${orderId}` });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          {/* Header Bar */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#222222' : '#F1F5F9' }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: iconCircleBg, borderColor: brand }]}>
                <MaterialCommunityIcons name="wallet-giftcard" size={22} color={brand} />
              </View>
              <View>
                <Text style={[styles.orderNumberText, { color: colors.text }]}>{displayOrderNumber}</Text>
                <Text style={[styles.subHeaderText, { color: colors.textMuted }]}>{t('earningBreakdownTitle', 'Order Earning Breakdown')}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: closeBtnBg }]} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={closeBtnIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            bounces={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero Earning Card */}
            <View style={[styles.heroCard, { backgroundColor: heroBg, shadowColor: isDark ? 'transparent' : '#6750A4' }]}>
              <Text style={[styles.heroLabel, { color: isDark ? '#CCCCCC' : '#E9D5FF' }]}>{t('youEarned', 'YOU EARNED FOR THIS DELIVERY')}</Text>
              <View style={styles.heroAmountRow}>
                <Text style={[styles.heroCurrency, { color: isDark ? '#FFFFFF' : '#F3E8FF' }]}>{t('etb', 'ETB')}</Text>
                <Text style={styles.heroAmount}>+{earningAmount}</Text>
              </View>
            </View>

            {/* Payout Settlement Status Section */}
            <View style={[styles.sectionCard, { backgroundColor: sectionBg, borderColor: sectionBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('payoutSettlementTitle', 'Payout Settlement')}</Text>
                {order.payout_status === 'confirmed' ? (
                  <View style={[styles.badgePill, {
                    backgroundColor: isDark ? '#1A3D2A' : '#F0FDF4',
                    borderColor: isDark ? '#245C3A' : '#BBF7D0',
                  }]}>
                    <Ionicons name="checkmark-done" size={12} color={isDark ? '#86EFAC' : '#16A34A'} />
                    <Text style={[styles.badgePillText, { color: isDark ? '#86EFAC' : '#16A34A' }]}>{t('paidAndConfirmed', 'Paid & Confirmed')}</Text>
                  </View>
                ) : order.payout_status === 'disbursed' ? (
                  <View style={[styles.badgePill, {
                    backgroundColor: isDark ? '#3D2A1A' : '#FFFBEB',
                    borderColor: isDark ? '#5C3D20' : '#FDE68A',
                  }]}>
                    <Ionicons name="time" size={12} color={isDark ? '#FCD34D' : '#D97706'} />
                    <Text style={[styles.badgePillText, { color: isDark ? '#FCD34D' : '#D97706' }]}>{t('disbursedAwaitingConfirm', 'Disbursed (Awaiting Confirm)')}</Text>
                  </View>
                ) : order.payout_status === 'disputed' ? (
                  <View style={[styles.badgePill, {
                    backgroundColor: isDark ? '#3D1A1A' : '#FEF2F2',
                    borderColor: isDark ? '#5C2626' : '#FECACA',
                  }]}>
                    <Ionicons name="alert-circle" size={12} color={isDark ? '#FCA5A5' : '#DC2626'} />
                    <Text style={[styles.badgePillText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>{t('disputedUnderReview', 'Disputed / Under Review')}</Text>
                  </View>
                ) : (
                  <View style={[styles.badgePill, {
                    backgroundColor: isDark ? '#222222' : '#F8FAFC',
                    borderColor: isDark ? '#333333' : '#E2E8F0',
                  }]}>
                    <Ionicons name="hourglass-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.badgePillText, { color: colors.textMuted }]}>{t('unpaidQueued', 'Unpaid / Queued')}</Text>
                  </View>
                )}
              </View>

              {/* COD Handover Status if COD order */}
              {order.payment_method?.toLowerCase() === 'cod' && (
                <View style={[styles.codHandoverRow, { borderTopColor: isDark ? '#222222' : '#F8FAFC' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tableLabel, { color: colors.textMuted }]}>{t('codCollectedTitle', 'Cash on Delivery Collected')}</Text>
                    <Text style={[styles.codStatusSubtitle, { color: colors.textMuted }]}>
                      {order.cod_payment_confirmed
                        ? t('codHandedInSub', 'Cash handed in to store admin.')
                        : t('codPendingTurnInSub', 'Physical cash awaiting turn-in to store.')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor: order.cod_payment_confirmed
                          ? (isDark ? '#1A3D2A' : '#F0FDF4')
                          : (isDark ? '#3D2A1A' : '#FFFBEB'),
                        borderColor: order.cod_payment_confirmed
                          ? (isDark ? '#245C3A' : '#BBF7D0')
                          : (isDark ? '#5C3D20' : '#FDE68A'),
                      },
                    ]}
                  >
                    <Ionicons
                      name={order.cod_payment_confirmed ? 'checkmark-circle' : 'cash-outline'}
                      size={12}
                      color={order.cod_payment_confirmed
                        ? (isDark ? '#86EFAC' : '#16A34A')
                        : (isDark ? '#FCD34D' : '#D97706')}
                    />
                    <Text
                      style={[
                        styles.badgePillText,
                        {
                          color: order.cod_payment_confirmed
                            ? (isDark ? '#86EFAC' : '#16A34A')
                            : (isDark ? '#FCD34D' : '#D97706'),
                        },
                      ]}
                    >
                      {order.cod_payment_confirmed
                        ? t('handedIn', 'Handed In')
                        : t('pendingTurnIn', 'Pending Turn-in')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payout Reference & Link */}
              {order.payout_id ? (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? '#222222' : '#F1F5F9' }}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableLabel, { color: colors.textMuted }]}>{t('payoutReferenceLabel', 'Payout Reference')}</Text>
                    <Text style={[styles.tableValueSmall, { color: colors.text }]}>{order.payout_number || `#DP-${order.payout_id}`}</Text>
                  </View>
                  {onViewPayout && (
                    <TouchableOpacity
                      style={[styles.viewPayoutBtn, { backgroundColor: brandSoftBg, borderColor: brandBorder }]}
                      activeOpacity={0.8}
                      onPress={() => onViewPayout(order.payout_id!)}
                    >
                      <MaterialCommunityIcons name="receipt-text-outline" size={15} color={brand} />
                      <Text style={[styles.viewPayoutBtnText, { color: brand }]}>{t('viewSettlementReceipt', 'View Settlement Receipt')}</Text>
                      <Ionicons name="chevron-forward" size={14} color={brand} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={[styles.unpaidHelperText, { color: colors.textMuted }]}>
                  {t('unpaidQueuedHelper', {
                    store: companyName,
                    defaultValue: `This delivery fee is queued for settlement in the next payout batch by ${companyName}.`,
                  })}
                </Text>
              )}
            </View>

            {/* Financial Summary Table */}
            <View style={[styles.sectionCard, { backgroundColor: sectionBg, borderColor: sectionBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('financialDetails', 'Financial Details')}</Text>
              
              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.textMuted }]}>{t('deliveryFeeEarned', 'Delivery Fee Earned')}</Text>
                <Text style={[styles.tableValue, styles.highlightValue, { color: isDark ? '#86EFAC' : '#16A34A' }]}>+{earningAmount} {t('etb', 'ETB')}</Text>
              </View>

              <View style={[styles.tableDivider, { backgroundColor: dividerColor }]} />

              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.textMuted }]}>{t('orderGrandTotal', 'Customer Order Total')}</Text>
                <Text style={[styles.tableValue, { color: colors.text }]}>{orderTotal} {t('etb', 'ETB')}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableLabel, { color: colors.textMuted }]}>{t('paymentStatus', 'Payment Status')}</Text>
                <Text style={[styles.tableValue, { color: isDark ? '#86EFAC' : '#16A34A', fontWeight: '600' }]}>
                  {(order.payment_status || 'Paid').toUpperCase()}
                </Text>
              </View>

              {!!completedDate && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableLabel, { color: colors.textMuted }]}>{t('deliveredTime', 'Delivered At')}</Text>
                  <Text style={[styles.tableValueSmall, { color: colors.text }]}>{completedDate}</Text>
                </View>
              )}
            </View>

            {/* Route & Fulfillment Details */}
            <View style={[styles.sectionCard, { backgroundColor: sectionBg, borderColor: sectionBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('routeDetails', 'Delivery Route')}</Text>

              {/* Pickup / Store */}
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: brand }]} />
                <View style={styles.routeInfo}>
                  <Text style={[styles.routeLabel, { color: colors.textMuted }]}>{t('pickupFrom', 'Pickup Store')}</Text>
                  <Text style={[styles.routeName, { color: colors.text }]}>{companyName}</Text>
                  {!!order.company_address && (
                    <Text style={[styles.routeAddress, { color: colors.textMuted }]} numberOfLines={2}>{order.company_address}</Text>
                  )}
                </View>
              </View>

              {/* Connecting Line */}
              <View style={[styles.routeLine, { backgroundColor: routeLineColor }]} />

              {/* Dropoff / Customer */}
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                <View style={styles.routeInfo}>
                  <Text style={[styles.routeLabel, { color: colors.textMuted }]}>{t('deliveredTo', 'Delivered To')}</Text>
                  <Text style={[styles.routeName, { color: colors.text }]}>{order.customer_name || t('customer', 'Customer')}</Text>
                  {!!order.shipping_address && (
                    <Text style={[styles.routeAddress, { color: colors.textMuted }]} numberOfLines={2}>{order.shipping_address}</Text>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.detailsBtn, { backgroundColor: brand, shadowColor: isDark ? 'transparent' : '#6750A4' }]}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                router.push(`/delivery/${order.id}`);
              }}
            >
              <Text style={[styles.detailsBtnText, { color: isDark ? '#ffffff' : '#FFFFFF' }]}>{t('viewFullOrder', 'View Full Order Details')}</Text>
              <Ionicons name="arrow-forward" size={16} color={isDark ? '#ffffff' : '#ffffff'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  scrollContainer: {
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6750A4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  subHeaderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#6750A4',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E9D5FF',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3E8FF',
  },
  heroAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  paymentBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  paymentBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  paymentBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  paymentBannerNote: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tableLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  tableValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  tableValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  highlightValue: {
    color: '#16A34A',
    fontSize: 15,
  },
  tableDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#CBD5E1',
    marginLeft: 5,
    marginVertical: 2,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  routeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  routeAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  detailsBtn: {
    backgroundColor: '#6750A4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#6750A4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  detailsBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  codHandoverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  codStatusSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  viewPayoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  viewPayoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6750A4',
  },
  unpaidHelperText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 16,
  },
});