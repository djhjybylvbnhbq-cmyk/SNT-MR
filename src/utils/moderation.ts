import { User } from '../types';

/**
 * Checks if a user has true Administrator rights.
 * In SNT structure:
 * - 'admin' is the Administrator who manages technical settings, member roles, and moderation.
 * - 'chairman' is the Chairman (Председатель) who heads the SNT board.
 * - 'member' is a regular resident / plot owner.
 * Chairman is NOT an Administrator. Only users with role === 'admin' (or legacy isAdmin flag without chairman role) are Administrators.
 */
export const checkIsAdmin = (user?: User | null): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'chairman' || user.isChairman) return false;
  if (user.role === 'member') return false;
  return Boolean(user.isAdmin);
};

/**
 * Checks if a user is currently blocked from writing in community chats.
 * Returns true if blocked permanently or until a future timestamp.
 * Returns false if not blocked or if temporary block time has expired.
 */
export const isUserChatBlocked = (user?: User | null): boolean => {
  if (!user || !user.chatBlocked) return false;

  // Permanent / indefinite block until manual unblocking
  if (!user.chatBlockUntil || user.chatBlockUntil === 'indefinite') {
    return true;
  }

  // Temporary block: check expiration timestamp
  const expiryTime = new Date(user.chatBlockUntil).getTime();
  if (isNaN(expiryTime)) {
    return true; // invalid date, fallback to blocked
  }

  return Date.now() < expiryTime;
};

/**
 * Returns a human-friendly string describing remaining block duration.
 */
export const getChatBlockDurationText = (user?: User | null): string => {
  if (!user || !user.chatBlocked) return '';

  if (!user.chatBlockUntil || user.chatBlockUntil === 'indefinite') {
    return 'Бессрочно (до разблокировки)';
  }

  const expiryTime = new Date(user.chatBlockUntil).getTime();
  if (isNaN(expiryTime)) {
    return 'Бессрочно';
  }

  const diffMs = expiryTime - Date.now();
  if (diffMs <= 0) {
    return 'Срок блокировки истёк';
  }

  const diffMinutes = Math.ceil(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes} ${pluralize(diffMinutes, 'минута', 'минуты', 'минут')}`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  if (hours < 24) {
    const minText = remMinutes > 0 ? ` ${remMinutes} мин.` : '';
    return `${hours} ${pluralize(hours, 'час', 'часа', 'часов')}${minText}`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const hrText = remHours > 0 ? ` ${remHours} ч.` : '';
  return `${days} ${pluralize(days, 'день', 'дня', 'дней')}${hrText}`;
};

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export interface BlockDurationOption {
  id: string;
  label: string;
  minutes: number | null; // null represents indefinite
  badge?: string;
}

export const DURATION_OPTIONS: BlockDurationOption[] = [
  { id: '15m', label: '15 минут', minutes: 15 },
  { id: '1h', label: '1 час', minutes: 60 },
  { id: '3h', label: '3 часа', minutes: 180 },
  { id: '24h', label: '24 часа (1 сутки)', minutes: 1440 },
  { id: '3d', label: '3 суток', minutes: 4320 },
  { id: '7d', label: '7 дней (неделя)', minutes: 10080 },
  { id: '30d', label: '30 дней (месяц)', minutes: 43200 },
  { id: 'indefinite', label: 'Бессрочно (до разблокировки)', minutes: null, badge: 'Навсегда' },
];

export const POPULAR_BLOCK_REASONS = [
  'Спам / коммерческая реклама',
  'Нецензурная лексика или оскорбление соседей',
  'Флуд / провокации в чате',
  'Нарушение устава и правил СНТ',
  'Распространение недостоверной информации',
];
