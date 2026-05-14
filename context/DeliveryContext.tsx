import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  getDeliveries,
  getDriverStats,
  getDeliveryDetail,
  updateDeliveryStatus,
} from '@/services/api';
import type { DeliveryAssignment, DeliveryStatus } from '@/types';
import type { DriverStats } from '@/constants/deliveryConstants';

// ── Context Interface ──

interface DeliveryContextType {
  // State
  deliveries: DeliveryAssignment[];
  driverStats: DriverStats;
  isLoading: boolean;
  isRefreshing: boolean;

  // Actions
  refreshDeliveries: (status?: DeliveryStatus) => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  getDeliveryById: (id: number) => Promise<DeliveryAssignment>;
  advanceStatus: (id: number, nextStatus: DeliveryStatus) => Promise<DeliveryAssignment>;
}

const DEFAULT_STATS: DriverStats = {
  earnings: '0.00',
  assigned_orders: 0,
  pending_orders: 0,
  total_orders: 0,
};

const DeliveryContext = createContext<DeliveryContextType>({
  deliveries: [],
  driverStats: DEFAULT_STATS,
  isLoading: true,
  isRefreshing: false,
  refreshDeliveries: async () => {},
  refreshStats: async () => {},
  refreshAll: async () => {},
  getDeliveryById: async () => ({} as DeliveryAssignment),
  advanceStatus: async () => ({} as DeliveryAssignment),
});

// ── Provider ──

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const [deliveries, setDeliveries] = useState<DeliveryAssignment[]>([]);
  const [driverStats, setDriverStats] = useState<DriverStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cache for individual delivery details (keyed by id)
  const [detailCache, setDetailCache] = useState<Record<number, DeliveryAssignment>>({});

  // ── Fetch all deliveries (optionally filtered by status) ──
  const refreshDeliveries = useCallback(async (status?: DeliveryStatus) => {
    try {
      const { data } = await getDeliveries(status);
      const list = Array.isArray(data) ? data : (data as any).results || [];
      // Sort by vendor_order descending (newest first)
      const sorted = list.sort(
        (a: DeliveryAssignment, b: DeliveryAssignment) => b.vendor_order - a.vendor_order
      );
      setDeliveries(sorted);
    } catch (error) {
      console.error('[DeliveryContext] Failed to fetch deliveries:', error);
    }
  }, []);

  // ── Fetch driver performance stats ──
  const refreshStats = useCallback(async () => {
    try {
      const { data } = await getDriverStats();
      setDriverStats(data);
    } catch (error) {
      console.error('[DeliveryContext] Failed to fetch stats:', error);
    }
  }, []);

  // ── Fetch both deliveries and stats in parallel ──
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshDeliveries(), refreshStats()]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [refreshDeliveries, refreshStats]);

  // ── Get a single delivery by ID (cache-first, then fetch) ──
  const getDeliveryById = useCallback(async (id: number): Promise<DeliveryAssignment> => {
    // Check if we already have it in the list
    const existing = deliveries.find((d) => d.id === id) || detailCache[id];
    
    // Always fetch fresh from API to get full detail (vendor_order_detail etc.)
    try {
      const { data } = await getDeliveryDetail(id);
      // Update cache
      setDetailCache((prev) => ({ ...prev, [id]: data }));
      return data;
    } catch (error) {
      // If fetch fails but we have cached data, return it
      if (existing) return existing;
      throw error;
    }
  }, [deliveries, detailCache]);

  // ── Advance a delivery's status (server-confirmed) ──
  const advanceStatus = useCallback(async (
    id: number,
    nextStatus: DeliveryStatus
  ): Promise<DeliveryAssignment> => {
    // Call API first (server-confirmed, not optimistic)
    const { data: updated } = await updateDeliveryStatus(id, nextStatus);

    // Update the delivery in the main list
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: updated.status } : d))
    );

    // Update cache
    setDetailCache((prev) => ({ ...prev, [id]: updated }));

    // Refresh stats in background (don't block the UI)
    refreshStats();

    return updated;
  }, [refreshStats]);

  return (
    <DeliveryContext.Provider
      value={{
        deliveries,
        driverStats,
        isLoading,
        isRefreshing,
        refreshDeliveries,
        refreshStats,
        refreshAll,
        getDeliveryById,
        advanceStatus,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
}

export const useDelivery = () => useContext(DeliveryContext);
