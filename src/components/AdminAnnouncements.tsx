import React, { useState, useEffect } from 'react';
import {
  Bell,
  Pin,
  AlertTriangle,
  Info,
  CheckCircle2,
  PlusCircle,
  Vote,
  Search,
  Calendar,
  Building,
  UserCheck,
  Trash2,
  Pencil,
  X,
  Users,
  Clock,
  Send,
} from 'lucide-react';
import { Announcement, User, AppBlockConfig } from '../types';
import { formatStreetName } from '../utils/streets';
import {
  isAnnouncementScheduled,
  isAnnouncementPublished,
  formatScheduledDateTime,
  getScheduledRemainingText,
  toDateTimeLocalValue,
} from '../utils/announcements';

interface AdminAnnouncementsProps {
  currentUser: User;
  announcements: Announcement[];
  residents?: User[];
  blocks?: AppBlockConfig[];
  highlightedAnnouncementId?: string | null;
  onVotePoll: (announcementId: string, optionId: string) => void;
  onConfirmRead: (announcementId: string) => void;
  onCreateAnnouncement: (newAnn: Omit<Announcement, 'id' | 'date' | 'confirmedBy'>) => void;
  onEditAnnouncement?: (updatedAnn: Announcement) => void;
  onDeleteAnnouncement?: (id: string) => void;
  onClearAllAnnouncements?: () => void;
  onToggleBannerPin?: (id: string) => void;
  onEnableAdmin: () => void;
}

const CATEGORY_LABELS: Record<Announcement['category'], { label: string; color: string }> = {
  meeting: { label: 'Общее собрание', color: 'bg-[#e9eddf] text-[#2d4a22] border-[#dce3d5]' },
  electricity: { label: 'Электроэнергия', color: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]' },
  water: { label: 'Водоснабжение', color: 'bg-[#f4f7f1] text-[#2d4a22] border-[#dce3d5]' },
  fees: { label: 'Взносы и смета', color: 'bg-[#e9eddf] text-[#5c4033] border-[#dce3d5]' },
  security: { label: 'Безопасность', color: 'bg-[#fff1f2] text-[#9f1239] border-[#fecdd3]' },
  roads: { label: 'Дороги и дренаж', color: 'bg-[#f4f7f1] text-[#5a6b52] border-[#dce3d5]' },
};

const formatMembersCount = (count: number): string => {
  const rem10 = count % 10;
  const rem100 = count % 100;
  if (rem100 >= 11 && rem100 <= 19) return 'членов';
  if (rem10 === 1) return 'член';
  if (rem10 >= 2 && rem10 <= 4) return 'члена';
  return 'членов';
};

export const AdminAnnouncements: React.FC<AdminAnnouncementsProps> = ({
  currentUser,
  announcements,
  residents = [],
  blocks = [],
  highlightedAnnouncementId = null,
  onVotePoll,
  onConfirmRead,
  onCreateAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onClearAllAnnouncements,
  onToggleBannerPin,
  onEnableAdmin,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const topAnnouncementsBlocks = blocks.filter(
    (b) => b.enabled && b.section === 'announcements_top'
  );

  // Periodic ticker to re-evaluate scheduled publication status
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Filter for board: all, published, scheduled
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled'>('all');

  // Form State for Creating
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorRole, setAuthorRole] = useState('Правление СНТ «Междуречье»');
  const [category, setCategory] = useState<Announcement['category']>('meeting');
  const [priority, setPriority] = useState<Announcement['priority']>('important');
  const [isPinned, setIsPinned] = useState(false);
  const [isBannerPinned, setIsBannerPinned] = useState(true);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['За', 'Против', 'Воздержался']);

  // Form State for Editing an Announcement
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editAuthorRole, setEditAuthorRole] = useState('Правление СНТ «Междуречье»');
  const [editCategory, setEditCategory] = useState<Announcement['category']>('meeting');
  const [editPriority, setEditPriority] = useState<Announcement['priority']>('important');
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editIsBannerPinned, setEditIsBannerPinned] = useState(true);
  const [editIsScheduled, setEditIsScheduled] = useState(false);
  const [editScheduledDateTime, setEditScheduledDateTime] = useState('');
  const [editHasPoll, setEditHasPoll] = useState(false);
  const [editPollQuestion, setEditPollQuestion] = useState('');
  const [editPollOptions, setEditPollOptions] = useState<string[]>(['За', 'Против', 'Воздержался']);

  // State for Viewing Confirmed Residents Modal
  const [viewingConfirmedAnnouncement, setViewingConfirmedAnnouncement] = useState<Announcement | null>(null);
  const [isConfirmedModalOpen, setIsConfirmedModalOpen] = useState(false);

  const applyScheduledPreset = (forEdit: boolean, hoursOffset: number, targetHour?: number) => {
    const d = new Date();
    if (targetHour !== undefined) {
      d.setDate(d.getDate() + (hoursOffset || 1));
      d.setHours(targetHour, 0, 0, 0);
    } else {
      d.setTime(d.getTime() + hoursOffset * 3600 * 1000);
    }
    const val = toDateTimeLocalValue(d);
    if (forEdit) {
      setEditIsScheduled(true);
      setEditScheduledDateTime(val);
    } else {
      setIsScheduled(true);
      setScheduledDateTime(val);
    }
  };

  const applySaturdayPreset = (forEdit: boolean) => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSaturday);
    d.setHours(10, 0, 0, 0);
    const val = toDateTimeLocalValue(d);
    if (forEdit) {
      setEditIsScheduled(true);
      setEditScheduledDateTime(val);
    } else {
      setIsScheduled(true);
      setScheduledDateTime(val);
    }
  };

  const handlePublishNow = (ann: Announcement) => {
    if (onEditAnnouncement) {
      onEditAnnouncement({
        ...ann,
        scheduledAt: undefined,
        date: new Date().toISOString(),
      });
    }
  };

  const handleStartEdit = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setEditTitle(ann.title);
    setEditContent(ann.content);
    setEditAuthorRole(ann.authorRole || 'Правление СНТ «Междуречье»');
    setEditCategory(ann.category || 'meeting');
    setEditPriority(ann.priority || 'important');
    setEditIsPinned(Boolean(ann.isPinned));
    setEditIsBannerPinned(Boolean(ann.isBannerPinned));
    setEditIsScheduled(Boolean(ann.scheduledAt && isAnnouncementScheduled(ann, currentTimeMs)));
    setEditScheduledDateTime(ann.scheduledAt ? toDateTimeLocalValue(ann.scheduledAt) : '');
    setEditHasPoll(Boolean(ann.poll));
    setEditPollQuestion(ann.poll?.question || '');
    setEditPollOptions(
      ann.poll?.options && ann.poll.options.length > 0
        ? ann.poll.options.map((o) => o.text)
        : ['За', 'Против', 'Воздержался']
    );
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editTitle.trim() || !editContent.trim()) return;

    let finalScheduledAt: string | undefined = undefined;
    if (editIsScheduled && editScheduledDateTime) {
      const parsed = new Date(editScheduledDateTime);
      if (!isNaN(parsed.getTime())) {
        finalScheduledAt = parsed.toISOString();
      }
    }

    const updated: Announcement = {
      ...editingAnnouncement,
      title: editTitle.trim(),
      content: editContent.trim(),
      authorRole: editAuthorRole.trim(),
      category: editCategory,
      priority: editPriority,
      isPinned: editIsPinned,
      isBannerPinned: editIsBannerPinned,
      scheduledAt: finalScheduledAt,
      poll:
        editHasPoll && editPollQuestion.trim()
          ? {
              question: editPollQuestion.trim(),
              options: editPollOptions
                .filter((opt) => opt.trim().length > 0)
                .map((opt, idx) => {
                  const existingOpt = editingAnnouncement.poll?.options[idx];
                  return {
                    id: existingOpt?.id || `opt-${Date.now()}-${idx}`,
                    text: opt.trim(),
                    votes: existingOpt ? existingOpt.votes : [],
                  };
                }),
            }
          : undefined,
    };

    if (onEditAnnouncement) {
      onEditAnnouncement(updated);
    }

    setIsEditModalOpen(false);
    setEditingAnnouncement(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    let finalScheduledAt: string | undefined = undefined;
    if (isScheduled && scheduledDateTime) {
      const parsed = new Date(scheduledDateTime);
      if (!isNaN(parsed.getTime())) {
        finalScheduledAt = parsed.toISOString();
      }
    }

    onCreateAnnouncement({
      title: title.trim(),
      content: content.trim(),
      authorRole: authorRole.trim(),
      authorName: currentUser.fullName,
      category,
      priority,
      isPinned,
      isBannerPinned,
      scheduledAt: finalScheduledAt,
      poll: hasPoll && pollQuestion.trim()
        ? {
            question: pollQuestion.trim(),
            options: pollOptions
              .filter((opt) => opt.trim().length > 0)
              .map((opt, idx) => ({
                id: `opt-${Date.now()}-${idx}`,
                text: opt.trim(),
                votes: [],
              })),
          }
        : undefined,
    });

    // Reset form
    setTitle('');
    setContent('');
    setIsCreateModalOpen(false);
    setHasPoll(false);
    setPollQuestion('');
    setIsPinned(false);
    setIsBannerPinned(true);
    setIsScheduled(false);
    setScheduledDateTime('');
  };

  // Check if current user is Chairman or Admin
  const canManage =
    currentUser.role === 'admin' ||
    currentUser.role === 'chairman' ||
    currentUser.isAdmin ||
    currentUser.isChairman;

  const canViewConfirmedList = canManage;

  const publishedCount = announcements.filter((a) => isAnnouncementPublished(a, currentTimeMs)).length;
  const scheduledCount = announcements.filter((a) => isAnnouncementScheduled(a, currentTimeMs)).length;

  // Filter & sort
  const filtered = announcements
    .filter((a) => {
      // If user is a regular gardener, only show published announcements!
      if (!canManage && !isAnnouncementPublished(a, currentTimeMs)) {
        return false;
      }
      // For board: filter by tab (all, published, scheduled)
      if (canManage) {
        if (statusFilter === 'published' && isAnnouncementScheduled(a, currentTimeMs)) return false;
        if (statusFilter === 'scheduled' && !isAnnouncementScheduled(a, currentTimeMs)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned first, then by date descending
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : new Date(a.date).getTime();
      const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : new Date(b.date).getTime();
      return dateB - dateA;
    });

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 text-[#2c3e2d]">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-[#e6ebe0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8ba888] text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-[#5c4033] uppercase tracking-wider flex items-center gap-2">
              <span>Информационный блок правления</span>
            </h1>
            <p className="text-xs text-[#5a6b52]">
              Официальные распоряжения, аварийные оповещения и голосования СНТ «Междуречье»
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(currentUser.role === 'chairman' || currentUser.role === 'admin' || currentUser.isAdmin) ? (
            <>
              {onClearAllAnnouncements && announcements.length > 0 && (
                <button
                  id="btn-clear-all-announcements"
                  type="button"
                  onClick={() => {
                    if (window.confirm('Вы уверены, что хотите удалить ВСЕ объявления? Это действие безвозвратно удалит их из базы данных.')) {
                      onClearAllAnnouncements();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#fff1f2] text-[#be123c] border border-[#fecdd3] hover:border-[#fda4af] text-xs font-semibold shadow-xs transition cursor-pointer"
                  title="Удалить все объявления"
                >
                  <Trash2 className="w-4 h-4 text-[#e11d48]" />
                  <span className="hidden sm:inline">Очистить все</span>
                </button>
              )}
              <button
                id="btn-open-create-announcement"
                onClick={() => {
                  setIsBannerPinned(true);
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#a2d1a2]" />
                <span>Создать объявление</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f4f7f1] border border-[#dce3d5] text-[#5a6b52] text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#8ba888]" />
              <span>Только просмотр и опросы</span>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Info Blocks for Announcements */}
      {topAnnouncementsBlocks.length > 0 && (
        <div className="space-y-2">
          {topAnnouncementsBlocks.map((blk) => {
            const isAmber = blk.accentColor === 'amber';
            const isSky = blk.accentColor === 'sky';
            const isRose = blk.accentColor === 'rose';

            let bg = 'bg-[#f4f7f1] border-[#dce3d5] text-[#2c3e2d]';
            let badgeBg = 'bg-[#e9eddf] text-[#2d4a22] border-[#dce3d5]';
            let iconColor = 'text-[#2d4a22]';

            if (isAmber) {
              bg = 'bg-[#fffbeb] border-[#fde68a] text-[#78350f]';
              badgeBg = 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
              iconColor = 'text-[#b45309]';
            } else if (isRose) {
              bg = 'bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]';
              badgeBg = 'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]';
              iconColor = 'text-[#e11d48]';
            } else if (isSky) {
              bg = 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]';
              badgeBg = 'bg-[#e0f2fe] text-[#0284c7] border-[#bae6fd]';
              iconColor = 'text-[#0284c7]';
            }

            return (
              <div
                key={blk.id}
                className={`p-3.5 rounded-2xl border ${bg} shadow-2xs text-xs space-y-1`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Pin className={`w-4 h-4 ${iconColor} shrink-0`} />
                    <span className="font-bold text-sm">{blk.title}</span>
                  </div>
                  {blk.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${badgeBg}`}>
                      {blk.badge}
                    </span>
                  )}
                </div>
                <p className="opacity-90 leading-relaxed pl-6">{blk.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter and Search Bar Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {canManage ? (
          <div className="flex items-center gap-1.5 p-1 bg-[#f0f4ec] rounded-2xl border border-[#dce3d5] text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white text-[#2d4a22] shadow-2xs font-bold'
                  : 'text-[#5a6b52] hover:text-[#2d4a22]'
              }`}
            >
              Все ({announcements.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'published'
                  ? 'bg-white text-[#2d4a22] shadow-2xs font-bold'
                  : 'text-[#5a6b52] hover:text-[#2d4a22]'
              }`}
            >
              Опубликованные ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('scheduled')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'scheduled'
                  ? 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a] shadow-2xs font-bold'
                  : 'text-[#5a6b52] hover:text-[#92400e]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Отложенные ({scheduledCount})</span>
              {scheduledCount > 0 && statusFilter !== 'scheduled' && (
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
              )}
            </button>
          </div>
        ) : (
          <div />
        )}

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#7a8c71] absolute left-3 top-2.5" />
          <input
            id="input-announcement-search"
            type="text"
            placeholder="Поиск объявлений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] placeholder-[#7a8c71]/70 focus:outline-none focus:border-[#8ba888]"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3.5">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-[#e6ebe0] text-center text-[#7a8c71]">
            <Bell className="w-8 h-8 mx-auto text-[#8ba888]/60 mb-2" />
            <p className="text-xs font-bold text-[#5c4033] uppercase tracking-wider">Объявлений по заданному фильтру не найдено</p>
          </div>
        ) : (
          filtered.map((ann) => {
            const isConfirmed = ann.confirmedBy?.includes(currentUser.id);
            const confirmedCount = ann.confirmedBy?.length || 0;
            const categoryDef = CATEGORY_LABELS[ann.category] || CATEGORY_LABELS.meeting;
            const isImportantOrUrgent = ann.priority === 'urgent' || ann.priority === 'important';
            const isScheduled = isAnnouncementScheduled(ann, currentTimeMs);

            const isHighlighted = highlightedAnnouncementId === ann.id;

            return (
              <div
                key={ann.id}
                id={`announcement-${ann.id}`}
                className={`rounded-2xl sm:rounded-3xl transition-all duration-500 shadow-sm overflow-hidden ${
                  isHighlighted ? 'ring-4 ring-[#2d4a22] scale-[1.01] shadow-md' : ''
                } ${
                  isScheduled
                    ? 'bg-[#fffdf5] border-2 border-[#fde68a]'
                    : isImportantOrUrgent
                    ? 'bg-[#fffbeb] border border-[#fef3c7]'
                    : 'bg-white border border-[#e6ebe0]'
                }`}
              >
                {/* Announcement Card Header */}
                <div
                  className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 ${
                    isScheduled
                      ? 'border-[#fde68a]'
                      : isImportantOrUrgent
                      ? 'border-[#fef3c7]'
                      : 'border-[#f0f2ec]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {isScheduled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#fffbeb] text-[#92400e] font-bold text-[10px] border border-[#fde68a] shadow-2xs">
                          <Clock className="w-3 h-3 text-[#d97706]" />
                          <span>Отложено: {formatScheduledDateTime(ann.scheduledAt!)}</span>
                        </span>
                      )}

                      {ann.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#e9eddf] text-[#2d4a22] font-semibold border border-[#dce3d5]">
                          <Pin className="w-3 h-3 text-[#2d4a22]" />
                          Закреплено
                        </span>
                      )}

                      {ann.isBannerPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2d4a22] text-white font-bold text-[10px] shadow-2xs">
                          <Pin className="w-3 h-3 text-[#a2d1a2]" />
                          В шапке (все вкладки)
                        </span>
                      )}

                      {ann.priority === 'urgent' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] font-bold text-[10px] uppercase border border-[#fde68a]">
                          <AlertTriangle className="w-3 h-3 text-[#92400e]" />
                          Срочно
                        </span>
                      )}

                      {ann.priority === 'important' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] font-bold text-[10px] uppercase border border-[#fde68a]">
                          <Info className="w-3 h-3 text-[#92400e]" />
                          Важное
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border font-medium ${categoryDef.color}`}
                      >
                        {categoryDef.label}
                      </span>

                      <span
                        className={`flex items-center gap-1 text-[11px] ${
                          isScheduled
                            ? 'text-[#92400e]'
                            : isImportantOrUrgent
                            ? 'text-[#b45309]'
                            : 'text-[#8ba888]'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {new Date(ann.date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3
                      className={`text-sm sm:text-base font-bold leading-snug ${
                        isScheduled
                          ? 'text-[#78350f]'
                          : isImportantOrUrgent
                          ? 'text-[#92400e]'
                          : 'text-[#2d4a22]'
                      }`}
                    >
                      {ann.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canManage && isScheduled && onEditAnnouncement && (
                      <button
                        type="button"
                        onClick={() => handlePublishNow(ann)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] transition text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Опубликовать объявление сейчас для всех жителей"
                      >
                        <Send className="w-3.5 h-3.5 text-[#a2d1a2]" />
                        <span className="hidden sm:inline text-[11px]">Опубликовать сейчас</span>
                      </button>
                    )}

                    {(currentUser.role === 'admin' || currentUser.role === 'chairman' || currentUser.isAdmin) && onToggleBannerPin && (
                      <button
                        type="button"
                        onClick={() => onToggleBannerPin(ann.id)}
                        className={`px-2.5 py-1.5 rounded-xl transition text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                          ann.isBannerPinned
                            ? 'bg-[#2d4a22] text-white hover:bg-[#3a5d2b] shadow-xs'
                            : 'bg-white text-[#5a6b52] hover:text-[#2d4a22] hover:bg-[#f4f7f1] border border-[#dce3d5]'
                        }`}
                        title={ann.isBannerPinned ? 'Открепить от шапки приложения' : 'Закрепить в шапке (будет виден на всех вкладках)'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${ann.isBannerPinned ? 'text-[#a2d1a2]' : 'text-[#7a8c71]'}`} />
                        <span className="hidden sm:inline text-[11px]">
                          {ann.isBannerPinned ? 'В шапке' : 'Закрепить в шапке'}
                        </span>
                      </button>
                    )}

                    {(currentUser.role === 'admin' || currentUser.role === 'chairman' || currentUser.isAdmin) && onEditAnnouncement && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(ann)}
                        className="text-[#7a8c71] hover:text-[#2d4a22] p-1.5 rounded-xl transition cursor-pointer hover:bg-black/5"
                        title="Редактировать объявление"
                        aria-label="Редактировать объявление"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}

                    {(currentUser.role === 'admin' || currentUser.role === 'chairman' || currentUser.isAdmin) && onDeleteAnnouncement && (
                      <button
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        className="text-[#7a8c71] hover:text-[#9f1239] p-1.5 rounded-xl transition cursor-pointer hover:bg-black/5"
                        title="Удалить объявление"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pending Scheduled Announcement Notice Banner */}
                {isScheduled && (
                  <div className="mx-4 sm:mx-5 mt-3 p-3 rounded-2xl bg-[#fffbeb] border border-[#fde68a] text-xs text-[#78350f] flex items-center justify-between gap-3 flex-wrap animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#d97706] shrink-0" />
                      <div>
                        <span>
                          <strong>Отложенная публикация:</strong> объявление станет доступно для садоводов{' '}
                          <strong>{formatScheduledDateTime(ann.scheduledAt!)}</strong>{' '}
                          <span className="text-[#b45309]">({getScheduledRemainingText(ann.scheduledAt!, currentTimeMs)})</span>.
                        </span>
                        <div className="text-[11px] text-[#92400e] mt-0.5">
                          Сейчас объявление видит только правление СНТ.
                        </div>
                      </div>
                    </div>
                    {canManage && onEditAnnouncement && (
                      <button
                        type="button"
                        onClick={() => handlePublishNow(ann)}
                        className="px-3 py-1.5 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] font-semibold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5 text-[#a2d1a2]" />
                        <span>Опубликовать сейчас</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Announcement Content */}
                <div
                  className={`p-4 sm:p-5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    isImportantOrUrgent ? 'text-[#92400e]' : 'text-[#5a6b52]'
                  }`}
                >
                  {ann.content}
                </div>

                {/* Optional Voting Poll */}
                {ann.poll && (
                  <div className="mx-4 sm:mx-5 mb-4 p-3.5 rounded-2xl bg-[#f4f7f1] border border-[#dce3d5] space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#5c4033] uppercase tracking-wider">
                      <Vote className="w-4 h-4 text-[#2d4a22]" />
                      <span>{ann.poll.question}</span>
                    </div>

                    {/* Poll Options */}
                    <div className="space-y-2">
                      {ann.poll.options.map((opt) => {
                        const totalVotes = ann.poll!.options.reduce(
                          (acc, o) => acc + o.votes.length,
                          0
                        );
                        const hasUserVoted = opt.votes.includes(currentUser.id);
                        const pct =
                          totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;

                        return (
                          <div key={opt.id} className="relative">
                            <button
                              onClick={() => onVotePoll(ann.id, opt.id)}
                              className={`w-full text-left p-2.5 rounded-xl text-xs border transition relative overflow-hidden flex items-center justify-between z-10 ${
                                hasUserVoted
                                  ? 'border-[#2d4a22] bg-[#e9eddf]/60 font-bold text-[#2d4a22]'
                                  : 'border-[#dce3d5] bg-white hover:bg-[#f4f7f1] text-[#2c3e2d]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    hasUserVoted
                                      ? 'border-[#2d4a22] bg-[#2d4a22] text-white'
                                      : 'border-[#8ba888]'
                                  }`}
                                >
                                  {hasUserVoted && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <span>{opt.text}</span>
                              </div>
                              <div className="text-[11px] text-[#5a6b52] font-mono">
                                {opt.votes.length} голосов ({pct}%)
                              </div>
                            </button>
                            {/* Progress bar fill */}
                            <div
                              className="absolute left-0 top-0 bottom-0 bg-[#8ba888]/30 rounded-xl transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer / Author signature and Acknowledgment */}
                <div
                  className={`px-4 sm:px-5 py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                    isImportantOrUrgent
                      ? 'bg-[#fefce8] border-[#fef3c7] text-[#92400e]'
                      : 'bg-[#fcfdfa] border-[#f0f2ec] text-[#5a6b52]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-[#2d4a22]" />
                    <span className="font-semibold text-[#2c3e2d]">{ann.authorRole}</span>
                    {ann.authorName && (
                      <span className="text-[#7a8c71] font-normal">({ann.authorName})</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {canViewConfirmedList ? (
                      <button
                        type="button"
                        onClick={() => {
                          setViewingConfirmedAnnouncement(ann);
                          setIsConfirmedModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-[#5a6b52] hover:text-[#2d4a22] bg-[#f4f7f1] hover:bg-[#e9eddf] border border-[#dce3d5] hover:border-[#8ba888] transition cursor-pointer group shadow-2xs"
                        title="Посмотреть список садоводов (доступно председателю и администратору)"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#2d4a22] group-hover:scale-110 transition-transform" />
                        <span className="font-medium underline decoration-dotted underline-offset-2">
                          Ознакомились: {confirmedCount} {formatMembersCount(confirmedCount)}
                        </span>
                      </button>
                    ) : (
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-[#5a6b52] bg-[#f4f7f1] border border-[#dce3d5] select-none"
                        title="Количество подтвердивших прочтение садоводов"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-[#7a8c71]" />
                        <span className="font-medium">
                          Ознакомились: {confirmedCount} {formatMembersCount(confirmedCount)}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => onConfirmRead(ann.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        isConfirmed
                          ? 'bg-[#e9eddf] text-[#2d4a22] border border-[#8ba888]'
                          : 'bg-white border border-[#2d4a22] text-[#2d4a22] hover:bg-[#f4f7f1]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2d4a22]" />
                      <span>{isConfirmed ? 'Ознакомлен' : 'Подтвердить прочтение'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Creating an Official Announcement */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-[#e6ebe0] text-[#2c3e2d] my-8">
            <div className="flex items-center justify-between border-b border-[#f0f2ec] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2d4a22] text-white flex items-center justify-center">
                  <Bell className="w-4 h-4 text-[#a2d1a2]" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-[#5c4033] uppercase tracking-wider">
                  Новое официальное объявление
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#7a8c71] hover:text-[#2c3e2d] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Заголовок объявления <span className="text-[#9f1239]">*</span>
                </label>
                <input
                  id="input-create-announcement-title"
                  type="text"
                  required
                  placeholder="Напр.: Срочное отключение водопровода для ремонта"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5c4033] mb-1">Категория</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Announcement['category'])}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white focus:outline-none focus:border-[#8ba888]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([catKey, catVal]) => (
                      <option key={catKey} value={catKey}>
                        {catVal.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#5c4033] mb-1">Важность</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Announcement['priority'])}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white focus:outline-none focus:border-[#8ba888]"
                  >
                    <option value="urgent">Срочно (Красный статус)</option>
                    <option value="important">Важно (Желтый статус)</option>
                    <option value="info">Информационное (Обычный)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Текст объявления <span className="text-[#9f1239]">*</span>
                </label>
                <textarea
                  id="textarea-create-announcement-content"
                  rows={4}
                  required
                  placeholder="Подробный текст сообщения для жителей СНТ Междуречье..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888] resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">Подпись</label>
                <input
                  type="text"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                  placeholder="Правление СНТ «Междуречье»"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dce3d5]"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded text-[#2d4a22] focus:ring-[#8ba888]"
                    />
                    <span className="font-semibold text-[#2c3e2d]">Закрепить вверху списка</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="checkbox-create-announcement-banner-pin"
                      checked={isBannerPinned}
                      onChange={(e) => setIsBannerPinned(e.target.checked)}
                      className="rounded text-[#92400e] focus:ring-[#f59e0b]"
                    />
                    <span className="font-bold text-[#92400e] flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 text-[#d97706]" />
                      Закрепить в шапке (виден на всех вкладках)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasPoll}
                      onChange={(e) => setHasPoll(e.target.checked)}
                      className="rounded text-[#2d4a22] focus:ring-[#8ba888]"
                    />
                    <span className="font-semibold text-[#2c3e2d]">Прикрепить голосование</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="checkbox-create-announcement-scheduled"
                      checked={isScheduled}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIsScheduled(val);
                        if (val && !scheduledDateTime) {
                          applyScheduledPreset(false, 1);
                        }
                      }}
                      className="rounded text-[#92400e] focus:ring-[#f59e0b]"
                    />
                    <span className="font-bold text-[#92400e] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#d97706]" />
                      Отложенная публикация (дата и время)
                    </span>
                  </label>
                </div>

                {isScheduled && (
                  <div className="p-3.5 rounded-2xl bg-[#fffdf5] border border-[#fde68a] space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block font-bold text-xs text-[#78350f] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#d97706]" />
                        <span>Дата и время публикации</span>
                      </label>
                      <span className="text-[10px] text-[#92400e] font-semibold bg-[#fef3c7] px-2 py-0.5 rounded-md border border-[#fde68a]">
                        Автопубликация
                      </span>
                    </div>

                    <input
                      id="input-create-announcement-scheduled-at"
                      type="datetime-local"
                      min={toDateTimeLocalValue(new Date())}
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                      required={isScheduled}
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-[#78350f] font-medium mr-1">Быстрый выбор:</span>
                      <button
                        type="button"
                        onClick={() => applyScheduledPreset(false, 1)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        +1 час
                      </button>
                      <button
                        type="button"
                        onClick={() => applyScheduledPreset(false, 3)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        +3 часа
                      </button>
                      <button
                        type="button"
                        onClick={() => applyScheduledPreset(false, 1, 9)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        Завтра в 09:00
                      </button>
                      <button
                        type="button"
                        onClick={() => applyScheduledPreset(false, 1, 18)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        Завтра в 18:00
                      </button>
                      <button
                        type="button"
                        onClick={() => applySaturdayPreset(false)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        В субботу в 10:00
                      </button>
                    </div>

                    {scheduledDateTime && (
                      <div className="text-[11px] text-[#78350f] bg-white/80 rounded-xl p-2.5 border border-[#fde68a]/60 leading-snug">
                        🔔 Объявление автоматически станет доступно садоводам{' '}
                        <strong>{formatScheduledDateTime(scheduledDateTime)}</strong>{' '}
                        <span className="text-[#b45309]">({getScheduledRemainingText(scheduledDateTime, currentTimeMs)})</span>.
                        До этого момента объявление будет видно только правлению во вкладке «Отложенные».
                      </div>
                    )}
                  </div>
                )}

                {isBannerPinned && (
                  <div className="flex items-start gap-2 text-[11px] text-[#78350f] bg-[#fffbeb] border border-[#fde68a] rounded-xl p-2.5 leading-snug animate-fadeIn">
                    <Pin className="w-3.5 h-3.5 text-[#d97706] shrink-0 mt-0.5" />
                    <span>
                      Заголовок этого объявления будет закреплен в верхней плашке под шапкой и станет <strong>виден на любой вкладке</strong> (Чат, Инфо-стенд, Жители, Админка и др.). Садоводы смогут нажать на него и мгновенно перейти к тексту этого объявления.
                    </span>
                  </div>
                )}
              </div>

              {hasPoll && (
                <div className="p-3 rounded-xl bg-[#f4f7f1] border border-[#dce3d5] space-y-2">
                  <label className="block font-semibold text-[#5c4033]">
                    Вопрос для голосования жителей
                  </label>
                  <input
                    type="text"
                    placeholder="Напр.: Согласны ли вы на замену ворот на автоматические?"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f2ec]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#7a8c71] hover:bg-[#f4f7f1] font-medium"
                >
                  Отмена
                </button>
                <button
                  id="btn-submit-create-announcement"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] text-white font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  {isScheduled ? (
                    <>
                      <Clock className="w-4 h-4 text-[#a2d1a2]" />
                      <span>Запланировать публикацию</span>
                    </>
                  ) : (
                    <span>Опубликовать для СНТ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Editing an Official Announcement */}
      {isEditModalOpen && editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl border border-[#e6ebe0] shadow-2xl p-5 sm:p-6 my-8 text-[#2c3e2d] animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#f0f2ec] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#e9eddf] text-[#2d4a22] flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-[#2d4a22]" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-[#5c4033] uppercase tracking-wider">
                  Редактировать объявление
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingAnnouncement(null);
                }}
                className="text-[#7a8c71] hover:text-[#2c3e2d] p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Заголовок объявления <span className="text-[#9f1239]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#5c4033] mb-1">Категория</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as Announcement['category'])}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white focus:outline-none focus:border-[#8ba888]"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([catKey, catVal]) => (
                      <option key={catKey} value={catKey}>
                        {catVal.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#5c4033] mb-1">Важность</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Announcement['priority'])}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white focus:outline-none focus:border-[#8ba888]"
                  >
                    <option value="urgent">Срочно (Красный статус)</option>
                    <option value="important">Важно (Желтый статус)</option>
                    <option value="info">Информационное (Обычный)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Текст объявления <span className="text-[#9f1239]">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888] resize-y leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">Подпись</label>
                <input
                  type="text"
                  value={editAuthorRole}
                  onChange={(e) => setEditAuthorRole(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888]"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsPinned}
                      onChange={(e) => setEditIsPinned(e.target.checked)}
                      className="rounded text-[#2d4a22] focus:ring-[#8ba888]"
                    />
                    <span className="font-semibold text-[#2c3e2d]">Закрепить вверху списка</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsBannerPinned}
                      onChange={(e) => setEditIsBannerPinned(e.target.checked)}
                      className="rounded text-[#92400e] focus:ring-[#f59e0b]"
                    />
                    <span className="font-bold text-[#92400e] flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 text-[#d97706]" />
                      Закрепить в шапке (виден на всех вкладках)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editHasPoll}
                      onChange={(e) => setEditHasPoll(e.target.checked)}
                      className="rounded text-[#2d4a22] focus:ring-[#8ba888]"
                    />
                    <span className="font-semibold text-[#2c3e2d]">Голосование жителей</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="checkbox-edit-announcement-scheduled"
                      checked={editIsScheduled}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEditIsScheduled(val);
                        if (val && !editScheduledDateTime) {
                          applyScheduledPreset(true, 1);
                        }
                      }}
                      className="rounded text-[#92400e] focus:ring-[#f59e0b]"
                    />
                    <span className="font-bold text-[#92400e] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#d97706]" />
                      Отложенная публикация (дата и время)
                    </span>
                  </label>
                </div>

                {editIsScheduled && (
                  <div className="p-3.5 rounded-2xl bg-[#fffdf5] border border-[#fde68a] space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block font-bold text-xs text-[#78350f] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#d97706]" />
                        <span>Дата и время публикации</span>
                      </label>
                      <span className="text-[10px] text-[#92400e] font-semibold bg-[#fef3c7] px-2 py-0.5 rounded-md border border-[#fde68a]">
                        Автопубликация
                      </span>
                    </div>

                    <input
                      id="input-edit-announcement-scheduled-at"
                      type="datetime-local"
                      min={toDateTimeLocalValue(new Date())}
                      value={editScheduledDateTime}
                      onChange={(e) => setEditScheduledDateTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                      required={editIsScheduled}
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-[#78350f] font-medium mr-1">Быстрый выбор:</span>
                      <button
                        type="button"
                        onClick={() => applyScheduledPreset(true, 1)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        +1 час
                      </button>
                      <button
                        type="button"
                        onClick={() => applyScheduledPreset(true, 3)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        +3 часа
                      </button>
                      <button
                        type="button"
                        onClick={() => applyScheduledPreset(true, 1, 9)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        Завтра в 09:00
                      </button>
                      <button
                        type="button"
                        onClick={() => applyScheduledPreset(true, 1, 18)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        Завтра в 18:00
                      </button>
                      <button
                        type="button"
                        onClick={() => applySaturdayPreset(true)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-[#78350f] text-[11px] font-medium transition cursor-pointer"
                      >
                        В субботу в 10:00
                      </button>
                    </div>

                    {editScheduledDateTime && (
                      <div className="text-[11px] text-[#78350f] bg-white/80 rounded-xl p-2.5 border border-[#fde68a]/60 leading-snug">
                        🔔 Объявление автоматически станет доступно садоводам{' '}
                        <strong>{formatScheduledDateTime(editScheduledDateTime)}</strong>{' '}
                        <span className="text-[#b45309]">({getScheduledRemainingText(editScheduledDateTime, currentTimeMs)})</span>.
                      </div>
                    )}
                  </div>
                )}

                {editIsBannerPinned && (
                  <div className="flex items-start gap-2 text-[11px] text-[#78350f] bg-[#fffbeb] border border-[#fde68a] rounded-xl p-2.5 leading-snug">
                    <Pin className="w-3.5 h-3.5 text-[#d97706] shrink-0 mt-0.5" />
                    <span>
                      Заголовок объявления будет закреплен в верхней плашке шапки и <strong>виден на всех вкладках</strong> приложения.
                    </span>
                  </div>
                )}
              </div>

              {editHasPoll && (
                <div className="p-3 rounded-xl bg-[#f4f7f1] border border-[#dce3d5] space-y-2">
                  <label className="block font-semibold text-[#5c4033]">
                    Вопрос для голосования жителей
                  </label>
                  <input
                    type="text"
                    value={editPollQuestion}
                    onChange={(e) => setEditPollQuestion(e.target.value)}
                    placeholder="Напр.: Согласны ли вы на благоустройство?"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white focus:outline-none focus:border-[#8ba888]"
                  />
                  <div className="space-y-1.5 pt-1">
                    <label className="block font-semibold text-[#5c4033]">Варианты ответа</label>
                    {editPollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const copy = [...editPollOptions];
                            copy[idx] = e.target.value;
                            setEditPollOptions(copy);
                          }}
                          className="flex-1 px-3 py-1 text-xs rounded-lg border border-[#dce3d5] bg-white focus:outline-none focus:border-[#8ba888]"
                        />
                        {editPollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setEditPollOptions(editPollOptions.filter((_, i) => i !== idx))}
                            className="text-[#9f1239] hover:bg-black/5 p-1 rounded transition"
                            title="Удалить вариант"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditPollOptions([...editPollOptions, ''])}
                      className="text-xs text-[#2d4a22] font-semibold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      + Добавить вариант
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-[#f0f2ec]">
                {editingAnnouncement.scheduledAt && isAnnouncementScheduled(editingAnnouncement, currentTimeMs) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditIsScheduled(false);
                      setEditScheduledDateTime('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#fde68a] text-[#78350f] bg-[#fffdf5] hover:bg-[#fef3c7] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                    title="Снять таймер и сделать объявление общедоступным прямо сейчас"
                  >
                    <Send className="w-3.5 h-3.5 text-[#d97706]" />
                    <span>Снять отсрочку (опубликовать сейчас)</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingAnnouncement(null);
                    }}
                    className="px-4 py-2 rounded-xl text-[#7a8c71] hover:bg-[#f4f7f1] font-medium transition"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] text-white font-semibold shadow-xs transition"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Viewing Confirmed Residents (Chairman & Admin only) */}
      {isConfirmedModalOpen && viewingConfirmedAnnouncement && canViewConfirmedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl border border-[#e6ebe0] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#2c3e2d] animate-fadeIn">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#f0f2ec] bg-[#fcfdfa] flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e9eddf] text-[#2d4a22] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-[#2d4a22]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2c3e2d]">
                    Ознакомились с объявлением
                  </h2>
                  <p className="text-xs text-[#5a6b52] line-clamp-1 font-medium mt-0.5 max-w-sm">
                    «{viewingConfirmedAnnouncement.title}»
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmedModalOpen(false);
                  setViewingConfirmedAnnouncement(null);
                }}
                className="p-1.5 rounded-xl text-[#7a8c71] hover:text-[#2c3e2d] hover:bg-[#f4f7f1] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total count banner */}
            <div className="px-5 py-2.5 bg-[#f4f7f1] border-b border-[#e6ebe0] flex items-center justify-between text-xs text-[#5a6b52]">
              <span className="font-medium">
                Всего подтвердили: <strong className="text-[#2d4a22] font-bold">{(viewingConfirmedAnnouncement.confirmedBy || []).length}</strong> {formatMembersCount((viewingConfirmedAnnouncement.confirmedBy || []).length)}
              </span>
              {residents.length > 0 && (
                <span className="text-[11px] text-[#7a8c71]">
                  (из {residents.length} зарегистрированных садоводов)
                </span>
              )}
            </div>

            {/* Confirmed Residents List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-[#f0f2ec]">
              {(!viewingConfirmedAnnouncement.confirmedBy || viewingConfirmedAnnouncement.confirmedBy.length === 0) ? (
                <div className="text-center py-8 space-y-2">
                  <UserCheck className="w-10 h-10 mx-auto text-[#8ba888]/40" />
                  <p className="text-sm font-semibold text-[#2c3e2d]">
                    Пока никто не подтвердил прочтение
                  </p>
                  <p className="text-xs text-[#7a8c71] max-w-xs mx-auto">
                    Жители СНТ могут нажать кнопку «Подтвердить прочтение» в карточке объявления, чтобы отметиться в этом списке.
                  </p>
                </div>
              ) : (
                viewingConfirmedAnnouncement.confirmedBy.map((userId) => {
                  const res = residents.find((r) => r.id === userId);
                  const isCurrent = currentUser?.id === userId;
                  const name = res?.fullName || (isCurrent ? currentUser.fullName : `Садовод (${userId.slice(0, 8)})`);
                  const street = res?.streetNumber ? formatStreetName(res.streetNumber) : (isCurrent && currentUser.streetNumber ? formatStreetName(currentUser.streetNumber) : null);
                  const plot = res?.plotNumber || (isCurrent ? currentUser.plotNumber : null);
                  const isChairman = res?.isChairman || res?.role === 'chairman' || (isCurrent && (currentUser.isChairman || currentUser.role === 'chairman'));
                  const isAdmin = res?.isAdmin || res?.role === 'admin' || (isCurrent && (currentUser.isAdmin || currentUser.role === 'admin'));
                  const avatarColor = res?.avatarColor || 'bg-[#2d4a22]';

                  return (
                    <div key={userId} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full ${avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-[#2c3e2d] truncate">
                              {name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#e9eddf] text-[#2d4a22] font-medium">
                                Вы
                              </span>
                            )}
                            {isChairman && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#fef3c7] text-[#92400e] font-semibold">
                                Председатель
                              </span>
                            )}
                            {isAdmin && !isChairman && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#e0f2fe] text-[#0369a1] font-semibold">
                                Админ
                              </span>
                            )}
                          </div>
                          {(street || plot) && (
                            <p className="text-[11px] text-[#5a6b52] truncate mt-0.5">
                              {street}{street && plot ? ' • ' : ''}{plot ? `уч. ${plot}` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#2d4a22] bg-[#f4f7f1] px-2.5 py-1 rounded-lg border border-[#dce3d5]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2d4a22]" />
                        <span className="hidden sm:inline">Ознакомлен</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-[#f0f2ec] bg-[#fcfdfa] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmedModalOpen(false);
                  setViewingConfirmedAnnouncement(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
