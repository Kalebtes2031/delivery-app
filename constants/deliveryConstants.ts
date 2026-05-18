// constants/deliveryConstants.ts — Single source of truth for delivery status UI

import type { DeliveryStatus } from '@/types';

export const STATUS_ORDER: DeliveryStatus[] = [
  'pending',
  'accepted',
  'picked_up',
  'out_for_delivery',
  'delivered',
];

export const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  pending:          { bg: '#FFF7ED', text: '#EA580C', label: 'Assigned',   icon: 'clock-outline' },
  accepted:         { bg: '#EFF6FF', text: '#2563EB', label: 'Accepted',   icon: 'check-circle-outline' },
  picked_up:        { bg: '#FAF5FF', text: '#6750A4', label: 'Picked Up',  icon: 'package-variant' },
  out_for_delivery: { bg: '#F0FDF4', text: '#16A34A', label: 'In Transit', icon: 'truck-fast-outline' },
  delivered:        { bg: '#16A34A', text: '#fff', label: 'Completed',  icon: 'check-all' },
  failed:           { bg: '#FEF2F2', text: '#DC2626', label: 'Failed',     icon: 'alert-circle-outline' },
};

export const NEXT_ACTION: Record<string, { label: string; next: DeliveryStatus; color: string; icon: string }> = {
  pending:          { label: 'Accept Order',      next: 'accepted',         color: '#2D5BD0', icon: 'check-circle' },
  accepted:         { label: 'Confirm Pickup',    next: 'picked_up',        color: '#6750A4', icon: 'package-variant' },
  picked_up:        { label: 'Start Navigation',  next: 'out_for_delivery', color: '#10B981', icon: 'navigation' },
  out_for_delivery: { label: 'Complete Delivery', next: 'delivered',        color: '#059669', icon: 'check-all' },
};

export const STATUS_TABS: { label: string; value: DeliveryStatus | 'all' }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Assigned',   value: 'pending' },
  { label: 'Picked Up',  value: 'picked_up' },
  { label: 'In Transit', value: 'out_for_delivery' },
  { label: 'Completed',  value: 'delivered' },
];

export interface DriverStats {
  earnings: string;
  cash_on_hand: string;
  assigned_orders: number;
  pending_orders: number;
  total_orders: number;
}
