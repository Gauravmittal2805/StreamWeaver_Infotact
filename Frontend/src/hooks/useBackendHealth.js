import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth } from '../services/api';

/**
 * Hook to monitor backend connectivity
 */
export function useBackendHealth(pollIntervalMs = 15000) {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const [details, setDetails] = useState(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await checkBackendHealth();
      setOnline(res.online);
      setDetails(res.data || null);
    } catch {
      setOnline(false);
      setDetails(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    checkBackendHealth().then((res) => {
      if (mounted) {
        setOnline(res.online);
        setDetails(res.data || null);
      }
    });

    const interval = setInterval(check, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [check, pollIntervalMs]);

  return {
    online,
    checking,
    details,
    checkNow: check,
  };
}
