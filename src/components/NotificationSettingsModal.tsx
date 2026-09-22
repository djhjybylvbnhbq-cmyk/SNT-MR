import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  AlertTriangle,
  X,
  CheckCircle2,
  Send,
  Smartphone,
} from 'lucide-react';
import {
  NotificationPreferences,
  loadNotificationPreferences,
  saveNotificationPreferences,
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationSupported,
  isBadgingSupported,
  sendDeviceNotification,
  playNotificationSound,
} from '../services/notifications';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestNotificationSent?: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onTestNotificationSent,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadNotificationPreferences());
  const [testSent, setTestSent] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setPrefs(loadNotificationPreferences());
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    const newPerm = await requestNotificationPermission();
    setPermission(newPerm);
    setIsRequesting(false);
    if (newPerm === 'granted') {
      const updated = { ...prefs, systemNotificationsEnabled: true };
      setPrefs(updated);
      saveNotificationPreferences(updated);
      // Play friendly chime on success
      playNotificationSound('test');
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveNotificationPreferences(updated);

    if (key === 'soundEnabled' && updated.soundEnabled) {
      playNotificationSound('announcement');
    }
  };

  const handleSendTestNotification = async () => {
    setTestSent(true);
    playNotificationSound(prefs.urgentOnly ? 'urgent' : 'announcement');

    await sendDeviceNotification({
      title: 'СНТ «Междуречье»',
      body: '🔔 Тестовое оповещение: уведомления успешно настроены и работают на вашем устройстве!',
      isUrgent: false,
      isImportant: true,
      tag: 'test-notification-' + Date.now(),
      onClick: () => {
        onClose();
      },
    });

    if (onTestNotificationSent) {
      onTestNotificationSent();
    }

    setTimeout(() => {
      setTestSent(false);
    }, 4000);
  };

  const supported = isNotificationSupported();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-[#dce3d5] space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#edf1e8] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#e9eddf] text-[#2d4a22] flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1f2d1d]">Уведомления на экран</h2>
              <p className="text-xs text-[#6a7c63]">Оповещения об объявлениях СНТ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#6a7c63] hover:text-[#1f2d1d] hover:bg-[#f4f7f1] transition cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Permission Banner */}
        <div className="rounded-2xl p-3.5 bg-[#f8faf6] border border-[#e3ebd9] space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#5a6b52] shrink-0" />
              <span className="text-xs font-semibold text-[#2c3e2d]">Разрешение на устройстве:</span>
            </div>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                permission === 'granted'
                  ? 'bg-[#dcfce7] text-[#166534] border border-[#86efac]'
                  : permission === 'denied'
                  ? 'bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5]'
                  : 'bg-[#fef3c7] text-[#92400e] border border-[#fde68a]'
              }`}
            >
              {permission === 'granted'
                ? 'Разрешено'
                : permission === 'denied'
                ? 'Заблокировано'
                : 'Не включено'}
            </span>
          </div>

          <p className="text-xs text-[#5a6b52] leading-relaxed">
            {permission === 'granted'
              ? 'Системные push-уведомления включены. Вы будете получать оповещения при выходе новых объявлений.'
              : permission === 'denied'
              ? 'Уведомления заблокированы в настройках браузера или телефона. Чтобы включить, нажмите на значок замка в адресной строке.'
              : 'Чтобы телефон или компьютер показывал всплывающие уведомления, разрешите их в браузере.'}
          </p>

          {permission !== 'granted' && supported && (
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] active:bg-[#23381a] text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              <span>{isRequesting ? 'Запрос разрешения...' : 'Включить уведомления на устройстве'}</span>
            </button>
          )}
        </div>

        {/* Granular Preferences */}
        <div className="space-y-2.5">
          {/* Toggle: System Notifications */}
          <label className="flex items-center justify-between p-3 rounded-2xl border border-[#dce3d5] bg-[#fcfdfa] hover:bg-[#f4f7f1] transition cursor-pointer select-none">
            <div className="pr-2">
              <div className="font-semibold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#2d4a22]" />
                <span>Системные всплывающие оповещения</span>
              </div>
              <div className="text-[11px] text-[#7a8c71]">
                Показ окна в шторке телефона или на рабочем столе компьютера
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.systemNotificationsEnabled && permission === 'granted'}
              disabled={permission !== 'granted'}
              onChange={() => handleToggle('systemNotificationsEnabled')}
              className="w-4 h-4 rounded text-[#2d4a22] focus:ring-[#8ba888] cursor-pointer disabled:opacity-40"
            />
          </label>

          {/* Toggle: Audio Sound */}
          <label className="flex items-center justify-between p-3 rounded-2xl border border-[#dce3d5] bg-[#fcfdfa] hover:bg-[#f4f7f1] transition cursor-pointer select-none">
            <div className="pr-2">
              <div className="font-semibold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#2d4a22]" />
                <span>Звуковой сигнал оповещения</span>
              </div>
              <div className="text-[11px] text-[#7a8c71]">
                Мягкий звуковой аккорд при получении важного объявления
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.soundEnabled}
              onChange={() => handleToggle('soundEnabled')}
              className="w-4 h-4 rounded text-[#2d4a22] focus:ring-[#8ba888] cursor-pointer"
            />
          </label>

          {/* Toggle: Urgent only */}
          <label className="flex items-center justify-between p-3 rounded-2xl border border-[#dce3d5] bg-[#fcfdfa] hover:bg-[#f4f7f1] transition cursor-pointer select-none">
            <div className="pr-2">
              <div className="font-semibold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#d97706]" />
                <span>Только срочные и важные</span>
              </div>
              <div className="text-[11px] text-[#7a8c71]">
                Присылать уведомления только со статусом «Срочно» или «Важно»
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.urgentOnly}
              onChange={() => handleToggle('urgentOnly')}
              className="w-4 h-4 rounded text-[#2d4a22] focus:ring-[#8ba888] cursor-pointer"
            />
          </label>

          {/* Toggle: App Badge */}
          {isBadgingSupported() && (
            <label className="flex items-center justify-between p-3 rounded-2xl border border-[#dce3d5] bg-[#fcfdfa] hover:bg-[#f4f7f1] transition cursor-pointer select-none">
              <div className="pr-2">
                <div className="font-semibold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#e11d48] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    1
                  </span>
                  <span>Счетчик на иконке на экране</span>
                </div>
                <div className="text-[11px] text-[#7a8c71]">
                  Красный кружок с количеством непрочитанных объявлений
                </div>
              </div>
              <input
                type="checkbox"
                checked={prefs.appBadgeEnabled}
                onChange={() => handleToggle('appBadgeEnabled')}
                className="w-4 h-4 rounded text-[#2d4a22] focus:ring-[#8ba888] cursor-pointer"
              />
            </label>
          )}
        </div>

        {/* Test Notification Button */}
        <div className="pt-2 border-t border-[#f0f2ec] space-y-2">
          <button
            type="button"
            onClick={handleSendTestNotification}
            className={`w-full py-2.5 px-4 rounded-xl border font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
              testSent
                ? 'bg-[#dcfce7] border-[#86efac] text-[#166534]'
                : 'bg-[#f4f7f1] hover:bg-[#e9eddf] border-[#dce3d5] text-[#2d4a22]'
            }`}
          >
            {testSent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                <span>Тестовое уведомление отправлено!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#2d4a22]" />
                <span>Проверить уведомление (Тест)</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-[#7a8c71] text-center">
            Нажмите кнопку, чтобы проверить воспроизведение звука и появление системного оповещения на вашем устройстве.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#2d4a22] text-white font-semibold text-xs hover:bg-[#3a5d2b] transition cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
