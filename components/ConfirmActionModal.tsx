import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'danger',
  onConfirm,
  onClose,
  info = false,
}: ConfirmActionModalProps) {
  
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  let iconColor = '#6750A4';
  let iconBg = '#F5F3FF';
  let confirmBtnBg = '#6750A4';
  let iconName: any = 'check-circle';

  if (info) {
    iconName = 'info';
  } else if (isDanger) {
    iconColor = '#dc2626';
    iconBg = '#FEF2F2';
    confirmBtnBg = '#dc2626';
    iconName = 'alert-triangle';
  } else if (isSuccess) {
    iconColor = '#059669';
    iconBg = '#F0FDF4';
    confirmBtnBg = '#059669';
    iconName = 'check-circle';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                <Feather name={iconName} size={20} color={iconColor} />
              </View>
              <Text style={styles.titleText}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isLoading}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={isLoading}
              style={[styles.confirmBtn, { backgroundColor: confirmBtnBg }]}
            >
              {isLoading && (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#f1f5f9',
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
    color: '#1e293b',
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
    color: '#64748b',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
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