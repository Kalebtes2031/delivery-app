// hooks/useUnreadNotifications.ts
// Polls the backend for the unread notification count (for the header bell dot).
import { useCallback, useEffect, useState } from 'react';
import { getUnreadCount } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export function useUnreadNotifications() {
  const { isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);

  const refetch = useCallback(async () => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }
    try {
      const { data } = await getUnreadCount();
      console.log('🔔 Unread count from API:', data.unread);
      setUnread(data.unread);
    } catch (error) {
      console.log('🔔 Failed to fetch unread count:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, 30000);
    return () => clearInterval(id);
  }, [refetch]);

  return { unread, refetch };
}
