import { User } from '../types';

/**
 * Time threshold in milliseconds for a resident to be considered online.
 * 4 minutes (240 seconds) provides reliable presence detection while
 * tolerating mobile background pauses, screen-dimming timeouts, and tab switches.
 */
export const ONLINE_THRESHOLD_MS = 240 * 1000;

/**
 * Returns true if the resident is currently active in the application.
 */
export function isUserOnline(user: User, currentUserId?: string): boolean {
  if (!user) return false;
  if (currentUserId && user.id === currentUserId) {
    return true;
  }
  const activeIso = user.lastActiveAt || user.registeredAt;
  if (!activeIso) {
    return false;
  }
  const timestamp = new Date(activeIso).getTime();
  if (isNaN(timestamp)) {
    return false;
  }
  const diff = Date.now() - timestamp;
  // Account for clock drift between devices (up to 5 minutes into the future)
  return diff > -300000 && diff < ONLINE_THRESHOLD_MS;
}

/**
 * Returns a human-friendly Russian text indicating when the resident was last online.
 */
export function formatLastSeen(user: User, currentUserId?: string): string {
  if (!user) return 'Не в сети';
  if (isUserOnline(user, currentUserId)) {
    return 'В сети';
  }
  const activeIso = user.lastActiveAt || user.registeredAt;
  if (!activeIso) {
    return 'Не в сети';
  }
  const timestamp = new Date(activeIso).getTime();
  if (isNaN(timestamp)) {
    return 'Не в сети';
  }
  const diffMs = Date.now() - timestamp;

  // If clock skew made it slightly negative or zero, but not within online threshold
  if (diffMs <= 0) {
    return 'Был(а) только что';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) {
    return 'Был(а) только что';
  }
  if (diffMinutes < 60) {
    return `Был(а) ${diffMinutes} мин. назад`;
  }
  if (diffHours < 24) {
    return `Был(а) ${diffHours} ч. назад`;
  }
  if (diffDays === 1) {
    return 'Был(а) вчера';
  }
  if (diffDays < 7) {
    return `Был(а) ${diffDays} дн. назад`;
  }

  const date = new Date(timestamp);
  return `Был(а) ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
}

