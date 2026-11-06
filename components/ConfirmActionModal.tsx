import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/context/ThemeContext';

interface ConfirmActionModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'success';
  onConfirm: () => void;
  onClose: () => void;
  info?: boolean;
}

export default function ConfirmActionModal({
  visible,
  title,
  description,
  confirmText,
  cancelText,
  isLoading = false,
  variant = 'danger',
  onConfirm,
  onClose,
  info = false,
}: ConfirmActionModalProps) {
  const { t } = useTranslation(['ConfirmActionModal']);
  const { colors, isDark } = useAppTheme();
  
  // Use translated default values if not provided by parent
  const finalTitle = title || t('defaultTitle');
  const finalDescription = description || t('defaultDescription');
  const finalConfirmText = confirmText || t('confirm');
  const finalCancelText = cancelText || t('cancel');
  
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  let iconColor: string = colors.primary;
  let iconBg: string = colors.primarySoft;
  let confirmBtnBg: string = colors.primary;
  let iconName: any = 'check-circle';

  if (info) {
    iconName = 'info';
  } else if (isDanger) {
    iconColor = colors.danger;
    iconBg = isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2';
    confirmBtnBg = colors.danger;
    iconName = 'alert-triangle';
  } else if (isSuccess) {
    iconColor = colors.success;
    iconBg = isDark ? 'rgba(74, 222, 128, 0.15)' : '#F0FDF4';
    confirmBtnBg = colors.success;
    iconName = 'check-circle';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                <Feather name={iconName} size={20} color={iconColor} />
              </View>
              <Text style={[styles.titleText, { color: colors.text }]}>{finalTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={[styles.descriptionText, { color: colors.textMuted }]}>{finalDescription}</Text>
          </View>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: isDark ? colors.surface : '#f8fafc',
                borderTopColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              disabled={isLoading}
              style={[
                styles.cancelBtn,
                { backgroundColor: isDark ? colors.card : '#e2e8f0' },
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>{finalCancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={isLoading}
              style={[styles.confirmBtn, { backgroundColor: confirmBtnBg }]}
            >
              {isLoading && (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.confirmBtnText}>{finalConfirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    padding: 10,
    borderRadius: 12,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 24,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
