import { useEffect, useRef } from 'react';

const CHANNEL_NAME = 'sharefood_realtime';

/**
 * Listens for real-time data updates from:
 * 1. Other browser tabs via BroadcastChannel
 * 2. The same tab via a custom DOM event ('sf_data_update')
 *
 * Call refreshFn inside the hook — it uses a ref internally so it's always current.
 */
export function useRealtime(refreshFn: () => void) {
  const fnRef = useRef(refreshFn);
  fnRef.current = refreshFn;

  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = () => {
        fnRef.current();
      };
    } catch {
      // BroadcastChannel not supported (e.g., some older browsers)
    }

    const handler = () => fnRef.current();
    window.addEventListener('sf_data_update', handler);

    return () => {
      channel?.close();
      window.removeEventListener('sf_data_update', handler);
    };
  }, []);
}
