import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, Edit, Building, Shield, ShieldAlert, Clock, Circle } from 'lucide-react';
import { User, UserRole } from '../types';
import { isUserChatBlocked, getChatBlockDurationText, checkIsAdmin } from '../utils/moderation';
import { isUserOnline, formatLastSeen } from '../utils/presence';
import { ChatBlockModal } from './ChatBlockModal';

interface ResidentsDirectoryProps {
  currentUser: User;
  residents: User[];
  onEditProfile: () => void;
  onUpdateResidentRole?: (residentId: string, newRole: UserRole) => void;
  onUpdateChatBlock?: (
    residentId: string,
    blocked: boolean,
    durationMinutes?: number | null,
    reason?: string
  ) => void;
  onDeleteResident?: (residentId: string) => Promise<void> | void;
}

export const ResidentsDirectory: React.FC<ResidentsDirectoryProps> = ({
  currentUser,
  residents,
  onEditProfile,
  onUpdateResidentRole,
  onUpdateChatBlock,
}) => {
  const [search, setSearch] = useState('');
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const [modalUser, setModalUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ticker to refresh elapsed "last seen" relative time every 15 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Strict check: Only a real administrator can change roles and moderate chat blocks
  const isCurrentUserAdmin = checkIsAdmin(currentUser);

  // Ensure currentUser is always part of residents list
  const allResidents = residents.some((r) => r.id === currentUser.id)
    ? residents
    : [currentUser, ...residents];

  // Online count calculation
  const onlineResidentsCount = allResidents.filter((r) => isUserOnline(r, currentUser.id)).length;

  const filtered = allResidents.filter((r) => {
    if (showOnlyOnline && !isUserOnline(r, currentUser.id)) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (r.fullName || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 text-[#2c3e2d]">
      {/* My Profile Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#e6ebe0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full bg-[#e9eddf] border border-[#dce3d5] flex items-center justify-center font-bold text-lg text-[#2d4a22] shadow-2xs">
                {currentUser.fullName.slice(0, 1)}
              </div>
              {/* My online indicator */}
              <span
                className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white"
                title="Вы сейчас в сети"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[#2c3e2d]">{currentUser.fullName}</h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>В сети</span>
                </span>
                {currentUser.role === 'chairman' && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-bold border border-[#fde68a]">
                    Председатель
                  </span>
                )}
                {(currentUser.role === 'admin' || currentUser.isAdmin) && (
                  <span className="px-2 py-0.5 rounded-full bg-[#e0f2fe] text-[#0369a1] text-[10px] font-bold border border-[#bae6fd]">
                    Администратор
                  </span>
                )}
                {currentUser.role === 'member' && (
                  <span className="px-2 py-0.5 rounded-full bg-[#e9eddf] text-[#5a6b52] text-[10px] font-medium border border-[#dce3d5]">
                    Член СНТ
                  </span>
                )}
              </div>
              {currentUser.phone && (
                <p className="text-[11px] text-[#7a8c71] mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#8ba888]" />
                  <span>{currentUser.phone}</span>
                </p>
              )}
            </div>
          </div>

          <button
            id="btn-edit-my-profile"
            onClick={onEditProfile}
            className="py-2.5 px-4 border border-[#2d4a22] text-[#2d4a22] rounded-xl text-xs font-semibold hover:bg-[#f4f7f1] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Редактировать данные</span>
          </button>
        </div>

        {/* Profile Attributes Details */}
        <div className="mt-4 pt-3 border-t border-[#f0f2ec] text-xs flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 py-1.5 px-3 bg-[#fcfdfa] rounded-xl border border-[#edf2e7]">
            <span className="text-[#7a8c71]">Статус:</span>
            <span className="text-[#2d4a22] font-bold">
              {currentUser.role === 'chairman' || currentUser.isChairman
                ? 'Председатель СНТ'
                : isCurrentUserAdmin
                ? 'Администратор СНТ'
                : 'Член СНТ'}
            </span>
          </div>
          {currentUser.phone && (
            <div className="flex items-center gap-2 py-1.5 px-3 bg-[#fcfdfa] rounded-xl border border-[#edf2e7]">
              <span className="text-[#7a8c71]">Телефон:</span>
              <span className="font-semibold text-[#2c3e2d]">{currentUser.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Directory Section */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#e6ebe0] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f2ec] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#5c4033] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2d4a22]" />
              <span>Реестр садоводов СНТ «Междуречье»</span>
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs text-[#5a6b52]">
                Садоводов: {residents.length}
              </p>
              <span className="text-[#8ba888]">•</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>в сети: {onlineResidentsCount}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Filter Toggle: All vs Only Online */}
            <div className="flex items-center bg-[#f4f7f1] p-1 rounded-xl border border-[#dce3d5] text-xs">
              <button
                type="button"
                onClick={() => setShowOnlyOnline(false)}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  !showOnlyOnline
                    ? 'bg-white text-[#2c3e2d] font-bold shadow-2xs border border-[#dce3d5]'
                    : 'text-[#5a6b52] hover:text-[#2c3e2d]'
                }`}
              >
                Все ({residents.length})
              </button>
              <button
                type="button"
                onClick={() => setShowOnlyOnline(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  showOnlyOnline
                    ? 'bg-white text-emerald-800 font-bold shadow-2xs border border-emerald-300'
                    : 'text-[#5a6b52] hover:text-emerald-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>В сети ({onlineResidentsCount})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#7a8c71] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Поиск по ФИО..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] placeholder-[#7a8c71]/70 focus:outline-none focus:border-[#8ba888]"
              />
            </div>
          </div>
        </div>

        {/* Empty state when filtering */}
        {filtered.length === 0 && (
          <div className="p-8 text-center bg-[#fcfdfa] rounded-2xl border border-dashed border-[#dce3d5] space-y-2">
            <Users className="w-8 h-8 text-[#8ba888] mx-auto opacity-60" />
            <p className="text-xs font-semibold text-[#5c4033]">
              {showOnlyOnline ? 'Сейчас других садоводов нет в сети' : 'Садоводы не найдены'}
            </p>
            {showOnlyOnline && (
              <button
                type="button"
                onClick={() => setShowOnlyOnline(false)}
                className="text-xs text-[#2d4a22] font-bold underline hover:text-[#3a5d2b] cursor-pointer"
              >
                Показать всех садоводов ({residents.length})
              </button>
            )}
          </div>
        )}

        {/* Residents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((res) => {
            const isMe = res.id === currentUser.id;
            const isResAdmin = res.role === 'admin' || res.isAdmin;
            const isResChairman = res.role === 'chairman' || res.isChairman;
            const isOnline = isUserOnline(res, currentUser.id);
            const lastSeenText = formatLastSeen(res, currentUser.id);

            return (
              <div
                key={res.id}
                className={`p-3.5 rounded-2xl border transition ${
                  isMe
                    ? 'border-[#8ba888] bg-[#e9eddf]/60'
                    : 'border-[#dce3d5] bg-[#f4f7f1] hover:bg-[#e9eddf]/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full ${
                        isMe
                          ? 'bg-[#2d4a22] text-white'
                          : 'bg-[#e9eddf] border border-[#dce3d5] text-[#2d4a22]'
                      } flex items-center justify-center font-bold text-xs shadow-2xs`}
                    >
                      {(res.fullName || 'С').slice(0, 1)}
                    </div>
                    {/* Visual dot on avatar */}
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                        isOnline ? 'bg-emerald-500 shadow-xs' : 'bg-[#cbd5e1]'
                      }`}
                      title={isOnline ? 'В сети' : lastSeenText}
                    />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#2c3e2d] truncate">
                        {res.fullName || 'Садовод'}
                      </h4>
                      {isMe && (
                        <span className="text-[10px] text-[#2d4a22] font-bold bg-[#e9eddf] px-1.5 py-0.2 rounded-md border border-[#8ba888] shrink-0">
                          Вы
                        </span>
                      )}
                    </div>

                    {/* Online status indicator badge & role badges */}
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                          <span>В сети</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-[#7a8c71] bg-[#f0f4ec] px-1.5 py-0.5 rounded border border-[#dce3d5]"
                          title={res.lastActiveAt ? new Date(res.lastActiveAt).toLocaleString('ru-RU') : undefined}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8]"></span>
                          <span className="truncate">{lastSeenText}</span>
                        </span>
                      )}

                      {isResAdmin && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-[#0369a1] font-semibold bg-[#e0f2fe] px-1.5 py-0.5 rounded border border-[#bae6fd]">
                          <Shield className="w-2.5 h-2.5" />
                          <span>Администратор</span>
                        </div>
                      )}

                      {isResChairman && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-[#92400e] font-semibold bg-[#fef3c7] px-1.5 py-0.5 rounded border border-[#fde68a]">
                          <Building className="w-2.5 h-2.5" />
                          <span>Председатель</span>
                        </div>
                      )}

                      {!isResAdmin && !isResChairman && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-[#5a6b52] font-medium bg-[#e9eddf] px-1.5 py-0.5 rounded">
                          <span>Член СНТ</span>
                        </div>
                      )}
                    </div>

                    {/* Admin status controls - ONLY Admin can change resident role */}
                    {isCurrentUserAdmin && (
                      <div className="mt-2 pt-2 border-t border-[#dce3d5]/80 flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-[#5c4033] font-semibold text-[10px]">
                          Статус:
                        </span>
                        <select
                          id={`select-role-${res.id}`}
                          value={res.role || (res.isAdmin ? 'admin' : res.isChairman ? 'chairman' : 'member')}
                          onChange={(e) =>
                            onUpdateResidentRole &&
                            onUpdateResidentRole(res.id, e.target.value as UserRole)
                          }
                          className="px-1.5 py-0.5 rounded-md border border-[#8ba888] bg-white text-[#2c3e2d] font-semibold text-[11px] focus:outline-none cursor-pointer"
                          title="Присвоить статус правления (Администратор / Председатель / Член СНТ)"
                        >
                          <option value="member">Член СНТ</option>
                          <option value="chairman">Председатель</option>
                          <option value="admin">Администратор</option>
                        </select>
                      </div>
                    )}

                    {/* Chat Block status / button - ONLY Admin can manage or block */}
                    {isUserChatBlocked(res) && (
                      <div className="mt-1.5 p-1.5 rounded-lg bg-[#fff1f2] border border-[#fecdd3] flex items-center justify-between gap-1 text-[11px]">
                        <div className="min-w-0">
                          <span className="text-[#9f1239] font-bold text-[10px] flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-[#be123c] shrink-0" />
                            <span className="truncate">Бан: {getChatBlockDurationText(res)}</span>
                          </span>
                        </div>
                        {isCurrentUserAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalUser(res);
                              setIsModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded-md bg-white border border-[#fecdd3] text-[#be123c] font-bold hover:bg-[#fff1f2] shrink-0 text-[10px] cursor-pointer shadow-2xs"
                          >
                            Управление
                          </button>
                        )}
                      </div>
                    )}

                    {/* Admin Action Buttons: Chat Block */}
                    {!isMe && isCurrentUserAdmin && !isUserChatBlocked(res) && (
                      <div className="mt-2 pt-1.5 border-t border-[#dce3d5]/50 flex items-center justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            setModalUser(res);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#fff1f2] hover:bg-[#ffe4e6] border border-[#fecdd3] text-[10px] text-[#be123c] font-semibold transition cursor-pointer"
                          title="Заблокировать садовода в чатах СНТ"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Блокировка</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Block Modal for Admin */}
      {isModalOpen && modalUser && (
        <ChatBlockModal
          isOpen={isModalOpen}
          user={modalUser}
          targetUser={modalUser}
          onClose={() => {
            setIsModalOpen(false);
            setModalUser(null);
          }}
          onSave={async (blocked, durationMinutes, reason) => {
            if (onUpdateChatBlock && modalUser) {
              await onUpdateChatBlock(modalUser.id, blocked, durationMinutes, reason);
            }
            setIsModalOpen(false);
            setModalUser(null);
          }}
        />
      )}
    </div>
  );
};

