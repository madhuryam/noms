import { useState, useCallback, useEffect } from 'react';

interface WakeLockState {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<void>;
  release: () => Promise<void>;
  toggle: () => Promise<void>;
}

export function useWakeLock(): WakeLockState {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);

  const isSupported = 'wakeLock' in navigator;

  const request = useCallback(async () => {
    if (!isSupported) return;

    try {
      const lock = await navigator.wakeLock.request('screen');
      setWakeLock(lock);
      setIsActive(true);

      // Handle visibility change - re-acquire lock when page becomes visible
      lock.addEventListener('release', () => {
        setIsActive(false);
        setWakeLock(null);
      });
    } catch (err) {
      // Wake lock request failed - usually means low battery or page not visible
      console.warn('Wake lock request failed:', err);
      setIsActive(false);
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch {
        // Already released
      }
      setWakeLock(null);
      setIsActive(false);
    }
  }, [wakeLock]);

  const toggle = useCallback(async () => {
    if (isActive) {
      await release();
    } else {
      await request();
    }
  }, [isActive, request, release]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    if (!isActive || !isSupported) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !wakeLock) {
        await request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isSupported, wakeLock, request]);

  // Release on unmount
  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [wakeLock]);

  return {
    isSupported,
    isActive,
    request,
    release,
    toggle,
  };
}
