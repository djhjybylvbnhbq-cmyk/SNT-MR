import React, { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { getNotificationPermission } from '../services/notifications';

interface NotificationBellButtonProps {
  onOpenSettings: () => void;
  unreadCount?: number;
}

export const NotificationBellButton: React.FC<NotificationBellButtonProps> = ({
  onOpenSettings,
  unreadCount = 0,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setPermission(getNotificationPermission());
    // Also listen to window focus to keep permission in sync if changed in browser settings
    const handleFocus = () => {
      setPermission(getNotificationPermission());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const isGranted = permission === 'granted';

  return (
    <button
      id="btn-header-notifications"
      type="button"
      onClick={onOpenSettings}
      className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#3a5d2b]/80 hover:bg-[#3a5d2b] active:bg-[#2d4a22] border border-[#4d733c] text-white shadow-2xs transition cursor-pointer"
      title={
        isGranted
          ? 'Уведомления на экран включены (нажмите для настройки)'
          : 'Включить уведомления на экран при новых объявлениях'
      }
      aria-label="Уведомления на экран"
    >
      {isGranted ? (
        <Bell className="w-4 h-4 text-[#bbf7d0]" />
      ) : (
        <BellRing className="w-4 h-4 text-[#fde68a] animate-pulse" />
      )}

      {/* Unread badge count if > 0 */}
      {unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full bg-[#e11d48] text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-[#2d4a22] shadow-xs leading-none">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : !isGranted && permission !== 'denied' ? (
        /* Invite dot prompting to enable notifications */
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-1.5 ring-[#2d4a22] animate-ping"
          title="Нажмите, чтобы включить уведомления"
        />
      ) : null}
    </button>
  );
};
