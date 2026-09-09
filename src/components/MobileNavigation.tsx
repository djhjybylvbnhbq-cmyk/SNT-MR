import React from 'react';
import {
  MessageSquare,
  Bell,
  ShieldCheck,
  Users,
  Info,
  Sliders,
  FileText,
  Phone,
  HelpCircle,
  Folder,
} from 'lucide-react';
import { AppSectionConfig, UserRole } from '../types';

export type TabType = string;

interface MobileNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  unreadAnnouncementsCount: number;
  unreadChatCount?: number;
  sections: AppSectionConfig[];
  isAdmin: boolean;
  role?: UserRole;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  MessageSquare,
  Bell,
  ShieldCheck,
  Users,
  Info,
  Sliders,
  FileText,
  Phone,
  HelpCircle,
  Folder,
};

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab,
  onChangeTab,
  unreadAnnouncementsCount,
  unreadChatCount = 0,
  sections,
  isAdmin,
  role,
}) => {
  const userRole: UserRole = role || (isAdmin ? 'admin' : 'member');

  // Filter and sort sections by role and configured order:
  const enabledSections = sections
    .filter((s) => {
      if (!s.enabled || s.id === 'security') return false;
      if (s.isCustom) return true;
      if (userRole === 'admin' || userRole === 'chairman') {
        return ['chat', 'announcements', 'info', 'residents'].includes(s.id);
      }
      return ['chat', 'announcements', 'info'].includes(s.id);
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#fdfcf8]/95 backdrop-blur-md border-t border-[#dce3d5] py-1 px-2 shadow-md">
      <div className="max-w-xl mx-auto flex items-center justify-around overflow-x-auto no-scrollbar gap-1">
        {enabledSections.map((sec) => {
          const Icon = ICON_MAP[sec.icon] || FileText;
          const isActive = activeTab === sec.id;
          const isAnnouncements = sec.id === 'announcements';
          const isChat = sec.id === 'chat';

          return (
            <button
              key={sec.id}
              id={`nav-tab-${sec.id}`}
              onClick={() => onChangeTab(sec.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition relative shrink-0 min-w-[56px] sm:min-w-[64px] cursor-pointer ${
                isActive
                  ? 'text-[#2d4a22] font-bold'
                  : 'text-[#7a8c71] hover:text-[#2d4a22] font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5] text-[#2d4a22]' : 'stroke-[1.8]'
                  }`}
                />
                {Boolean(isAnnouncements && unreadAnnouncementsCount > 0) && (
                  <span
                    id="badge-unread-announcements"
                    className="absolute -top-1.5 -right-2.5 bg-[#92400e] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center animate-pulse shadow-xs border border-white"
                  >
                    {unreadAnnouncementsCount > 99 ? '99+' : unreadAnnouncementsCount}
                  </span>
                )}
                {Boolean(isChat && unreadChatCount > 0) && (
                  <span
                    id="badge-unread-chat"
                    className="absolute -top-1.5 -right-2.5 bg-[#2d4a22] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center animate-pulse shadow-xs border border-white"
                    title={`Непрочитанных сообщений: ${unreadChatCount}`}
                  >
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] mt-1 leading-none truncate max-w-[68px]">
                {sec.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#2d4a22] mt-1" />
              )}
            </button>
          );
        })}

        {/* Admin Studio Tab (Only visible to Admin) */}
        {userRole === 'admin' && (
          <button
            id="nav-tab-admin"
            onClick={() => onChangeTab('admin')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition relative shrink-0 min-w-[56px] sm:min-w-[64px] cursor-pointer ${
              activeTab === 'admin'
                ? 'text-[#2d4a22] font-bold'
                : 'text-[#7a8c71] hover:text-[#2d4a22] font-medium'
            }`}
            title="Панель управления приложением"
          >
            <div className="relative">
              <Sliders
                className={`w-5 h-5 transition-transform ${
                  activeTab === 'admin' ? 'scale-110 stroke-[2.5] text-[#2d4a22]' : 'stroke-[1.8]'
                }`}
              />
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#8ba888]" />
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 leading-none font-semibold">
              Админка
            </span>
            {activeTab === 'admin' && (
              <div className="w-1.5 h-1.5 rounded-full bg-[#2d4a22] mt-1" />
            )}
          </button>
        )}
      </div>
    </nav>
  );
};
