import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { DriverPayout } from '@/types';
import { confirmDriverPayout, disputeDriverPayout } from '@/services/api';

interface PayoutDetailModalProps {
  visible: boolean;
  payout: DriverPayout | null;
  onClose: () => void;
  onPayoutUpdated: (updated: DriverPayout) => void;
}

const { width } = Dimensions.get('window');

export default function PayoutDetailModal({
  visible,
  payout,
  onClose,
  onPayoutUpdated,
}: PayoutDetailModalProps) {
  const { t, i18n } = useTranslation('deliveryHome');
  const isAmharic = i18n.language?.startsWith('am');

  const [confirming, setConfirming] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  if (!payout) return null;

  const companyName =
    isAmharic && payout.company_name_am ? payout.company_name_am : payout.company_name || 'Store';

  const disbursedDate = payout.disbursed_at
    ? new Date(payout.disbursed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const confirmedDate = payout.confirmed_at
    ? new Date(payout.confirmed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const res = await confirmDriverPayout(payout.id);
      Alert.alert(t('confirmSuccess', 'Payout confirmed successfully!'));
      onPayoutUpdated(res.data.payout);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not confirm payout. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setConfirming(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      Alert.alert('Error', 'Please provide a brief reason for the dispute.');
      return;
    }
    try {
      setDisputing(true);
      const res = await disputeDriverPayout(payout.id, disputeReason.trim());
      Alert.alert(t('disputeSuccess', 'Dispute submitted to company admin.'));
      setShowDisputeInput(false);
      setDisputeReason('');
      onPayoutUpdated(res.data.payout);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not submit dispute. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setDisputing(false);
    }
  };

  const renderStatusBadge = () => {
    switch (payout.status) {
      case 'confirmed':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={[styles.statusBadgeText, { color: '#16A34A' }]}>Confirmed Paid</Text>
          </View>
        );
      case 'disputed':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Ionicons name="alert-circle" size={14} color="#DC2626" />
            <Text style={[styles.statusBadgeText, { color: '#DC2626' }]}>Disputed</Text>
          </View>
        );
      case 'disbursed':
      default:
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Ionicons name="time" size={14} color="#D97706" />
            <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>Pending Your Confirmation</Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Modal Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{payout.payout_number}</Text>
              <Text style={styles.headerSubtitle}>{companyName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Amount Hero */}
            <View style={styles.amountHero}>
              <Text style={styles.amountLabel}>{t('netPayout', 'Net Disbursed Amount')}</Text>
              <View style={styles.amountRow}>
                <Text style={styles.amountValue}>{parseFloat(payout.net_payout_amount).toFixed(2)}</Text>
                <Text style={styles.amountCurrency}>{t('etb', 'ETB')}</Text>
              </View>
              <View style={{ marginTop: 8 }}>{renderStatusBadge()}</View>
            </View>

            {/* Confirmation Banner for Disbursed Payout */}
            {payout.status === 'disbursed' && (
              <View style={styles.confirmPromptCard}>
                <Ionicons name="information-circle" size={22} color="#D97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.confirmPromptTitle}>{t('payoutActionTitle', 'Payout Received?')}</Text>
                  <Text style={styles.confirmPromptBody}>
                    {t('payoutActionSub', 'Company has sent your payout. Please confirm receipt.')}
                  </Text>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirm}
                    disabled={confirming}
                    activeOpacity={0.85}
                  >
                    {confirming ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.confirmBtnText}>{t('confirmReceived', 'Confirm Received')}</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {!showDisputeInput ? (
                    <TouchableOpacity
                      style={styles.reportIssueBtn}
                      onPress={() => setShowDisputeInput(true)}
                    >
                      <Text style={styles.reportIssueText}>{t('reportIssue', 'Report Issue')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.disputeBox}>
                      <TextInput
                        style={styles.disputeInput}
                        placeholder={t('disputePlaceholder', 'Explain why you have not received this payout...')}
                        placeholderTextColor="#94A3B8"
                        multiline
                        value={disputeReason}
                        onChangeText={setDisputeReason}
                      />
                      <View style={styles.disputeActionsRow}>
                        <TouchableOpacity
                          style={styles.cancelDisputeBtn}
                          onPress={() => setShowDisputeInput(false)}
                        >
                          <Text style={styles.cancelDisputeText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.submitDisputeBtn}
                          onPress={handleDispute}
                          disabled={disputing}
                        >
                          {disputing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.submitDisputeText}>Submit Dispute</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* If Confirmed */}
            {payout.status === 'confirmed' && !!confirmedDate && (
              <View style={styles.confirmedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                <Text style={styles.confirmedBannerText}>
                  {t('confirmedOn', 'Confirmed On')}: {confirmedDate}
                </Text>
              </View>
            )}

            {/* If Disputed */}
            {payout.status === 'disputed' && (
              <View style={styles.disputedBanner}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.disputedBannerTitle}>Dispute Under Review</Text>
                  <Text style={styles.disputedBannerBody}>{payout.dispute_reason || 'Issue reported by driver.'}</Text>
                </View>
              </View>
            )}

            {/* Payment Meta Card */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Method</Text>
                <Text style={styles.metaValue}>{payout.payment_method?.toUpperCase()}</Text>
              </View>
              {!!payout.transaction_reference && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Reference / TX ID</Text>
                  <Text style={styles.metaValue}>{payout.transaction_reference}</Text>
                </View>
              )}
              {!!disbursedDate && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('disbursedOn', 'Disbursed On')}</Text>
                  <Text style={styles.metaValue}>{disbursedDate}</Text>
                </View>
              )}
              {!!payout.notes && (
                <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.metaLabel}>Notes</Text>
                  <Text style={[styles.metaValue, { maxWidth: '65%' }]}>{payout.notes}</Text>
                </View>
              )}
            </View>

            {/* Financial Reconciliation Breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>Settlement Accounting</Text>
              <View style={styles.reconcileRow}>
                <Text style={styles.reconcileLabel}>{t('grossEarned', 'Gross Delivery Fees')}</Text>
                <Text style={[styles.reconcileVal, { color: '#16A34A' }]}>
                  +{parseFloat(payout.gross_delivery_fees).toFixed(2)} ETB
                </Text>
              </View>
              {parseFloat(payout.cod_cash_deducted || '0') > 0 && (
                <View style={styles.reconcileRow}>
                  <Text style={styles.reconcileLabel}>{t('codDeducted', 'COD Cash Retained')}</Text>
                  <Text style={[styles.reconcileVal, { color: '#DC2626' }]}>
                    -{parseFloat(payout.cod_cash_deducted).toFixed(2)} ETB
                  </Text>
                </View>
              )}
              <View style={[styles.reconcileRow, styles.netRow]}>
                <Text style={styles.netLabel}>{t('netPayout', 'Net Disbursed Amount')}</Text>
                <Text style={styles.netVal}>
                  {parseFloat(payout.net_payout_amount).toFixed(2)} ETB
                </Text>
              </View>
            </View>

            {/* Itemized Orders List */}
            {!!payout.items && payout.items.length > 0 && (
              <View style={styles.ordersSection}>
                <Text style={styles.sectionTitle}>
                  {t('ordersSettled', 'Orders Settled')} ({payout.items.length})
                </Text>
                {payout.items.map((it) => (
                  <View key={it.id} style={styles.orderItemCard}>
                    <View style={styles.orderItemLeft}>
                      <View style={styles.orderItemIcon}>
                        <MaterialCommunityIcons name="moped" size={16} color="#6750A4" />
                      </View>
                      <View>
                        <Text style={styles.orderItemNum}>{it.order_number || `Order #${it.assignment_id}`}</Text>
                        <Text style={styles.orderItemSub}>
                          {it.customer_name || 'Customer'} · {it.payment_method?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderItemRight}>
                      <Text style={styles.orderItemFee}>+{parseFloat(it.delivery_fee).toFixed(2)}</Text>
                      <Text style={styles.orderItemCurrency}>ETB</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  amountHero: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  amountCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6750A4',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmPromptCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  confirmPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  confirmPromptBody: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 17,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reportIssueBtn: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  reportIssueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    textDecorationLine: 'underline',
  },
  disputeBox: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  disputeInput: {
    fontSize: 13,
    color: '#0F172A',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  disputeActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  cancelDisputeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  cancelDisputeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  submitDisputeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#DC2626',
  },
  submitDisputeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 8,
  },
  confirmedBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  disputedBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  disputedBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  disputedBannerBody: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  reconcileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  reconcileLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  reconcileVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 6,
    paddingTop: 8,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  netVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6750A4',
  },
  ordersSection: {
    marginTop: 8,
  },
  orderItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderItemNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  orderItemRight: {
    alignItems: 'flex-end',
  },
  orderItemFee: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
  },
  orderItemCurrency: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
});
