import { useEffect } from 'react';
import { getSocket } from './socket';

/**
 * Connects to the Socket.IO server and:
 * 1. On connect: receives full authoritative data and writes it to localStorage
 * 2. On data_changed: applies the incoming delta to localStorage and triggers re-render
 *
 * Mount this once at the App root level.
 */
export function useServerSync() {
  useEffect(() => {
    const socket = getSocket();

    const onFullSync = (data: { donations: unknown[]; users: unknown[]; deliveries: unknown[] }) => {
      if (Array.isArray(data.donations)) localStorage.setItem('sf_donations', JSON.stringify(data.donations));
      if (Array.isArray(data.users)) localStorage.setItem('sf_users', JSON.stringify(data.users));
      if (Array.isArray(data.deliveries)) localStorage.setItem('sf_deliveries', JSON.stringify(data.deliveries));
      window.dispatchEvent(new CustomEvent('sf_data_update'));
    };

    const onDataChanged = ({ type, action, payload }: { type: string; action: string; payload: unknown }) => {
      const key = type === 'donations' ? 'sf_donations'
                : type === 'users' ? 'sf_users'
                : type === 'deliveries' ? 'sf_deliveries'
                : null;

      if (!key) return;

      try {
        const raw = localStorage.getItem(key);
        let arr: Record<string, unknown>[] = raw ? JSON.parse(raw) : [];

        if (action === 'save') {
          const p = payload as Record<string, unknown>;
          if (!arr.find(item => item.id === p.id)) arr.push(p);
        } else if (action === 'update') {
          const p = payload as Record<string, unknown>;
          const idx = arr.findIndex(item => item.id === p.id);
          if (idx > -1) arr[idx] = p; else arr.push(p);
        } else if (action === 'delete') {
          arr = arr.filter(item => item.id !== payload);
        }

        localStorage.setItem(key, JSON.stringify(arr));
      } catch (e) {
        console.warn('[Sync] Error applying delta:', e);
      }

      window.dispatchEvent(new CustomEvent('sf_data_update'));
    };

    socket.on('full_sync', onFullSync);
    socket.on('data_changed', onDataChanged);

    return () => {
      socket.off('full_sync', onFullSync);
      socket.off('data_changed', onDataChanged);
    };
  }, []);
}
