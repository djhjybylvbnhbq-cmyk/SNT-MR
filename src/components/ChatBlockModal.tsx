import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Infinity as InfinityIcon,
  X,
  AlertTriangle,
  Check,
  Calendar,
  Lock,
} from 'lucide-react';
import { User } from '../types';
import {
  isUserChatBlocked,
  getChatBlockDurationText,
  DURATION_OPTIONS,
  POPULAR_BLOCK_REASONS,
} from '../utils/moderation';
import { formatStreetName } from '../utils/streets';

interface ChatBlockModalProps {
  isOpen: boolean;
  user?: User | null;
  targetUser?: User | null;
  onClose: () => void;
  onSave?: (
    blocked: boolean,
    durationMinutes: number | null,
    reason: string
  ) => void | Promise<void>;
  onBlock?: (
    residentId: string,
    durationMinutes: number | null,
    reason: string
  ) => void | Promise<void>;
  onUnblock?: (residentId: string) => void | Promise<void>;
}

export const ChatBlockModal: React.FC<ChatBlockModalProps> = ({
  isOpen,
  user,
  targetUser,
  onClose,
  onSave,
  onBlock,
  onUnblock,
}) => {
  const activeUser = user || targetUser;

  const [selectedDurationId, setSelectedDurationId] = useState<string>('24h');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customValue, setCustomValue] = useState<string>('12');
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('hours');
  const [reason, setReason] = useState<string>('Нарушение правил чата СНТ');
  const [error, setError] = useState<string>('');

  // Reset form when activeUser changes
  useEffect(() => {
    if (activeUser) {
      setError('');
      if (activeUser.chatBlockReason) {
        setReason(activeUser.chatBlockReason);
      } else {
        setReason('Нарушение правил чата СНТ');
      }
      setSelectedDurationId('24h');
      setIsCustomDuration(false);
    }
  }, [activeUser]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeUser) return null;

  const isBlocked = isUserChatBlocked(activeUser);
  const remainingText = getChatBlockDurationText(activeUser);
  const streetFormatted = formatStreetName(activeUser.streetNumber);

  const handleSubmitBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    setError('');

    let finalMinutes: number | null = null;

    if (isCustomDuration) {
      const num = parseInt(customValue, 10);
      if (isNaN(num) || num <= 0) {
        setError('Пожалуйста, укажите корректное положительное число');
        return;
      }
      if (customUnit === 'hours') {
        finalMinutes = num * 60;
      } else {
        finalMinutes = num * 24 * 60;
      }
    } else {
      const option = DURATION_OPTIONS.find((o) => o.id === selectedDurationId);
      if (option) {
        finalMinutes = option.minutes;
      } else {
        finalMinutes = 1440; // fallback 24h
      }
    }

    const trimmedReason = reason.trim() || 'Нарушение правил чата СНТ';

    try {
      if (onSave) {
        await onSave(true, finalMinutes, trimmedReason);
      }
      if (onBlock) {
        await onBlock(activeUser.id, finalMinutes, trimmedReason);
      }
      onClose();
    } catch (err) {
      setError('Не удалось применить блокировку. Попробуйте снова.');
    }
  };

  const handleUnblock = async () => {
    if (!activeUser) return;
    try {
      if (onSave) {
        await onSave(false, null, '');
      }
      if (onUnblock) {
        await onUnblock(activeUser.id);
      }
      onClose();
    } catch (err) {
      setError('Не удалось снять блокировку. Попробуйте снова.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white rounded-3xl border border-[#dce3d5] shadow-2xl max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#fcfdfa] p-4 sm:p-5 border-b border-[#edf2e7] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-2xs ${
                isBlocked ? 'bg-[#be123c]' : 'bg-[#2d4a22]'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#2c3e2d]">
                {isBlocked ? 'Управление блокировкой садовода' : 'Блокировка садовода в чатах'}
              </h3>
              <p className="text-xs text-[#5a6b52]">
                Ограничение возможности отправлять сообщения и реакции
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7a8c71] hover:text-[#2c3e2d] hover:bg-[#e9eddf] transition cursor-pointer"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Resident Card */}
        <div className="p-4 sm:p-5 border-b border-[#edf2e7] bg-[#f8faf6]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#2d4a22] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {activeUser.fullName.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-[#2c3e2d] truncate">
                  {activeUser.fullName}
                </h4>
                {(activeUser.streetNumber || activeUser.plotNumber) && (
                  <p className="text-xs text-[#5a6b52] mt-0.5">
                    {[
                      activeUser.streetNumber ? streetFormatted : null,
                      activeUser.plotNumber ? `уч. ${activeUser.plotNumber}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>
            </div>

            <div>
              {isBlocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#fff1f2] text-[#9f1239] border border-[#fecdd3]">
                  <Lock className="w-3 h-3" />
                  <span>В бане</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-[#f4f7f1] text-[#2d4a22] border border-[#dce3d5]">
                  <Check className="w-3 h-3" />
                  <span>Доступ открыт</span>
                </span>
              )}
            </div>
          </div>

          {/* Active Block details banner if blocked */}
          {isBlocked && (
            <div className="mt-3.5 p-3 rounded-2xl bg-[#fff1f2] border border-[#fecdd3] text-xs text-[#9f1239] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#be123c]" />
                    <span>Садовод заблокирован</span>
                  </div>
                  <div className="text-[11px] text-[#be123c]/90 mt-1">
                    Срок: <strong>{remainingText}</strong>
                    {activeUser.chatBlockUntil && activeUser.chatBlockUntil !== 'indefinite' && (
                      <span className="ml-1 text-[11px] opacity-80">
                        (до {new Date(activeUser.chatBlockUntil).toLocaleString('ru-RU')})
                      </span>
                    )}
                  </div>
                  {activeUser.chatBlockReason && (
                    <div className="text-[11px] mt-1 text-[#78350f] bg-white/60 px-2 py-1 rounded-lg">
                      <strong>Причина:</strong> {activeUser.chatBlockReason}
                    </div>
                  )}
                  {activeUser.chatBlockedBy && (
                    <div className="text-[10px] text-[#7a8c71] mt-1">
                      Модератор: {activeUser.chatBlockedBy}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  id="btn-unblock-resident-now"
                  onClick={handleUnblock}
                  className="px-3 py-1.5 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                  title="Снять блокировку прямо сейчас"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#a2d1a2]" />
                  <span>Разблокировать</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Block Form */}
        <form onSubmit={handleSubmitBlock} className="p-4 sm:p-5 space-y-4">
          <div className="text-xs font-bold text-[#5c4033] uppercase tracking-wider flex items-center justify-between">
            <span>{isBlocked ? 'Изменить срок блокировки:' : 'Выберите длительность блокировки:'}</span>
            <span className="text-[10px] text-[#7a8c71] font-normal lowercase">
              (на время или бессрочно)
            </span>
          </div>

          {/* Duration Preset Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = !isCustomDuration && selectedDurationId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setIsCustomDuration(false);
                    setSelectedDurationId(opt.id);
                  }}
                  className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 text-center transition border cursor-pointer ${
                    isSelected
                      ? 'bg-[#2d4a22] text-white border-[#2d4a22] shadow-2xs ring-2 ring-[#2d4a22]/20'
                      : 'bg-[#fcfdfa] text-[#2c3e2d] border-[#dce3d5] hover:bg-[#f4f7f1]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {opt.minutes === null ? (
                      <InfinityIcon className="w-3.5 h-3.5 text-[#e0a96d]" />
                    ) : (
                      <Clock className="w-3 h-3 opacity-70" />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {opt.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider ${
                        isSelected
                          ? 'bg-[#e0a96d] text-[#2d4a22]'
                          : 'bg-[#fef3c7] text-[#92400e]'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Duration Toggle & Inputs */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsCustomDuration(!isCustomDuration)}
              className="text-xs text-[#2d4a22] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isCustomDuration ? 'Выбрать из стандартных сроков' : 'Указать произвольный срок...'}</span>
            </button>

            {isCustomDuration && (
              <div className="mt-2.5 p-3 rounded-2xl bg-[#f4f7f1] border border-[#dce3d5] flex items-center gap-2">
                <span className="text-xs text-[#5a6b52] whitespace-nowrap">Срок:</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-20 px-2.5 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white font-bold text-center text-[#2c3e2d]"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as 'hours' | 'days')}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white font-semibold text-[#2c3e2d] cursor-pointer"
                >
                  <option value="hours">Часов</option>
                  <option value="days">Дней / суток</option>
                </select>
              </div>
            )}
          </div>

          {/* Reason Section */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-[#5c4033] uppercase tracking-wider">
              Причина блокировки:
            </label>
            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_BLOCK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-[11px] px-2 py-1 rounded-lg border transition cursor-pointer text-left ${
                    reason === r
                      ? 'bg-[#e9eddf] text-[#2d4a22] font-semibold border-[#8ba888]'
                      : 'bg-[#fcfdfa] text-[#5a6b52] border-[#dce3d5] hover:bg-[#f4f7f1]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину для садовода или примечание для правления..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] placeholder-[#7a8c71] focus:outline-none focus:border-[#8ba888]"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#9f1239] text-xs">
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#edf2e7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5a6b52] hover:bg-[#f4f7f1] rounded-xl transition cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="submit"
              id="btn-confirm-chat-block"
              className="px-4 py-2 rounded-xl bg-[#be123c] hover:bg-[#9f1239] text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isBlocked ? 'Обновить блокировку' : 'Заблокировать садовода'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
