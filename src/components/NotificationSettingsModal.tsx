import React, { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  Sliders,
  Send,
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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#dce3d5] space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f2ec] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#e9eddf] text-[#2d4a22] flex items-center justify-center shadow-2xs">
              <Bell className="w-5 h-5 text-[#2d4a22]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#2c3e2d]">
                Уведомления на экран
              </h3>
              <p className="text-[11px] text-[#7a8c71]">
                Оповещения об объявлениях правления и событиях
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#7a8c71] hover:text-[#2c3e2d] p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permission Status Box */}
        <div className="p-3.5 rounded-2xl bg-[#f4f7f1] border border-[#dce3d5] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#5c4033] flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#2d4a22]" />
              <span>Статус на этом устройстве:</span>
            </span>

            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#166534] font-bold text-[11px] border border-[#bbf7d0]">
                <CheckCircle2 className="w-3 h-3 text-[#16a34a]" />
                <span>Разрешено</span>
              </span>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fee2e2] text-[#991b1b] font-bold text-[11px] border border-[#fecdd3]">
                <AlertTriangle className="w-3 h-3 text-[#dc2626]" />
                <span>Заблокировано</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] font-bold text-[11px] border border-[#fde68a]">
                <Info className="w-3 h-3 text-[#d97706]" />
                <span>Не включено</span>
              </span>
            )}
          </div>

          {permission !== 'granted' && supported && (
            <div>
              <p className="text-[11px] text-[#5a6b52] leading-relaxed mb-2.5">
                {permission === 'denied'
                  ? 'Уведомления заблокированы в настройках браузера. Чтобы получать оповещения, нажмите на значок настроек (замочек) возле адреса сайта и разрешите «Уведомления».'
                  : 'Включите уведомления, чтобы оперативно узнавать об отключениях света, воды, собраниях и важных новостях даже при закрытом приложении.'}
              </p>

              {permission !== 'denied' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  disabled={isRequesting}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] active:bg-[#223a1a] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-[#a2d1a2]" />
                  <span>{isRequesting ? 'Запрос разрешения...' : 'Включить уведомления на устройстве'}</span>
                </button>
              )}
            </div>
          )}

          {!supported && (
            <p className="text-[11px] text-[#92400e]">
              Данный браузер не поддерживает системные Web Notifications. Рекомендуем использовать Chrome, Safari или Яндекс.Браузер.
            </p>
          )}
        </div>

        {/* Toggles List */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-[#5c4033] flex items-center gap-1.5 mb-1">
            <Sliders className="w-3.5 h-3.5 text-[#2d4a22]" />
            <span>Параметры оповещений:</span>
          </div>

          {/* Toggle: System Notifications */}
          <label className="flex items-center justify-between p-3 rounded-2xl border border-[#dce3d5] bg-[#fcfdfa] hover:bg-[#f4f7f1] transition cursor-pointer select-none">
            <div className="pr-2">
              <div className="font-semibold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#2d4a22]" />
                <span>Системные оповещения</span>
              </div>
              <div className="text-[11px] text-[#7a8c71]">
                Всплывающее окно на экране телефона или компьютера
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.systemNotificationsEnabled && permission === 'granted'}
              disabled={permission !== 'granted'}
              onChange={() => handleToggle('systemNotificationsEnabled')}
              className="w-4 h-4 rounded text-[#2d4a22] focus:ring-[#8ba888] cursor-pointer"
            />
          </label>

          {/* Toggle: Sound */}
          <label className="flex items-center justify-between p-3 rounded-2xl border border-[#dce3d5] bg-[#fcfdfa] hover:bg-[#f4f7f1] transition cursor-pointer select-none">
            <div className="pr-2">
              <div className="font-semibold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                {prefs.soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#2d4a22]" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-[#7a8c71]" />
                )}
                <span>Звуковой сигнал</span>
              </div>
              <div className="text-[11px] text-[#7a8c71]">
                Мягкий звуковой колокольчик при новом объявлении
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
