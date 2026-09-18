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

interface OrderEarningDetailModalProps {
  visible: boolean;
  order: DriverEarningItem | null;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function OrderEarningDetailModal({
  visible,
  order,
  onClose,
}: OrderEarningDetailModalProps) {
  const { t, i18n } = useTranslation('deliveryHome');
  const router = useRouter();
  const isAmharic = i18n.language?.startsWith('am');

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
          color: '#2563EB',
          bg: '#EFF6FF',
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
          color: '#EA580C',
          bg: '#FFF7ED',
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
          color: '#10B981',
          bg: '#F0FDF4',
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
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="wallet-giftcard" size={22} color="#6750A4" />
              </View>
              <View>
                <Text style={styles.orderNumberText}>{displayOrderNumber}</Text>
                <Text style={styles.subHeaderText}>{t('earningBreakdownTitle', 'Order Earning Breakdown')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
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
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>{t('youEarned', 'YOU EARNED FOR THIS DELIVERY')}</Text>
              <View style={styles.heroAmountRow}>
                <Text style={styles.heroCurrency}>{t('etb', 'ETB')}</Text>
                <Text style={styles.heroAmount}>+{earningAmount}</Text>
              </View>
              {/* <View style={styles.statusPill}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={styles.statusPillText}>{t('deliveryCompleted', 'Delivered & Credited')}</Text>
              </View> */}
            </View>

            {/* Payment Method Badge & Info */}
            {/* <View style={[styles.paymentBanner, { backgroundColor: payment.bg, borderColor: payment.color + '40' }]}>
              <View style={styles.paymentBannerHeader}>
                <MaterialCommunityIcons name={payment.icon as any} size={20} color={payment.color} />
                <Text style={[styles.paymentBannerTitle, { color: payment.color }]}>{payment.badgeText}</Text>
              </View>
              <Text style={styles.paymentBannerNote}>{payment.note}</Text>
            </View> */}

            {/* Financial Summary Table */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('financialDetails', 'Financial Details')}</Text>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{t('deliveryFeeEarned', 'Delivery Fee Earned')}</Text>
                <Text style={[styles.tableValue, styles.highlightValue]}>+{earningAmount} {t('etb', 'ETB')}</Text>
              </View>

              <View style={styles.tableDivider} />

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{t('orderGrandTotal', 'Customer Order Total')}</Text>
                <Text style={styles.tableValue}>{orderTotal} {t('etb', 'ETB')}</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{t('paymentStatus', 'Payment Status')}</Text>
                <Text style={[styles.tableValue, { color: '#16A34A', fontWeight: '600' }]}>
                  {(order.payment_status || 'Paid').toUpperCase()}
                </Text>
              </View>

              {!!completedDate && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{t('deliveredTime', 'Delivered At')}</Text>
                  <Text style={styles.tableValueSmall}>{completedDate}</Text>
                </View>
              )}
            </View>

            {/* Route & Fulfillment Details */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{t('routeDetails', 'Delivery Route')}</Text>

              {/* Pickup / Store */}
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#6750A4' }]} />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>{t('pickupFrom', 'Pickup Store')}</Text>
                  <Text style={styles.routeName}>{companyName}</Text>
                  {!!order.company_address && (
                    <Text style={styles.routeAddress} numberOfLines={2}>{order.company_address}</Text>
                  )}
                </View>
              </View>

              {/* Connecting Line */}
              <View style={styles.routeLine} />

              {/* Dropoff / Customer */}
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>{t('deliveredTo', 'Delivered To')}</Text>
                  <Text style={styles.routeName}>{order.customer_name || t('customer', 'Customer')}</Text>
                  {!!order.shipping_address && (
                    <Text style={styles.routeAddress} numberOfLines={2}>{order.shipping_address}</Text>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.detailsBtn}
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                router.push(`/delivery/${order.id}`);
              }}
            >
              <Text style={styles.detailsBtnText}>{t('viewFullOrder', 'View Full Order Details')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
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
});
