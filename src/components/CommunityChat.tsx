import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Lock,
  Search,
  Reply,
  Smile,
  X,
  Users,
  Tag,
  MessageSquare,
  Pin,
  Settings,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { ChatMessage, User, AppBlockConfig, ChatTopicConfig } from '../types';
import { DEFAULT_CHAT_TOPICS } from '../utils/appConfig';
import { isUserChatBlocked, getChatBlockDurationText, checkIsAdmin } from '../utils/moderation';
import { ChatTopicsModal } from './ChatTopicsModal';
import { ChatBlockModal } from './ChatBlockModal';

interface CommunityChatProps {
  currentUser: User;
  messages: ChatMessage[];
  residents?: User[];
  blocks?: AppBlockConfig[];
  chatTopics?: ChatTopicConfig[];
  onUpdateChatTopics?: (topics: ChatTopicConfig[]) => void;
  lastVisitTimestamp?: string;
  onSendMessage: (content: string, category?: string, replyTo?: ChatMessage['replyTo']) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onSimulateNeighborMessage?: () => void;
  onUpdateChatBlock?: (
    residentId: string,
    blocked: boolean,
    durationMinutes?: number | null,
    reason?: string
  ) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

interface EmojiCategory {
  title: string;
  emojis: string[];
}

const POPULAR_EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    title: 'Популярные реакции',
    emojis: ['👍', '👎', '❤️', '🔥', '👏', '🤝', '🙏', '👌', '✌️', '💪'],
  },
  {
    title: 'Эмоции и лица',
    emojis: ['😂', '😊', '😍', '🥳', '😎', '🤔', '🤣', '😮', '😢', '😡'],
  },
  {
    title: 'Природа и погода',
    emojis: ['🌱', '🌿', '🌸', '🌻', '🌲', '☀️', '🌧️', '⚡', '💧', '🌈'],
  },
  {
    title: 'Дача и урожай',
    emojis: ['🍎', '🍓', '🥕', '🍅', '🥒', '🥔', '🍇', '☕', '🥩', '🍻'],
  },
  {
    title: 'Дом, техника и знаки',
    emojis: ['🏡', '🛠️', '🚜', '🚗', '💡', '⚠️', '📢', '💯', '⭐', '🫡'],
  },
];

const ALL_POPULAR_EMOJIS = POPULAR_EMOJI_CATEGORIES.flatMap((c) => c.emojis);

const cleanAuthorName = (name: string): string => {
  return name.replace(/\s*\(?(?:Председатель|Админ)\)?/gi, '').trim();
};

export const CommunityChat: React.FC<CommunityChatProps> = ({
  currentUser,
  messages,
  residents = [],
  blocks = [],
  chatTopics,
  onUpdateChatTopics,
  lastVisitTimestamp,
  onSendMessage,
  onAddReaction,
  onSimulateNeighborMessage,
  onUpdateChatBlock,
  onEditMessage,
  onDeleteMessage,
}) => {
  // Only Admin has moderation privileges (blocking users, deleting any message)
  const isUserAdmin = checkIsAdmin(currentUser);
  const isCurrentBlocked = isUserChatBlocked(currentUser);
  const currentRemainingBlockText = getChatBlockDurationText(currentUser);

  // Message edit & delete states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(null);

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const handleSaveEdit = (messageId: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed) return;
    if (onEditMessage) {
      onEditMessage(messageId, trimmed);
    }
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleConfirmDelete = () => {
    if (deletingMessage && onDeleteMessage) {
      onDeleteMessage(deletingMessage.id);
    }
    if (editingMessageId === deletingMessage?.id) {
      setEditingMessageId(null);
      setEditingContent('');
    }
    setDeletingMessage(null);
  };

  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [moderationTargetUser, setModerationTargetUser] = useState<User | null>(null);
  const [showBlockedUsersList, setShowBlockedUsersList] = useState(false);
  const [quickBlockSelectUserId, setQuickBlockSelectUserId] = useState('');
  const [quickBlockError, setQuickBlockError] = useState('');

  const blockedResidents = residents.filter((r) => isUserChatBlocked(r));

  const activeTopics = chatTopics && chatTopics.length > 0 ? chatTopics : DEFAULT_CHAT_TOPICS;
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return (chatTopics && chatTopics.length > 0 ? chatTopics[0].id : DEFAULT_CHAT_TOPICS[0]?.id) || 'general';
  });

  // Per-topic last read timestamps for the current user
  const topicStorageKey = `snt_mezhdurechye_topic_last_read_${currentUser.id}`;
  const [topicLastRead, setTopicLastRead] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(topicStorageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    // On first load, initialize all current topics with current timestamp
    // so historical seed messages don't appear as unread
    const nowIso = new Date().toISOString();
    const initialMap: Record<string, string> = {};
    activeTopics.forEach((t) => {
      initialMap[t.id] = lastVisitTimestamp || nowIso;
    });
    const initialSelected = (chatTopics && chatTopics.length > 0 ? chatTopics[0].id : DEFAULT_CHAT_TOPICS[0]?.id) || 'general';
    initialMap[initialSelected] = nowIso;
    try {
      localStorage.setItem(topicStorageKey, JSON.stringify(initialMap));
    } catch {
      // ignore
    }
    return initialMap;
  });

  // Keep the active topic marked as read
  useEffect(() => {
    if (!selectedCategory) return;
    const nowIso = new Date().toISOString();
    setTopicLastRead((prev) => {
      const updated = {
        ...prev,
        [selectedCategory]: nowIso,
      };
      try {
        localStorage.setItem(topicStorageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, [selectedCategory, messages.length, currentUser.id, topicStorageKey]);

  // Calculate unread messages count for a specific topic
  const getTopicUnreadCount = (topicId: string): number => {
    // Current active topic being viewed: always 0 unread
    if (selectedCategory === topicId) {
      return 0;
    }

    const lastReadIso = topicLastRead[topicId] || lastVisitTimestamp;
    if (!lastReadIso) {
      return 0;
    }

    const lastReadTime = new Date(lastReadIso).getTime();
    if (isNaN(lastReadTime)) {
      return 0;
    }

    return messages.filter((m) => {
      if (m.category !== topicId) return false;
      // Own sent messages are never counted as unread
      if (m.authorId === currentUser.id) return false;

      const msgTime = new Date(m.timestamp).getTime();
      return !isNaN(msgTime) && msgTime > lastReadTime;
    }).length;
  };

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTopics.some((t) => t.id === selectedCategory)) {
      setSelectedCategory(activeTopics[0]?.id || 'general');
    }
  }, [activeTopics, selectedCategory]);

  // Only system administrators can manage chat topics; hidden for chairman and regular members
  const isChairman =
    currentUser.role === 'chairman' ||
    Boolean(currentUser.isChairman) ||
    currentUser.fullName.toLowerCase().includes('председатель');

  const canManageTopics =
    !isChairman && (currentUser.role === 'admin' || Boolean(currentUser.isAdmin));

  const chatTopBlocks = blocks.filter((b) => b.enabled && b.section === 'chat_top');

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    // Topic change: immediately jump to bottom without affecting window scroll
    scrollToBottom('auto');
  }, [selectedCategory]);

  useEffect(() => {
    // New messages: smoothly scroll down inside message container
    scrollToBottom('smooth');
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCurrentBlocked) return;
    if (!inputText.trim()) return;

    const replyAuthor = replyingTo ? cleanAuthorName(replyingTo.authorName) : '';
    const replyData = replyingTo
      ? {
          id: replyingTo.id,
          authorName: replyAuthor,
          content: replyingTo.content.slice(0, 80) + (replyingTo.content.length > 80 ? '...' : ''),
        }
      : undefined;

    const categoryToSend: string = selectedCategory || activeTopics[0]?.id || 'general';

    onSendMessage(inputText.trim(), categoryToSend, replyData);
    setInputText('');
    setReplyingTo(null);
  };

  // Filter messages strictly by Category / Topic and Search Query
  const filteredMessages = messages.filter((msg) => {
    // 1. Topic filter - each topic is a distinct separate channel
    if (msg.category !== selectedCategory) {
      return false;
    }

    // 2. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inContent = msg.content.toLowerCase().includes(q);
      const inAuthor = msg.authorName.toLowerCase().includes(q);
      if (!inContent && !inAuthor) return false;
    }
    return true;
  });

  const activeCategoryDef =
    activeTopics.find((c) => c.id === selectedCategory) || activeTopics[0];
  const activeTopicTitle = activeCategoryDef ? activeCategoryDef.label : 'Тема';

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] max-w-4xl mx-auto bg-white rounded-2xl sm:rounded-3xl border border-[#e6ebe0] shadow-sm overflow-hidden text-[#2c3e2d]">
      {/* Chat Sub-Header / Filters */}
      <div className="bg-[#fcfdfa] px-3 sm:px-5 py-3 border-b border-[#f0f2ec] shrink-0 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#8ba888] text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-xs sm:text-sm font-bold text-[#5c4033] uppercase tracking-wider">
                Общий чат соседей
              </h2>
            </div>
          </div>

          {/* Admin / Chairman Moderation Button */}
          {isUserAdmin && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-chat-moderation-list"
                onClick={() => setShowBlockedUsersList(!showBlockedUsersList)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  blockedResidents.length > 0
                    ? 'bg-[#fff1f2] border-[#fecdd3] text-[#be123c] hover:bg-[#ffe4e6]'
                    : 'bg-[#f4f7f1] border-[#dce3d5] text-[#2d4a22] hover:bg-[#e9eddf]'
                }`}
                title="Управление блокировками участников в чате СНТ"
              >
                <ShieldAlert className="w-4 h-4 text-[#be123c]" />
                <span>Модерация</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    blockedResidents.length > 0
                      ? 'bg-[#be123c] text-white'
                      : 'bg-[#dce3d5] text-[#5a6b52]'
                  }`}
                >
                  {blockedResidents.length}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Admin Moderation Dropdown Panel */}
        {isUserAdmin && showBlockedUsersList && (
          <div className="p-3 bg-white rounded-2xl border border-[#fecdd3] shadow-md space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#edf2e7] pb-2">
              <div className="font-bold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#be123c]" />
                <span>Модерация чата: блокировка нарушителей</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockedUsersList(false)}
                className="text-[#7a8c71] hover:text-[#2c3e2d] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-[#7a8c71]">
              Вы можете заблокировать участника, выбрав его из списка ниже, либо нажав кнопку <span className="font-bold text-[#be123c]">«Заблокировать»</span> прямо под его сообщением в чате.
            </p>

            {/* Quick block selector */}
            <div className="pt-1">
              <div className="flex items-center gap-2">
                <select
                  value={quickBlockSelectUserId}
                  onChange={(e) => {
                    setQuickBlockSelectUserId(e.target.value);
                    setQuickBlockError('');
                  }}
                  className={`flex-1 px-2.5 py-1.5 text-xs rounded-xl border bg-white text-[#2c3e2d] cursor-pointer truncate ${
                    quickBlockError ? 'border-[#be123c] ring-2 ring-[#be123c]/20' : 'border-[#dce3d5]'
                  }`}
                >
                  <option value="">-- Выберите садовода для блокировки --</option>
                  {residents
                    .filter((r) => r.id !== currentUser.id && !isUserChatBlocked(r))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!quickBlockSelectUserId) {
                      setQuickBlockError('Пожалуйста, выберите садовода из выпадающего списка слева');
                      return;
                    }
                    const target = residents.find((r) => r.id === quickBlockSelectUserId);
                    if (target) {
                      setModerationTargetUser(target);
                      setIsModerationModalOpen(true);
                      setQuickBlockSelectUserId('');
                      setQuickBlockError('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#be123c] hover:bg-[#9f1239] text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-2xs"
                >
                  Заблокировать
                </button>
              </div>
              {quickBlockError && (
                <div className="mt-1 text-[11px] text-[#be123c] font-medium">
                  {quickBlockError}
                </div>
              )}
            </div>

            {/* Blocked Users List */}
            {blockedResidents.length > 0 && (
              <div className="pt-2 border-t border-[#edf2e7] space-y-1.5">
                <div className="text-[11px] font-bold text-[#9f1239]">
                  Сейчас заблокированы ({blockedResidents.length}):
                </div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {blockedResidents.map((bRes) => (
                    <div
                      key={bRes.id}
                      className="p-2 rounded-xl bg-[#fff1f2] border border-[#fecdd3] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[#2c3e2d] truncate">
                          {bRes.fullName}
                        </div>
                        <div className="text-[11px] text-[#be123c] font-semibold">
                          Срок: {getChatBlockDurationText(bRes)}
                        </div>
                        {bRes.chatBlockReason && (
                          <div className="text-[10px] text-[#78350f] truncate">
                            Причина: {bRes.chatBlockReason}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setModerationTargetUser(bRes);
                            setIsModerationModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-[#f4f7f1] text-[#2c3e2d] font-semibold text-[11px] border border-[#dce3d5] transition cursor-pointer"
                        >
                          Срок
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateChatBlock && onUpdateChatBlock(bRes.id, false)}
                          className="px-2 py-1 rounded-lg bg-[#2d4a22] hover:bg-[#3a5d2b] text-white font-bold text-[11px] transition cursor-pointer"
                          title="Разблокировать садовода"
                        >
                          Снять бан
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="pt-0.5">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#7a8c71] absolute left-2.5 top-2.5" />
            <input
              id="input-chat-search"
              type="text"
              placeholder="Поиск по чату или автору..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] placeholder-[#7a8c71]/70 focus:outline-none focus:border-[#8ba888] focus:ring-1 focus:ring-[#8ba888]/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[#7a8c71] hover:text-[#2c3e2d]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 bg-[#fdfcf8]"
      >
        {/* Pinned Info Blocks for Chat */}
        {chatTopBlocks.length > 0 && (
          <div className="space-y-2 mb-3">
            {chatTopBlocks.map((blk) => {
              const isAmber = blk.accentColor === 'amber';
              const isSky = blk.accentColor === 'sky';
              const isRose = blk.accentColor === 'rose';

              let bg = 'bg-[#f4f7f1] border-[#dce3d5] text-[#2c3e2d]';
              let badgeBg = 'bg-[#e9eddf] text-[#2d4a22] border-[#dce3d5]';
              let pinColor = 'text-[#2d4a22]';

              if (isAmber) {
                bg = 'bg-[#fffbeb] border-[#fde68a] text-[#78350f]';
                badgeBg = 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
                pinColor = 'text-[#b45309]';
              } else if (isRose) {
                bg = 'bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]';
                badgeBg = 'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]';
                pinColor = 'text-[#e11d48]';
              } else if (isSky) {
                bg = 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]';
                badgeBg = 'bg-[#e0f2fe] text-[#0284c7] border-[#bae6fd]';
                pinColor = 'text-[#0284c7]';
              }

              return (
                <div
                  key={blk.id}
                  className={`p-3 rounded-2xl border ${bg} shadow-2xs text-xs space-y-1`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pin className={`w-3.5 h-3.5 ${pinColor} shrink-0`} />
                      <span className="font-bold text-sm">{blk.title}</span>
                    </div>
                    {blk.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${badgeBg}`}>
                        {blk.badge}
                      </span>
                    )}
                  </div>
                  <p className="opacity-90 leading-relaxed pl-5.5">{blk.content}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Active Topic Filter Sticky Banner */}
        {activeCategoryDef && (
          <div className="sticky top-0 z-10 px-3 py-2 rounded-xl bg-[#f4f7f1] border border-[#8ba888] shadow-xs flex items-center justify-between text-xs text-[#2c3e2d] mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeCategoryDef.icon}</span>
              <div>
                <div className="font-bold flex items-center gap-1.5 text-[#2d4a22]">
                  <span>Тема: «{activeCategoryDef.label}»</span>
                  <span className="text-[11px] font-medium text-[#5a6b52]">
                    ({filteredMessages.length} {filteredMessages.length === 1 ? 'сообщение' : filteredMessages.length < 5 ? 'сообщения' : 'сообщений'})
                  </span>
                </div>
                <div className="text-[10px] text-[#7a8c71]">
                  Показаны только сообщения из темы «{activeCategoryDef.label}». Сообщения разделены по темам.
                </div>
              </div>
            </div>
          </div>
        )}

        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#7a8c71]">
            <Tag className="w-10 h-10 mb-2 text-[#8ba888]/60" />
            <p className="text-xs font-bold text-[#5c4033] uppercase tracking-wider">
              {activeCategoryDef
                ? `В теме «${activeCategoryDef.label}» пока нет сообщений`
                : 'Сообщений пока нет'}
            </p>
            <p className="text-[11px] text-[#5a6b52] mt-1 max-w-xs">
              {activeCategoryDef
                ? `Напишите первое сообщение ниже, чтобы начать обсуждение темы «${activeCategoryDef.label}»`
                : 'Напишите первое сообщение ниже'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.authorId === currentUser.id;
            const categoryDef = activeTopics.find((c) => c.id === msg.category);
            const residentAuthor = residents.find((r) => r.id === msg.authorId);

            const isChairman =
              msg.authorRole === 'chairman' ||
              residentAuthor?.role === 'chairman' ||
              residentAuthor?.isChairman ||
              msg.authorName.includes('Председатель');

            const isAdmin =
              !isChairman &&
              (msg.authorRole === 'admin' ||
                residentAuthor?.role === 'admin' ||
                residentAuthor?.isAdmin ||
                (!isChairman && msg.authorIsAdmin));

            const shouldHidePlot =
              msg.hidePlotInChat ??
              residentAuthor?.hidePlotInChat ??
              (isMe ? currentUser.hidePlotInChat : false);

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[92%] sm:max-w-[80%] ${
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                    isMe
                      ? 'bg-[#2d4a22] text-white'
                      : 'bg-[#e9eddf] border border-[#dce3d5] text-[#2d4a22]'
                  }`}
                >
                  {isMe ? 'Я' : msg.authorName.slice(0, 1)}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1 overflow-hidden">
                  {/* Author Header */}
                  <div
                    className={`flex items-center gap-1.5 text-[11px] ${
                      isMe ? 'justify-end text-[#7a8c71]' : 'text-[#5c4033]'
                    }`}
                  >
                    <span className="font-bold truncate">
                      {isMe ? 'Вы' : cleanAuthorName(msg.authorName)}
                    </span>
                  </div>

                  {/* Bubble body */}
                  <div
                    className={`p-3.5 rounded-2xl shadow-2xs text-xs sm:text-[13px] leading-relaxed relative ${
                      isMe
                        ? 'bg-[#2d4a22] text-white rounded-tr-none'
                        : 'bg-[#f4f7f1] text-[#2c3e2d] border border-[#dce3d5] rounded-tl-none'
                    }`}
                  >
                    {/* Replying banner */}
                    {msg.replyTo && (
                      <div
                        className={`mb-2 p-2 rounded-xl text-[11px] border-l-3 ${
                          isMe
                            ? 'bg-[#3a5d2b] border-[#a2d1a2] text-[#f4f7f1]'
                            : 'bg-[#e9eddf] border-[#7a8c71] text-[#5c4033]'
                        }`}
                      >
                        <div className="font-semibold text-[10px] opacity-90 truncate">
                          В ответ: {cleanAuthorName(msg.replyTo.authorName)}
                        </div>
                        <div className="truncate opacity-80">{msg.replyTo.content}</div>
                      </div>
                    )}

                    {/* Category badge (clickable filter) */}
                    {categoryDef && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(categoryDef.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold mb-1.5 transition cursor-pointer hover:opacity-85 ${
                          isMe
                            ? 'bg-[#3a5d2b] text-[#a2d1a2] border border-[#4d733c]'
                            : 'bg-[#e9eddf] text-[#5c4033] border border-[#dce3d5]'
                        }`}
                        title={`Фильтр по теме: ${categoryDef.label}`}
                      >
                        <span>{categoryDef.icon}</span>
                        <span>{categoryDef.label}</span>
                      </button>
                    )}

                    {/* Content text or Edit mode */}
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2 py-1">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(msg.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          rows={Math.min(6, Math.max(2, editingContent.split('\n').length))}
                          className={`w-full p-2 text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 resize-y ${
                            isMe
                              ? 'bg-white text-[#2c3e2d] border-[#a2d1a2] focus:ring-white/40'
                              : 'bg-white text-[#2c3e2d] border-[#8ba888] focus:ring-[#2d4a22]/30'
                          }`}
                          placeholder="Текст сообщения..."
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                              isMe
                                ? 'bg-[#3a5d2b] text-[#f4f7f1] hover:bg-[#477035]'
                                : 'bg-[#e9eddf] text-[#5a6b52] hover:text-[#2c3e2d] hover:bg-[#dce3d5]'
                            }`}
                          >
                            Отмена (Esc)
                          </button>
                          <button
                            type="button"
                            disabled={!editingContent.trim()}
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-3 py-1 rounded-lg text-[11px] font-bold bg-[#8ba888] hover:bg-[#72926f] disabled:opacity-50 text-[#1f3718] transition cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Сохранить</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    )}

                    {/* Footer Info */}
                    <div
                      className={`mt-1.5 flex items-center justify-end text-[10px] pt-1 border-t ${
                        isMe
                          ? 'border-[#3a5d2b] text-[#a2d1a2]'
                          : 'border-[#e6ebe0] text-[#7a8c71]'
                      }`}
                    >
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.editedAt && (
                        <span
                          className={`ml-1.5 text-[9px] italic ${
                            isMe ? 'text-[#a2d1a2]/80' : 'text-[#7a8c71]'
                          }`}
                          title={`Отредактировано: ${new Date(msg.editedAt).toLocaleString('ru-RU')}`}
                        >
                          (изменено)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Reactions */}
                  <div
                    className={`flex items-center gap-2 pt-0.5 text-xs ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Reactions pills */}
                    {msg.reactions &&
                      Object.entries(msg.reactions).map(([emoji, rawUserIds]) => {
                        const userIds = (rawUserIds as string[]) || [];
                        if (userIds.length === 0) return null;
                        const hasVoted = userIds.includes(currentUser.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => onAddReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition ${
                              hasVoted
                                ? 'bg-[#e9eddf] border-[#8ba888] text-[#2d4a22] font-bold'
                                : 'bg-white border-[#dce3d5] text-[#5a6b52] hover:bg-[#f4f7f1]'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{userIds.length}</span>
                          </button>
                        );
                      })}

                    {/* Quick react button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowEmojiPickerFor(
                            showEmojiPickerFor === msg.id ? null : msg.id
                          )
                        }
                        className="p-1 rounded-md text-[#7a8c71] hover:text-[#2c3e2d] hover:bg-[#e9eddf] transition cursor-pointer"
                        title="Добавить реакцию (50 эмодзи)"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>

                      {showEmojiPickerFor === msg.id && (
                        <>
                          {/* Backdrop to close on click outside */}
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowEmojiPickerFor(null)}
                          />

                          <div
                            className={`absolute bottom-7 z-50 p-2.5 rounded-2xl bg-white shadow-2xl border border-[#dce3d5] w-[280px] sm:w-[320px] max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
                              isMe ? 'right-0' : 'left-0'
                            }`}
                          >
                            <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-[#edf2e7] px-1 shrink-0">
                              <span className="text-[11px] font-bold text-[#2d4a22] uppercase tracking-wider flex items-center gap-1.5">
                                <span>Реакции</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e9eddf] text-[#2d4a22] font-semibold">
                                  50
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowEmojiPickerFor(null)}
                                className="text-[#7a8c71] hover:text-[#2c3e2d] p-1 rounded-lg hover:bg-[#f4f7f1] transition cursor-pointer"
                                title="Закрыть"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="overflow-y-auto pr-1 space-y-2.5 select-none">
                              {POPULAR_EMOJI_CATEGORIES.map((category) => (
                                <div key={category.title}>
                                   <div className="text-[10px] font-bold text-[#7a8c71] uppercase tracking-wider px-1 mb-1">
                                    {category.title}
                                  </div>
                                  <div className="grid grid-cols-5 sm:grid-cols-5 gap-1">
                                    {category.emojis.map((em) => (
                                      <button
                                        key={em}
                                        type="button"
                                        onClick={() => {
                                          onAddReaction(msg.id, em);
                                          setShowEmojiPickerFor(null);
                                        }}
                                        className="h-8 sm:h-9 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-[#edf2e7] hover:scale-125 transition-transform duration-100 active:scale-95 cursor-pointer"
                                        title={em}
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Reply button */}
                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="inline-flex items-center gap-0.5 text-[11px] text-[#7a8c71] hover:text-[#2c3e2d] transition cursor-pointer"
                      title="Ответить на сообщение"
                    >
                      <Reply className="w-3 h-3" />
                      <span>Ответить</span>
                    </button>

                    {/* Edit button: author can edit their own message */}
                    {isMe && editingMessageId !== msg.id && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(msg)}
                        className="inline-flex items-center gap-0.5 text-[11px] text-[#7a8c71] hover:text-[#2c3e2d] transition cursor-pointer"
                        title="Редактировать своё сообщение"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Изменить</span>
                      </button>
                    )}

                    {/* Delete button: author can delete their own message, Admin can delete any message */}
                    {(isMe || isUserAdmin) && (
                      <button
                        type="button"
                        onClick={() => setDeletingMessage(msg)}
                        className="inline-flex items-center gap-0.5 text-[11px] text-[#7a8c71] hover:text-[#be123c] transition cursor-pointer"
                        title={
                          isMe
                            ? 'Удалить своё сообщение'
                            : 'Удалить сообщение (модерация администратора)'
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{isMe ? 'Удалить' : 'Удалить (Админ)'}</span>
                      </button>
                    )}

                    {/* Admin Moderation Button (blocking users) */}
                    {isUserAdmin && msg.authorId !== currentUser.id && (() => {
                      const authorResident = residents.find((r) => r.id === msg.authorId) || ({
                        id: msg.authorId,
                        fullName: msg.authorName,
                        streetNumber: msg.authorStreet,
                        plotNumber: msg.authorPlot,
                        isAdmin: !!msg.authorIsAdmin,
                        role: msg.authorRole || 'member',
                      } as User);
                      const isAuthorBlocked = isUserChatBlocked(authorResident);

                      return isAuthorBlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            setModerationTargetUser(authorResident);
                            setIsModerationModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#be123c] font-bold hover:underline cursor-pointer bg-[#fff1f2] px-2 py-0.5 rounded-lg border border-[#fecdd3]"
                          title="Садовод заблокирован в чате. Нажмите для изменения срока или снятия бана"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Заблокирован ({getChatBlockDurationText(authorResident)})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setModerationTargetUser(authorResident);
                            setIsModerationModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#be123c] hover:text-[#9f1239] transition cursor-pointer px-2 py-0.5 rounded-lg hover:bg-[#fff1f2] border border-transparent hover:border-[#fecdd3]"
                          title="Заблокировать садовода в чатах (только для Администратора)"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-[#be123c]" />
                          <span>Заблокировать</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#fcfdfa] p-3 sm:p-4 border-t border-[#f0f2ec] shrink-0">
        {/* Replying banner */}
        {replyingTo && (
          <div className="mb-2 p-2 rounded-xl bg-[#f4f7f1] border border-[#dce3d5] flex items-center justify-between text-xs text-[#2c3e2d]">
            <div className="truncate mr-2">
              <span className="font-semibold text-[#2d4a22]">
                Ответ для {cleanAuthorName(replyingTo.authorName)}:{' '}
              </span>
              <span className="text-[#5a6b52] italic">«{replyingTo.content}»</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-[#7a8c71] hover:text-[#2c3e2d] rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Category Pills (Tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
          <span className="text-[#5c4033] flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider shrink-0">
            <Tag className="w-3 h-3 text-[#7a8c71]" />
            Тема:
          </span>

          {activeTopics.map((cat) => {
            const unreadCount = getTopicUnreadCount(cat.id);
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  const nowIso = new Date().toISOString();
                  setTopicLastRead((prev) => {
                    const updated = { ...prev, [cat.id]: nowIso };
                    try {
                      localStorage.setItem(topicStorageKey, JSON.stringify(updated));
                    } catch {
                      // ignore
                    }
                    return updated;
                  });
                }}
                className={`px-2.5 py-0.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#2d4a22] text-white font-semibold shadow-2xs ring-2 ring-[#2d4a22]/30'
                    : 'bg-[#f4f7f1] text-[#5a6b52] border border-[#dce3d5] hover:bg-[#e9eddf]'
                }`}
                title={
                  unreadCount > 0
                    ? `Тема «${cat.label}»: ${unreadCount} ${unreadCount === 1 ? 'новое сообщение' : unreadCount < 5 ? 'новых сообщения' : 'новых сообщений'}`
                    : `Тема «${cat.label}»`
                }
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {unreadCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shadow-2xs ${
                      isSelected
                        ? 'bg-[#3a5d2b] text-white'
                        : 'bg-[#2d4a22] text-white'
                    }`}
                  >
                    +{unreadCount}
                  </span>
                )}
              </button>
            );
          })}

          {canManageTopics && onUpdateChatTopics && (
            <button
              id="btn-chat-configure-topics"
              type="button"
              onClick={() => setIsTopicModalOpen(true)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-[#2d4a22] hover:bg-[#e9eddf] border border-dashed border-[#8ba888] flex items-center gap-1 cursor-pointer transition shrink-0 ml-auto"
              title="Настроить темы чата (добавить, переименовать, удалить)"
            >
              <Settings className="w-3 h-3 text-[#2d4a22]" />
              <span>Настроить темы</span>
            </button>
          )}
        </div>

        {/* Text input form or Blocked notice */}
        {isCurrentBlocked ? (
          <div className="p-3 sm:p-4 rounded-2xl bg-[#fff1f2] border border-[#fecdd3] text-[#9f1239] space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
              <ShieldAlert className="w-4 h-4 text-[#be123c] shrink-0" />
              <span>Вам ограничен доступ к отправке сообщений в чатах СНТ</span>
            </div>
            <div className="text-xs text-[#be123c] flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Срок: <strong className="font-semibold">{currentRemainingBlockText}</strong>
              </span>
              {currentUser.chatBlockUntil && currentUser.chatBlockUntil !== 'indefinite' && (
                <span className="text-[#9f1239]/80">
                  (до {new Date(currentUser.chatBlockUntil).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </div>
            {currentUser.chatBlockReason && (
              <div className="text-xs bg-white/80 p-2 rounded-xl border border-[#fecdd3]/60 text-[#78350f]">
                <strong>Причина:</strong> {currentUser.chatBlockReason}
              </div>
            )}
            <p className="text-[11px] text-[#7a8c71] pt-0.5">
              Вы можете просматривать сообщения в темах. Для досрочного снятия блокировки обратитесь к администратору или в правление СНТ.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-end gap-2 relative">
            <div className="relative flex-1">
              <textarea
                id="textarea-chat-message"
                rows={2}
                maxLength={1000}
                required
                placeholder={`Сообщение в тему «${activeTopicTitle}» от ${currentUser.fullName}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm rounded-2xl border border-[#dce3d5] focus:outline-none focus:border-[#8ba888] focus:ring-2 focus:ring-[#8ba888]/20 resize-none bg-white text-[#2c3e2d] placeholder-[#7a8c71]/70"
              />

              {/* Button to open composer emoji picker */}
              <button
                type="button"
                onClick={() => setShowInputEmojiPicker(!showInputEmojiPicker)}
                className="absolute right-2.5 bottom-2.5 p-1.5 rounded-xl text-[#7a8c71] hover:text-[#2d4a22] hover:bg-[#e9eddf] transition cursor-pointer"
                title="Вставить эмодзи (50 популярных)"
              >
                <Smile className="w-4 h-4" />
              </button>

              {showInputEmojiPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowInputEmojiPicker(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-2 z-50 p-2.5 rounded-2xl bg-white shadow-2xl border border-[#dce3d5] w-[280px] sm:w-[320px] max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-[#edf2e7] px-1 shrink-0">
                      <span className="text-[11px] font-bold text-[#2d4a22] uppercase tracking-wider flex items-center gap-1.5">
                        <span>Эмодзи</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e9eddf] text-[#2d4a22] font-semibold">
                          50
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowInputEmojiPicker(false)}
                        className="text-[#7a8c71] hover:text-[#2c3e2d] p-1 rounded-lg hover:bg-[#f4f7f1] transition cursor-pointer"
                        title="Закрыть"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-y-auto pr-1 space-y-2.5 select-none">
                      {POPULAR_EMOJI_CATEGORIES.map((category) => (
                        <div key={category.title}>
                          <div className="text-[10px] font-bold text-[#7a8c71] uppercase tracking-wider px-1 mb-1">
                            {category.title}
                          </div>
                          <div className="grid grid-cols-5 sm:grid-cols-5 gap-1">
                            {category.emojis.map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => {
                                  setInputText((prev) => prev + em);
                                }}
                                className="h-8 sm:h-9 flex items-center justify-center text-lg sm:text-xl rounded-xl hover:bg-[#edf2e7] hover:scale-125 transition-transform duration-100 active:scale-95 cursor-pointer"
                                title={em}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              id="btn-chat-send"
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 rounded-2xl bg-[#2d4a22] hover:bg-[#3a5d2b] active:bg-[#223a1a] disabled:opacity-40 text-white shadow-xs transition shrink-0"
              title="Отправить (зашифровать в локальной базе)"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {canManageTopics && onUpdateChatTopics && (
        <ChatTopicsModal
          isOpen={isTopicModalOpen}
          topics={activeTopics}
          messages={messages}
          onSave={(newTopics) => {
            onUpdateChatTopics(newTopics);
            if (!newTopics.some((t) => t.id === selectedCategory)) {
              setSelectedCategory(newTopics[0]?.id || 'general');
            }
          }}
          onClose={() => setIsTopicModalOpen(false)}
        />
      )}

      {/* Admin / Chairman Chat Block Modal */}
      {isModerationModalOpen && moderationTargetUser && (
        <ChatBlockModal
          isOpen={isModerationModalOpen}
          user={moderationTargetUser}
          targetUser={moderationTargetUser}
          onClose={() => {
            setIsModerationModalOpen(false);
            setModerationTargetUser(null);
          }}
          onSave={async (blocked, durationMinutes, reason) => {
            if (onUpdateChatBlock && moderationTargetUser) {
              await onUpdateChatBlock(moderationTargetUser.id, blocked, durationMinutes, reason);
            }
            setIsModerationModalOpen(false);
            setModerationTargetUser(null);
          }}
        />
      )}
      {/* Delete message confirmation modal */}
      {deletingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-[#dce3d5] space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-[#fff1f2] text-[#be123c] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#2c3e2d]">
                  Удалить сообщение?
                </h3>
                <p className="text-xs text-[#5a6b52] mt-1">
                  {deletingMessage.authorId === currentUser.id
                    ? 'Вы уверены, что хотите удалить своё сообщение? Это действие необратимо.'
                    : `Удалить сообщение пользователя ${cleanAuthorName(deletingMessage.authorName)}? Сообщение будет безвозвратно удалено из чата для всех садоводов.`}
                </p>
                <div className="mt-2 p-2 rounded-xl bg-[#f7f9f5] border border-[#e6ebe0] text-xs text-[#445641] italic line-clamp-2">
                  «{deletingMessage.content}»
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f2ec]">
              <button
                type="button"
                onClick={() => setDeletingMessage(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#5a6b52] hover:text-[#2c3e2d] hover:bg-[#f4f7f1] rounded-xl transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#be123c] hover:bg-[#9f1239] rounded-xl transition cursor-pointer shadow-2xs"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
