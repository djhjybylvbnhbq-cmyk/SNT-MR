import { User } from '../types';

/**
 * Time threshold in milliseconds for a resident to be considered online.
 * Heartbeat runs every 30 seconds; 150 seconds (2.5 minutes) ensures smooth
 * presence status even across minor network pauses or backgrounding.
 */
export const ONLINE_THRESHOLD_MS = 150 * 1000;

/**
 * Returns true if the resident is currently active in the application.
 */
export function isUserOnline(user: User, currentUserId?: string): boolean {
  if (currentUserId && user.id === currentUserId) {
    return true;
  }
  if (!user.lastActiveAt) {
    return false;
  }
  const timestamp = new Date(user.lastActiveAt).getTime();
  if (isNaN(timestamp)) {
    return false;
  }
  const diff = Date.now() - timestamp;
  return diff >= 0 && diff < ONLINE_THRESHOLD_MS;
}

/**
 * Returns a human-friendly Russian text indicating when the resident was last online.
 */
export function formatLastSeen(user: User, currentUserId?: string): string {
  if (isUserOnline(user, currentUserId)) {
    return 'В сети';
  }
  if (!user.lastActiveAt) {
    return 'Не в сети';
  }
  const timestamp = new Date(user.lastActiveAt).getTime();
  if (isNaN(timestamp)) {
    return 'Не в сети';
  }
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) {
    return 'В сети';
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
