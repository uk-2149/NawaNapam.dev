"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // Always assume online on server
}

/**
 * Hook to detect online/offline status
 * Uses useSyncExternalStore for better React 18+ compatibility
 * @returns boolean - true if online, false if offline
 */
export function useOnline() {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  return isOnline;
}

/**
 * Alternative implementation with more granular control
 * Returns both status and event timestamps
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState({
    isOnline: true,
    lastChanged: new Date(),
  });

  useEffect(() => {
    // Set initial state
    setStatus({
      isOnline: navigator.onLine,
      lastChanged: new Date(),
    });

    const handleOnline = () => {
      setStatus({
        isOnline: true,
        lastChanged: new Date(),
      });
    };

    const handleOffline = () => {
      setStatus({
        isOnline: false,
        lastChanged: new Date(),
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return status;
}
