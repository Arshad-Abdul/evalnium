import { useState, useEffect } from 'react';

export interface CountdownTimeRemaining {
  totalMs: number;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string; // e.g. "01d 04h 32m 15s" or "04h 32m 15s" or "32m 15s"
  shortFormatted: string; // e.g. "1d 4h" or "4h 32m" or "32m 15s"
  isExpired: boolean;
}

/**
 * Parses naive datetime-local strings (e.g. "2026-11-27T20:00") as IST (+05:30)
 * so client countdowns always match the server schedule regardless of user timezone.
 */
export function parseISTDateMs(targetIsoOrDate?: string | Date | null): number {
  if (!targetIsoOrDate) return 0;
  if (targetIsoOrDate instanceof Date) return targetIsoOrDate.getTime();
  const s = String(targetIsoOrDate).trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) {
    return new Date(s.replace(' ', 'T') + '+05:30').getTime();
  }
  return new Date(s).getTime();
}

/**
 * Calculates accurate remaining time against an ISO string or Date object.
 */
export function calculateTimeRemaining(
  targetIsoOrDate?: string | Date | null,
  referenceTimeMs: number = Date.now()
): CountdownTimeRemaining {
  if (!targetIsoOrDate) {
    return {
      totalMs: 0,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00m 00s',
      shortFormatted: '00m 00s',
      isExpired: true,
    };
  }

  const targetMs = parseISTDateMs(targetIsoOrDate);

  if (isNaN(targetMs) || targetMs <= 0) {
    return {
      totalMs: 0,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00m 00s',
      shortFormatted: '00m 00s',
      isExpired: true,
    };
  }

  const totalMs = targetMs - referenceTimeMs;

  if (totalMs <= 0) {
    return {
      totalMs: 0,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00m 00s',
      shortFormatted: '00m 00s',
      isExpired: true,
    };
  }

  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else if (hours > 0) {
    formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else {
    formatted = `${pad(minutes)}m ${pad(seconds)}s`;
  }

  let shortFormatted = '';
  if (days > 0) {
    shortFormatted = `${days}d ${hours}h`;
  } else if (hours > 0) {
    shortFormatted = `${hours}h ${minutes}m`;
  } else {
    shortFormatted = `${minutes}m ${seconds}s`;
  }

  return {
    totalMs,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    formatted,
    shortFormatted,
    isExpired: false,
  };
}

// Global master tick manager to prevent multiple setInterval timers across 50+ cards
let globalListeners: Array<(now: number) => void> = [];
let globalIntervalId: ReturnType<typeof setInterval> | null = null;

function subscribeToGlobalClock(callback: (now: number) => void): () => void {
  globalListeners.push(callback);

  if (!globalIntervalId) {
    globalIntervalId = setInterval(() => {
      const now = Date.now();
      for (let i = 0; i < globalListeners.length; i++) {
        globalListeners[i](now);
      }
    }, 1000);
  }

  return () => {
    globalListeners = globalListeners.filter((cb) => cb !== callback);
    if (globalListeners.length === 0 && globalIntervalId) {
      clearInterval(globalIntervalId);
      globalIntervalId = null;
    }
  };
}

/**
 * High-performance React hook for ticking countdowns.
 * Uses a single shared global clock across all cards for 0% lag and battery conservation.
 */
export function useExamCountdown(
  targetIsoOrDate?: string | Date | null,
  onExpire?: () => void
): CountdownTimeRemaining {
  const [remaining, setRemaining] = useState<CountdownTimeRemaining>(() =>
    calculateTimeRemaining(targetIsoOrDate)
  );

  useEffect(() => {
    if (!targetIsoOrDate) {
      setRemaining(calculateTimeRemaining(null));
      return;
    }

    // Initial evaluation
    const initial = calculateTimeRemaining(targetIsoOrDate);
    setRemaining(initial);

    if (initial.isExpired) {
      return;
    }

    let hasFiredExpire = false;

    const unsubscribe = subscribeToGlobalClock((nowMs) => {
      const updated = calculateTimeRemaining(targetIsoOrDate, nowMs);
      setRemaining(updated);

      if (updated.isExpired && !hasFiredExpire) {
        hasFiredExpire = true;
        onExpire?.();
      }
    });

    return unsubscribe;
  }, [targetIsoOrDate, onExpire]);

  return remaining;
}

/**
 * Adds minutes to an HTML datetime-local string (YYYY-MM-DDTHH:mm)
 * and returns the calculated datetime-local string in local time.
 */
export function addMinutesToDateTimeLocal(dateTimeStr: string, minutesToAdd: number): string {
  if (!dateTimeStr || isNaN(minutesToAdd) || minutesToAdd <= 0) return '';
  const d = new Date(dateTimeStr);
  if (isNaN(d.getTime())) return '';

  const newDate = new Date(d.getTime() + minutesToAdd * 60 * 1000);
  const year = newDate.getFullYear();
  const month = String(newDate.getMonth() + 1).padStart(2, '0');
  const day = String(newDate.getDate()).padStart(2, '0');
  const hours = String(newDate.getHours()).padStart(2, '0');
  const mins = String(newDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${mins}`;
}

