import { Announcement } from '../types';

/**
 * Checks if an announcement is currently scheduled for future publication.
 */
export function isAnnouncementScheduled(ann: Announcement, currentTimeMs: number = Date.now()): boolean {
  if (!ann.scheduledAt) return false;
  const scheduleTime = new Date(ann.scheduledAt).getTime();
  if (isNaN(scheduleTime)) return false;
  return scheduleTime > currentTimeMs;
}

/**
 * Checks if an announcement is published and visible to regular residents.
 */
export function isAnnouncementPublished(ann: Announcement, currentTimeMs: number = Date.now()): boolean {
  return !isAnnouncementScheduled(ann, currentTimeMs);
}

/**
 * Formats a scheduled ISO date-time into Russian locale string.
 * Example: "8 сентября 2026 г. в 15:30"
 */
export function formatScheduledDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} в ${timePart}`;
  } catch {
    return isoString;
  }
}

/**
 * Formats time remaining until scheduled publication.
 * Example: "через 45 мин", "через 2 ч 15 мин", "через 3 дн"
 */
export function getScheduledRemainingText(isoString: string, currentTimeMs: number = Date.now()): string {
  try {
    const target = new Date(isoString).getTime();
    if (isNaN(target)) return '';
    const diffMs = target - currentTimeMs;
    if (diffMs <= 0) return 'сейчас';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `через ${diffMinutes} мин`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    const remMinutes = diffMinutes % 60;
    if (diffHours < 24) {
      return remMinutes > 0
        ? `через ${diffHours} ч ${remMinutes} мин`
        : `через ${diffHours} ч`;
    }

    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;
    return remHours > 0
      ? `через ${diffDays} д ${remHours} ч`
      : `через ${diffDays} д`;
  } catch {
    return '';
  }
}

/**
 * Converts a Date or ISO string to the value required by `<input type="datetime-local" />` (YYYY-MM-DDTHH:mm).
 */
export function toDateTimeLocalValue(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
