import React from 'react';
import { Trees, LogOut, Cloud } from 'lucide-react';
import { User, AppBrandingConfig } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { formatStreetName } from '../utils/streets';

interface MobileHeaderProps {
  currentUser: User | null;
  branding: AppBrandingConfig;
  isCloudConnected?: boolean;
  onLock?: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onSwitchUser?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentUser,
  branding,
  isCloudConnected = true,
  onOpenProfile,
  onOpenAdmin,
  onSwitchUser,
}) => {
  return (
    <header className="bg-[#2d4a22] text-[#f4f7f1] border-b border-[#3a5d2b] px-3 sm:px-6 py-2.5 sm:py-3 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* SNT Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#8ba888] rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
            <Trees className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-base font-bold tracking-tight uppercase text-white truncate max-w-[150px] sm:max-w-xs">
                {branding.appName || 'СНТ Междуречье'}
              </h1>
              {isCloudConnected && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#3a5d2b] text-[#bbf7d0] border border-[#4d733c]/60"
                  title="Подключено к серверу: данные синхронизируются в реальном времени"
                >
                  <Cloud className="w-3 h-3 text-[#4ade80]" />
                  <span className="hidden sm:inline">Онлайн</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Current User Pill / Lock */}
          {currentUser && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                id="btn-header-profile"
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#3a5d2b]/80 hover:bg-[#3a5d2b] border border-[#4d733c] text-[#f4f7f1] transition"
                title="Мой профиль и статус"
              >
                <div
                  className={`w-6 h-6 rounded-lg ${
                    currentUser.avatarColor || 'bg-[#8ba888]'
                  } text-white flex items-center justify-center text-[11px] font-bold shadow-2xs`}
                >
                  {currentUser.fullName.slice(0, 1)}
                </div>
                <div className="hidden md:block text-left text-xs leading-none">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-white">{currentUser.fullName.split(' ')[0]}</span>
                    {currentUser.role === 'chairman' && (
                      <span className="text-[9px] bg-[#fef3c7] text-[#92400e] px-1 py-0.2 rounded font-bold">
                        Председатель
                      </span>
                    )}
                    {(currentUser.role === 'admin' || currentUser.isAdmin) && (
                      <span className="text-[9px] bg-[#e0f2fe] text-[#0369a1] px-1 py-0.2 rounded font-bold">
                        Админ
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#a2d1a2]">
                    {formatStreetName(currentUser.streetNumber)} • уч. {currentUser.plotNumber}
                  </div>
                </div>
              </button>

              {onSwitchUser && (
                <button
                  id="btn-header-switch-user"
                  onClick={onSwitchUser}
                  className="p-1.5 sm:p-2 rounded-xl text-[#a2d1a2] hover:text-white hover:bg-[#3a5d2b] transition border border-transparent hover:border-[#4d733c] flex items-center gap-1 cursor-pointer"
                  title="Сменить профиль / Выйти"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
