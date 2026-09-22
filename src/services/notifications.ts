/**
 * SNT Mezhdurechye Notification Service
 * Supports:
 * - Native Web Notifications (Lockscreen / Notification shade / Desktop)
 * - Service Worker showNotification with fallback to window.Notification
 * - Web Audio API synthesized gentle chime chords (100% offline, zero network assets)
 * - Badging API (app icon badge counter on home screen)
 * - Mobile Haptic Vibration
 * - Persistent notification user preferences in localStorage
 */

export interface NotificationPreferences {
  systemNotificationsEnabled: boolean;
  soundEnabled: boolean;
  urgentOnly: boolean;
  chatNotificationsEnabled: boolean;
  appBadgeEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  systemNotificationsEnabled: true,
  soundEnabled: true,
  urgentOnly: false,
  chatNotificationsEnabled: false,
  appBadgeEnabled: true,
};

const PREFS_STORAGE_KEY = 'snt_mezhdurechye_notification_prefs_v1';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isBadgingSupported(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const saved = localStorage.getItem(PREFS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_NOTIFICATION_PREFERENCES };
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// Web Audio API Synthesized Chime (Zero latency, works offline)
// -------------------------------------------------------------
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a pleasant synthetic acoustic chime
 * - 'announcement': Gentle harmonic bell chord (C5 -> E5 -> G5)
 * - 'urgent': Attention alert chime with resonant tone (A5 -> E6)
 * - 'test': Friendly verification chime
 */
export function playNotificationSound(type: 'announcement' | 'urgent' | 'test' = 'announcement'): void {
  const prefs = loadNotificationPreferences();
  if (!prefs.soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'urgent') {
      // Urgent tone: Two bright resonant notes
      const notes = [
        { freq: 880, start: 0, duration: 0.25 }, // A5
        { freq: 1318.51, start: 0.15, duration: 0.4 }, // E6
      ];
      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration);
      });
    } else {
      // Gentle 3-note harmonic chime (C5 -> E5 -> G5)
      const notes = [
        { freq: 523.25, start: 0, duration: 0.35 }, // C5
        { freq: 659.25, start: 0.1, duration: 0.4 }, // E5
        { freq: 783.99, start: 0.2, duration: 0.55 }, // G5
      ];
      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration);
      });
    }
  } catch (err) {
    console.debug('Notification sound playback note:', err);
  }
}

/**
 * Mobile vibration pattern
 */
export function vibrateDevice(pattern: number[] = [120, 80, 160]): void {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

/**
 * Updates application icon badge count (on mobile home screen / desktop dock)
 */
export function updateAppBadge(count: number): void {
  const prefs = loadNotificationPreferences();
  if (!prefs.appBadgeEnabled || !isBadgingSupported()) return;

  try {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  } catch {
    // ignore
  }
}

export interface AppNotificationPayload {
  title: string;
  body: string;
  isUrgent?: boolean;
  isImportant?: boolean;
  announcementId?: string;
  tag?: string;
  onClick?: () => void;
}

/**
 * Dispatches a native device notification (lockscreen / notification bar / desktop)
 */
export async function sendDeviceNotification(payload: AppNotificationPayload): Promise<boolean> {
  const prefs = loadNotificationPreferences();

  // Check filter: if user requested urgent/important only
  if (prefs.urgentOnly && !payload.isUrgent && !payload.isImportant) {
    return false;
  }

  // Sound and vibration
  if (prefs.soundEnabled) {
    playNotificationSound(payload.isUrgent ? 'urgent' : 'announcement');
  }
  vibrateDevice(payload.isUrgent ? [200, 100, 200, 100, 300] : [150, 80, 180]);

  // Check system notifications permission
  if (!prefs.systemNotificationsEnabled || !isNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const iconUrl = '/pwa-192x192.png';
  const badgeUrl = '/pwa-192x192.png';

  const titleText = payload.title.startsWith('СНТ') ? payload.title : `СНТ «Междуречье»: ${payload.title}`;
  const options: NotificationOptions & { renotify?: boolean } = {
    body: payload.body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: payload.tag || `snt-ann-${payload.announcementId || Date.now()}`,
    renotify: true,
    data: {
      url: window.location.href,
      announcementId: payload.announcementId,
    },
  };

  try {
    // 1. Try sending via ServiceWorkerRegistration (standard for PWAs, Android, Chrome)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(titleText, options);
          return true;
        }
      } catch (swErr) {
        console.debug('SW showNotification note:', swErr);
      }
    }

    // 2. Fallback to standard window.Notification
    const n = new Notification(titleText, options);
    n.onclick = (e) => {
      e.preventDefault();
      try {
        window.focus();
      } catch {
        // ignore
      }
      if (payload.onClick) {
        payload.onClick();
      }
      n.close();
    };
    return true;
  } catch (err) {
    console.warn('Could not display system notification:', err);
    return false;
  }
}
