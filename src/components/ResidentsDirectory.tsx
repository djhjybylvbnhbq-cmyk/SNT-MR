import React, { useState } from 'react';
import { Users, Search, Phone, Edit, Building, Shield, ShieldAlert, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { User, UserRole } from '../types';
import { SNT_STREETS, formatStreetName } from '../utils/streets';
import { isUserChatBlocked, getChatBlockDurationText, checkIsAdmin } from '../utils/moderation';
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
  onDeleteResident,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStreet, setSelectedStreet] = useState('all');
  const [modalUser, setModalUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Strict check: Only a real administrator can change roles and moderate chat blocks
  const isCurrentUserAdmin = checkIsAdmin(currentUser);

  const filtered = residents.filter((r) => {
    const formattedStreet = formatStreetName(r.streetNumber);
    if (selectedStreet !== 'all' && formattedStreet !== selectedStreet) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.fullName.toLowerCase().includes(q) ||
        formattedStreet.toLowerCase().includes(q) ||
        r.plotNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 text-[#2c3e2d]">
      {/* My Profile Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#e6ebe0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#e9eddf] border border-[#dce3d5] flex items-center justify-center font-bold text-lg text-[#2d4a22] shadow-2xs shrink-0">
              {currentUser.fullName.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#2c3e2d]">{currentUser.fullName}</h2>
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
              <p className="text-xs text-[#7a8c71] mt-0.5">
                Участок № <span className="font-semibold text-[#2d4a22]">{currentUser.plotNumber}</span>
              </p>
              {currentUser.phone && (
                <p className="text-[11px] text-[#7a8c71] mt-0.5 flex items-center gap-1">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#f0f2ec] text-xs">
          <div className="flex justify-between sm:justify-start sm:gap-2 py-1 bg-[#fcfdfa] p-2 rounded-xl">
            <span className="text-[#7a8c71]">Улица:</span>
            <span className="font-semibold text-[#2c3e2d]">{formatStreetName(currentUser.streetNumber)}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2 py-1 bg-[#fcfdfa] p-2 rounded-xl">
            <span className="text-[#7a8c71]">Номер участка:</span>
            <span className="font-semibold text-[#2d4a22]">№ {currentUser.plotNumber}</span>
          </div>
          <div className="flex justify-between sm:justify-start sm:gap-2 py-1 bg-[#fcfdfa] p-2 rounded-xl">
            <span className="text-[#7a8c71]">Статус:</span>
            <span className="text-[#2d4a22] font-bold">
              {currentUser.role === 'chairman' || currentUser.isChairman
                ? 'Председатель СНТ'
                : isCurrentUserAdmin
                ? 'Администратор СНТ'
                : 'Член СНТ'}
            </span>
          </div>
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
            <p className="text-xs text-[#5a6b52]">
              Локальный справочник участников (25 улиц, участков: {residents.length})
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7a8c71] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Поиск по ФИО или участку..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] placeholder-[#7a8c71]/70 focus:outline-none focus:border-[#8ba888]"
              />
            </div>

            <select
              value={selectedStreet}
              onChange={(e) => setSelectedStreet(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] font-medium focus:outline-none focus:border-[#8ba888]"
            >
              <option value="all">Все улицы (25)</option>
              {SNT_STREETS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Residents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((res) => {
            const isMe = res.id === currentUser.id;
            const resStreet = formatStreetName(res.streetNumber);
            const isResAdmin = res.role === 'admin' || res.isAdmin;
            const isResChairman = res.role === 'chairman' || res.isChairman;

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
                  <div
                    className={`w-10 h-10 rounded-full ${
                      isMe
                        ? 'bg-[#2d4a22] text-white'
                        : 'bg-[#e9eddf] border border-[#dce3d5] text-[#2d4a22]'
                    } flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                  >
                    {res.fullName.slice(0, 1)}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#2c3e2d] truncate">
                        {res.fullName}
                      </h4>
                      {isMe && (
                        <span className="text-[10px] text-[#2d4a22] font-bold bg-[#e9eddf] px-1.5 py-0.2 rounded-md border border-[#8ba888]">
                          Вы
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#5a6b52] mt-0.5">
                      <span className="font-semibold">{resStreet}</span> • уч.{' '}
                      <span className="font-bold text-[#2c3e2d]">{res.plotNumber}</span>
                    </div>

                    {isResAdmin && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#0369a1] font-semibold bg-[#e0f2fe] px-1.5 py-0.5 rounded border border-[#bae6fd]">
                        <Shield className="w-2.5 h-2.5" />
                        <span>Администратор</span>
                      </div>
                    )}

                    {isResChairman && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#92400e] font-semibold bg-[#fef3c7] px-1.5 py-0.5 rounded border border-[#fde68a]">
                        <Building className="w-2.5 h-2.5" />
                        <span>Председатель</span>
                      </div>
                    )}

                    {!isResAdmin && !isResChairman && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#5a6b52] font-medium bg-[#e9eddf] px-1.5 py-0.5 rounded">
                        <span>Член СНТ</span>
                      </div>
                    )}

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

                    {/* Admin Action Buttons: Chat Block & Delete */}
                    {!isMe && isCurrentUserAdmin && (
                      <div className="mt-2 pt-1.5 border-t border-[#dce3d5]/50 flex items-center justify-between gap-2">
                        {!isUserChatBlocked(res) ? (
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
                        ) : (
                          <div />
                        )}

                        {onDeleteResident && (
                          <button
                            id={`btn-delete-resident-${res.id}`}
                            type="button"
                            onClick={() => setResidentToDelete(res)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-[#fff1f2] border border-[#fecdd3] hover:border-[#fda4af] text-[10px] text-[#e11d48] font-semibold transition cursor-pointer ml-auto"
                            title="Удалить садовода из базы данных СНТ"
                          >
                            <Trash2 className="w-3 h-3 text-[#e11d48]" />
                            <span>Удалить садовода</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Resident Confirmation Modal */}
      {residentToDelete && (
        <div
          id="modal-delete-resident-backdrop"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            id="modal-delete-resident-dialog"
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-[#fecdd3] space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#fff1f2] border border-[#fecdd3] flex items-center justify-center shrink-0 text-[#e11d48]">
                <AlertTriangle className="w-5 h-5 text-[#e11d48]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[#9f1239]">
                  Точно хотите удалить садовода?
                </h3>
                <p className="text-xs text-[#2c3e2d] mt-1.5 leading-relaxed">
                  Садовод <strong className="text-[#9f1239]">{residentToDelete.fullName}</strong> (
                  {formatStreetName(residentToDelete.streetNumber)}, уч.{' '}
                  {residentToDelete.plotNumber}) будет удалён из списка жителей и базы данных СНТ.
                </p>
                <p className="text-[11px] text-[#be123c] mt-2 bg-[#fff1f2] p-2 rounded-xl border border-[#fecdd3]">
                  Это действие невозможно отменить. Пользователь потеряет доступ к приложению.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6ebe0]">
              <button
                id="btn-cancel-delete-resident"
                type="button"
                disabled={isDeleting}
                onClick={() => setResidentToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#dce3d5] text-xs font-semibold text-[#5a6b52] hover:bg-[#f4f7f1] transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                id="btn-confirm-delete-resident"
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (onDeleteResident && residentToDelete) {
                    setIsDeleting(true);
                    try {
                      await onDeleteResident(residentToDelete.id);
                    } finally {
                      setIsDeleting(false);
                      setResidentToDelete(null);
                    }
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>{isDeleting ? 'Удаление...' : 'Да, удалить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
