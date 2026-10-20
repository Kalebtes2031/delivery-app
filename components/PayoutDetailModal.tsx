import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { DriverPayout } from '@/types';
import { confirmDriverPayout, disputeDriverPayout } from '@/services/api';
import ConfirmActionModal from './ConfirmActionModal';

interface PayoutDetailModalProps {
  visible: boolean;
  payout: DriverPayout | null;
  onClose: () => void;
  onPayoutUpdated: (updated: DriverPayout) => void;
}

const { width } = Dimensions.get('window');

interface ParsedPayoutNotes {
  generalNote?: string;
  resolutionNote?: string;
  cancellationReason?: string;
}

// Parses raw notes to safely separate general notes, dispute resolutions, and cancellation reasons
const parsePayoutNotes = (raw?: string): ParsedPayoutNotes => {
  if (!raw || !raw.trim()) {
    return {};
  }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const generalLines: string[] = [];
  const resolutionLines: string[] = [];
  const cancellationLines: string[] = [];

  let currentSection: 'general' | 'resolution' | 'cancellation' = 'general';

  for (const line of lines) {
    const resMatch = line.match(/^(?:\[Admin Resolution\]|\[Resolution\]|Admin Resolution|Resolution)\s*:\s*(.*)$/i);
    const cancelMatch = line.match(/^(?:\[Cancelled\]|\[Cancellation\]|Cancelled|Cancellation Reason)\s*:\s*(.*)$/i);

    if (resMatch) {
      currentSection = 'resolution';
      if (resMatch[1].trim()) resolutionLines.push(resMatch[1].trim());
    } else if (cancelMatch) {
      currentSection = 'cancellation';
      if (cancelMatch[1].trim()) cancellationLines.push(cancelMatch[1].trim());
    } else {
      if (currentSection === 'resolution') {
        resolutionLines.push(line);
      } else if (currentSection === 'cancellation') {
        cancellationLines.push(line);
      } else {
        generalLines.push(line);
      }
    }
  }

  const stripTags = (text: string) =>
    text
      .replace(/\[Admin Resolution\]:\s*/gi, '')
      .replace(/\[Resolution\]:\s*/gi, '')
      .replace(/^Resolution:\s*/gim, '')
      .replace(/\[Cancelled\]:\s*/gi, '')
      .replace(/^Cancelled:\s*/gim, '')
      .trim();

  return {
    generalNote: stripTags(generalLines.join('\n')).trim() || undefined,
    resolutionNote: stripTags(resolutionLines.join('\n')).trim() || undefined,
    cancellationReason: stripTags(cancellationLines.join('\n')).trim() || undefined,
  };
};

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

  // Custom modal states (replacing OS native alerts)
  const [showConfirmReceiptModal, setShowConfirmReceiptModal] = useState(false);
  const [statusModalConfig, setStatusModalConfig] = useState<{
    visible: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
  }>({
    visible: false,
    title: '',
    description: '',
    variant: 'info',
  });

  // Always invoke hooks unconditionally before any early returns
  const parsedNotes = useMemo(() => parsePayoutNotes(payout?.notes), [payout?.notes]);

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

  // Prompt driver confirmation
  const handleConfirmPrompt = () => {
    setShowConfirmReceiptModal(true);
  };

  const executeConfirm = async () => {
    try {
      setConfirming(true);
      const res = await confirmDriverPayout(payout.id);
      setShowConfirmReceiptModal(false);
      onPayoutUpdated(res.data.payout);
      setStatusModalConfig({
        visible: true,
        title: t('confirmSuccessTitle', 'Payout Confirmed!'),
        description: t('confirmSuccessSub', {
          amount: parseFloat(payout.net_payout_amount).toFixed(2),
          store: companyName,
          defaultValue: `You have successfully confirmed receiving ${parseFloat(payout.net_payout_amount).toFixed(2)} ETB from ${companyName}.`,
        }),
        variant: 'success',
      });
    } catch (err: any) {
      setShowConfirmReceiptModal(false);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Could not confirm payout. Please try again.';
      setStatusModalConfig({
        visible: true,
        title: t('confirmFailedTitle', 'Confirmation Failed'),
        description: msg,
        variant: 'danger',
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      setStatusModalConfig({
        visible: true,
        title: t('reasonRequiredTitle', 'Reason Required'),
        description: t('reasonRequiredDesc', 'Please describe the issue or why you have not received this payout.'),
        variant: 'warning',
      });
      return;
    }
    try {
      setDisputing(true);
      const res = await disputeDriverPayout(payout.id, disputeReason.trim());
      setShowDisputeInput(false);
      setDisputeReason('');
      onPayoutUpdated(res.data.payout);
      setStatusModalConfig({
        visible: true,
        title: t('disputeSubmittedTitle', 'Dispute Submitted'),
        description: t('disputeSubmittedDesc', 'Your dispute has been reported to store administration for review and resolution.'),
        variant: 'info',
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Could not submit dispute. Please try again.';
      setStatusModalConfig({
        visible: true,
        title: t('disputeFailedTitle', 'Dispute Failed'),
        description: msg,
        variant: 'danger',
      });
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
            <Text style={[styles.statusBadgeText, { color: '#16A34A' }]}>{t('confirmedAndPaid', 'Confirmed Paid')}</Text>
          </View>
        );
      case 'disputed':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Ionicons name="alert-circle" size={14} color="#DC2626" />
            <Text style={[styles.statusBadgeText, { color: '#DC2626' }]}>{t('disputedUnderReview', 'Disputed / Under Review')}</Text>
          </View>
        );
      case 'cancelled':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
            <Ionicons name="close-circle" size={14} color="#64748B" />
            <Text style={[styles.statusBadgeText, { color: '#64748B' }]}>{t('cancelled', 'Cancelled')}</Text>
          </View>
        );
      case 'disbursed':
      default:
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Ionicons name="time" size={14} color="#D97706" />
            <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>{t('pendingYourConfirmation', 'Pending Your Confirmation')}</Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
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

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
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
                  {!!parsedNotes.resolutionNote && (
                    <View style={styles.resolutionCallout}>
                      <View style={styles.resolutionHeaderRow}>
                        <MaterialCommunityIcons name="comment-check-outline" size={14} color="#92400E" />
                        <Text style={styles.resolutionTitle}>{t('adminResolutionNote', 'Store Admin Resolution Note')}</Text>
                      </View>
                      <Text style={styles.resolutionText}>{parsedNotes.resolutionNote}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmPrompt}
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
                          <Text style={styles.cancelDisputeText}>{t('cancel', 'Cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.submitDisputeBtn}
                          onPress={handleDispute}
                          disabled={disputing}
                        >
                          {disputing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.submitDisputeText}>{t('submitDispute', 'Submit Dispute')}</Text>
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
                  <Text style={styles.disputedBannerTitle}>{t('disputeUnderReview', 'Dispute Under Review')}</Text>
                  <Text style={styles.disputedBannerBody}>{payout.dispute_reason || t('issueReportedByDriver', 'Issue reported by driver.')}</Text>
                  {!!payout.disputed_at && (
                    <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                      {t('reportedOn', 'Reported')}: {new Date(payout.disputed_at).toLocaleString()}
                    </Text>
                  )}
                  {!!parsedNotes.resolutionNote && (
                    <View style={styles.disputeResolutionCallout}>
                      <View style={styles.resolutionHeaderRow}>
                        <MaterialCommunityIcons name="message-reply-text-outline" size={14} color="#991B1B" />
                        <Text style={styles.disputeResolutionTitle}>{t('adminResponseNotes', 'Store Admin Response')}</Text>
                      </View>
                      <Text style={styles.disputeResolutionText}>{parsedNotes.resolutionNote}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* If Cancelled */}
            {payout.status === 'cancelled' && (
              <View style={styles.cancelledBanner}>
                <Ionicons name="close-circle" size={22} color="#64748B" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cancelledBannerTitle}>{t('payoutCancelledTitle', 'Payout Cancelled')}</Text>
                  <Text style={styles.cancelledBannerBody}>
                    {t('payoutCancelledBody', 'This payout was cancelled by store administration and orders released.')}
                  </Text>
                  {(!!parsedNotes.cancellationReason || !!parsedNotes.generalNote) && (
                    <View style={styles.cancelledReasonBox}>
                      <Text style={styles.cancelledReasonLabel}>{t('cancellationReason', 'Cancellation Reason')}:</Text>
                      <Text style={styles.cancelledReasonText}>
                        {parsedNotes.cancellationReason || parsedNotes.generalNote}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Payment Meta Card */}
            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('paymentMethodLabel', 'Payment Method')}</Text>
                <Text style={styles.metaValue}>{payout.payment_method?.toUpperCase()}</Text>
              </View>
              {!!payout.transaction_reference && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('transactionReference', 'Reference / TX ID')}</Text>
                  <Text style={styles.metaValue}>{payout.transaction_reference}</Text>
                </View>
              )}
              {!!disbursedDate && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('disbursedOn', 'Disbursed On')}</Text>
                  <Text style={styles.metaValue}>{disbursedDate}</Text>
                </View>
              )}
              {!!parsedNotes.generalNote && (
                <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.metaLabel}>{t('notesLabel', 'Notes')}</Text>
                  <Text style={[styles.metaValue, { maxWidth: '65%' }]}>{parsedNotes.generalNote}</Text>
                </View>
              )}
            </View>

            {/* Financial Reconciliation Breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>{t('settlementAccounting', 'Settlement Accounting')}</Text>
              <View style={styles.reconcileRow}>
                <Text style={styles.reconcileLabel}>{t('grossEarned', 'Gross Delivery Fees')}</Text>
                <Text style={[styles.reconcileVal, { color: '#16A34A' }]}>
                  +{parseFloat(payout.gross_delivery_fees).toFixed(2)} ETB
                </Text>
              </View>
              {parseFloat(payout.cod_cash_deducted || '0') > 0 && (
                <View style={styles.reconcileRow}>
                  <Text style={styles.reconcileLabel}>{t('codCollectedHandedOver', 'COD Collected (Handed Over)')}</Text>
                  <Text style={[styles.reconcileVal, { color: '#D97706' }]}>
                    {parseFloat(payout.cod_cash_deducted).toFixed(2)} ETB
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
                  {payout.items.length === 1
                    ? t('orderSettled_one', { count: 1, defaultValue: '1 Order Settled' })
                    : t('ordersSettled_other', { count: payout.items.length, defaultValue: `${payout.items.length} Orders Settled` })}
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
                          {parseFloat(it.cod_collected || '0') > 0 ? ` · COD ${parseFloat(it.cod_collected).toFixed(2)} ETB` : ''}
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
        </View>
      </View>

      {/* Confirmation Modal before confirming receipt */}
      <ConfirmActionModal
        visible={showConfirmReceiptModal}
        variant="success"
        title={t('confirmPayoutReceiptTitle', 'Confirm Payout Receipt')}
        description={t('confirmPayoutReceiptDesc', {
          amount: parseFloat(payout.net_payout_amount).toFixed(2),
          store: companyName,
          method: payout.payment_method?.toUpperCase(),
          defaultValue: `Are you sure you have received ${parseFloat(payout.net_payout_amount).toFixed(2)} ETB from ${companyName} via ${payout.payment_method?.toUpperCase()}?`,
        })}
        confirmText={t('confirmReceived', 'Confirm Received')}
        cancelText={t('cancel', 'Cancel')}
        isLoading={confirming}
        onConfirm={executeConfirm}
        onClose={() => setShowConfirmReceiptModal(false)}
      />

      {/* Status Alert Modal (Replacing OS native alert) */}
      <ConfirmActionModal
        visible={statusModalConfig.visible}
        variant={statusModalConfig.variant}
        title={statusModalConfig.title}
        description={statusModalConfig.description}
        info={true}
        confirmText={t('ok', 'OK')}
        onConfirm={() => setStatusModalConfig((prev) => ({ ...prev, visible: false }))}
        onClose={() => setStatusModalConfig((prev) => ({ ...prev, visible: false }))}
      />
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
  sheet: {
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
  resolutionCallout: {
    marginVertical: 10,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  resolutionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  resolutionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  resolutionText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  disputeResolutionCallout: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  disputeResolutionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  disputeResolutionText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  cancelledBanner: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelledBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  cancelledBannerBody: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cancelledReasonBox: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelledReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  cancelledReasonText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
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
