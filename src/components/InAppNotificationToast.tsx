import React, { useEffect } from 'react';
import { Bell, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Announcement } from '../types';

interface InAppNotificationToastProps {
  announcement: Announcement | null;
  onOpen: (announcement: Announcement) => void;
  onDismiss: () => void;
}

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({
  announcement,
  onOpen,
  onDismiss,
}) => {
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 9000);
    return () => clearTimeout(timer);
  }, [announcement, onDismiss]);

  if (!announcement) return null;

  const isUrgent = announcement.priority === 'urgent';
  const isImportant = announcement.priority === 'important';

  return (
    <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-3 sm:px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
      <div
        className={`pointer-events-auto rounded-2xl p-3.5 shadow-2xl border backdrop-blur-md transition-all ${
          isUrgent
            ? 'bg-[#fffbeb]/95 border-[#fde68a] text-[#78350f]'
            : 'bg-white/95 border-[#dce3d5] text-[#2c3e2d]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              isUrgent ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#e9eddf] text-[#2d4a22]'
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-5 h-5 text-[#b45309]" />
            ) : (
              <Bell className="w-5 h-5 text-[#2d4a22] animate-bounce" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#e9eddf] text-[#2d4a22]">
                Новое объявление
              </span>
              {isUrgent && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#fecdd3] text-[#9f1239]">
                  Срочно
                </span>
              )}
              {isImportant && !isUrgent && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e]">
                  Важно
                </span>
              )}
              {announcement.category && (
                <span className="text-[10px] text-[#7a8c71]">{announcement.category}</span>
              )}
            </div>

            <h4 className="text-xs sm:text-sm font-bold truncate mt-1">
              {announcement.title}
            </h4>

            <p className="text-[11px] text-[#5a6b52] line-clamp-2 mt-0.5 leading-snug">
              {announcement.content.replace(/\[\/?(b|i|u|size[^\]]*|color[^\]]*)\]/g, '')}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => onOpen(announcement)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2d4a22] hover:bg-[#3a5d2b] text-white text-[11px] font-semibold shadow-2xs transition cursor-pointer"
              >
                <span>Ознакомиться</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="text-[11px] text-[#7a8c71] hover:text-[#2c3e2d] px-2 py-1 transition cursor-pointer"
              >
                Скрыть
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="text-[#7a8c71] hover:text-[#2c3e2d] p-1 rounded-md transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
