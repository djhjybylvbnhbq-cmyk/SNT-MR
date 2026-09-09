import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, Hash, Sparkles } from 'lucide-react';
import { ChatTopicConfig, ChatMessage } from '../types';

interface ChatTopicsModalProps {
  isOpen: boolean;
  topics: ChatTopicConfig[];
  messages: ChatMessage[];
  onSave: (topics: ChatTopicConfig[]) => void;
  onClose: () => void;
}

const EMOJI_PRESETS = ['💬', '🚜', '💧', '⚡', '🛡️', '🍐', '🏗️', '🧹', '🌲', '🐕', '🚗', '📦', '📢', '🌸', '🧱', '🔥', '📋', '🚨'];

export const ChatTopicsModal: React.FC<ChatTopicsModalProps> = ({
  isOpen,
  topics,
  messages,
  onSave,
  onClose,
}) => {
  const [localTopics, setLocalTopics] = useState<ChatTopicConfig[]>(topics);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');

  // New topic state
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicIcon, setNewTopicIcon] = useState('💬');
  const [showEmojiPickerForNew, setShowEmojiPickerForNew] = useState(false);
  const [showEmojiPickerForEdit, setShowEmojiPickerForEdit] = useState(false);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEdit = (topic: ChatTopicConfig) => {
    setEditingTopicId(topic.id);
    setEditTitle(topic.label);
    setEditIcon(topic.icon);
    setShowEmojiPickerForEdit(false);
    setDeletingTopicId(null);
    setErrorMsg(null);
  };

  const saveEdit = () => {
    if (!editingTopicId) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setErrorMsg('Название темы не может быть пустым');
      return;
    }

    setLocalTopics((prev) =>
      prev.map((t) => (t.id === editingTopicId ? { ...t, label: trimmed, icon: editIcon || '💬' } : t))
    );
    setEditingTopicId(null);
    setErrorMsg(null);
  };

  const cancelEdit = () => {
    setEditingTopicId(null);
    setErrorMsg(null);
  };

  const handleDelete = (id: string) => {
    if (localTopics.length <= 1) {
      setErrorMsg('В чате должна оставаться как минимум одна тема');
      setDeletingTopicId(null);
      return;
    }
    setLocalTopics((prev) => prev.filter((t) => t.id !== id));
    if (editingTopicId === id) {
      setEditingTopicId(null);
    }
    setDeletingTopicId(null);
    setErrorMsg(null);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTopicTitle.trim();
    if (!trimmed) {
      setErrorMsg('Введите название новой темы');
      return;
    }

    // Generate safe unique id
    const baseId = trimmed
      .toLowerCase()
      .replace(/[^a-zа-я0-9]/gi, '-')
      .replace(/-+/g, '-')
      .slice(0, 20);
    const uniqueId = `topic-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;

    const newTopic: ChatTopicConfig = {
      id: uniqueId,
      label: trimmed,
      icon: newTopicIcon.trim() || '💬',
    };

    setLocalTopics((prev) => [...prev, newTopic]);
    setNewTopicTitle('');
    setNewTopicIcon('💬');
    setShowEmojiPickerForNew(false);
    setErrorMsg(null);
  };

  const handleSaveAll = () => {
    if (localTopics.length === 0) {
      setErrorMsg('Необходимо оставить хотя бы одну тему');
      return;
    }
    onSave(localTopics);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fcfdfa] w-full max-w-lg rounded-2xl sm:rounded-3xl border border-[#dce3d5] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#2d4a22] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Управление темами чата
              </h3>
              <p className="text-[11px] text-[#c5ddc3]">
                Добавление, переименование и удаление каналов чата
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-[#c5ddc3] hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#9f1239] text-xs">
              {errorMsg}
            </div>
          )}

          {/* Current topics list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#5c4033] uppercase tracking-wider">
                Текущие темы ({localTopics.length})
              </span>
              <span className="text-[11px] text-[#7a8c71]">
                Отображаются в шапке и меню ввода
              </span>
            </div>

            <div className="space-y-2">
              {localTopics.map((topic) => {
                const msgCount = messages.filter((m) => m.category === topic.id).length;
                const isEditing = editingTopicId === topic.id;

                return (
                  <div
                    key={topic.id}
                    className={`p-2.5 sm:p-3 rounded-xl border transition ${
                      isEditing
                        ? 'bg-[#f4f7f1] border-[#8ba888] ring-2 ring-[#8ba888]/20'
                        : 'bg-white border-[#dce3d5] hover:border-[#8ba888]'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {/* Icon Selector Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowEmojiPickerForEdit(!showEmojiPickerForEdit)}
                              className="w-9 h-9 text-lg rounded-xl border border-[#dce3d5] bg-white flex items-center justify-center hover:bg-[#e9eddf] transition"
                              title="Выбрать значок темы"
                            >
                              {editIcon || '💬'}
                            </button>
                            {showEmojiPickerForEdit && (
                              <div className="absolute top-11 left-0 z-30 p-2 bg-white rounded-xl shadow-xl border border-[#dce3d5] grid grid-cols-6 gap-1 w-48 animate-in fade-in">
                                {EMOJI_PRESETS.map((em) => (
                                  <button
                                    key={em}
                                    type="button"
                                    onClick={() => {
                                      setEditIcon(em);
                                      setShowEmojiPickerForEdit(false);
                                    }}
                                    className="w-7 h-7 text-sm rounded hover:bg-[#e9eddf] flex items-center justify-center transition"
                                  >
                                    {em}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                            placeholder="Название темы"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />

                          <button
                            type="button"
                            onClick={saveEdit}
                            className="p-2 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] transition"
                            title="Сохранить название"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-2 rounded-xl bg-[#e9eddf] text-[#5c4033] hover:bg-[#dce3d5] transition"
                            title="Отмена"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base sm:text-lg shrink-0">{topic.icon}</span>
                          <div className="truncate">
                            <span className="text-xs sm:text-sm font-semibold text-[#2c3e2d] block truncate">
                              {topic.label}
                            </span>
                            <span className="text-[10px] text-[#7a8c71]">
                              {msgCount > 0 ? `${msgCount} сообщений` : 'Нет сообщений'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(topic)}
                            className="p-1.5 rounded-lg text-[#5a6b52] hover:text-[#2d4a22] hover:bg-[#e9eddf] transition"
                            title="Переименовать тему"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {deletingTopicId === topic.id ? (
                            <div className="flex items-center gap-1 bg-[#fee2e2] px-2 py-0.5 rounded-lg border border-[#fca5a5]">
                              <span className="text-[10px] font-bold text-[#b91c1c]">Удалить?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(topic.id)}
                                className="px-1.5 py-0.5 rounded bg-[#dc2626] text-white text-[10px] font-bold hover:bg-[#b91c1c] transition cursor-pointer"
                              >
                                Да
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTopicId(null)}
                                className="px-1 py-0.5 rounded bg-white text-[#5a6b52] text-[10px] hover:bg-[#f4f7f1] transition cursor-pointer border border-[#e5e7eb]"
                              >
                                Нет
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (localTopics.length <= 1) {
                                  setErrorMsg('В чате должна оставаться как минимум одна тема');
                                  return;
                                }
                                setDeletingTopicId(topic.id);
                                setErrorMsg(null);
                              }}
                              className="p-1.5 rounded-lg text-[#b91c1c] hover:text-white hover:bg-[#b91c1c] transition cursor-pointer"
                              title="Удалить тему"
                              disabled={localTopics.length <= 1}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add new topic form */}
          <div className="pt-2 border-t border-[#dce3d5]">
            <span className="text-xs font-bold text-[#5c4033] uppercase tracking-wider block mb-2">
              Добавить новую тему
            </span>

            <form onSubmit={handleAddNew} className="space-y-2">
              <div className="flex items-center gap-2">
                {/* Emoji Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPickerForNew(!showEmojiPickerForNew)}
                    className="w-10 h-10 text-lg rounded-xl border border-[#dce3d5] bg-white flex items-center justify-center hover:bg-[#e9eddf] transition"
                    title="Выбрать иконку темы"
                  >
                    {newTopicIcon}
                  </button>
                  {showEmojiPickerForNew && (
                    <div className="absolute bottom-12 left-0 z-30 p-2 bg-white rounded-xl shadow-xl border border-[#dce3d5] grid grid-cols-6 gap-1 w-48 animate-in fade-in">
                      {EMOJI_PRESETS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            setNewTopicIcon(em);
                            setShowEmojiPickerForNew(false);
                          }}
                          className="w-7 h-7 text-sm rounded hover:bg-[#e9eddf] flex items-center justify-center transition"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="Название новой темы (напр. Газификация, Охрана)"
                  className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                />

                <button
                  type="submit"
                  disabled={!newTopicTitle.trim()}
                  className="px-3 py-2 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] disabled:opacity-40 text-xs font-semibold flex items-center gap-1 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>

              {/* Quick Preset Topics */}
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <span className="text-[10px] text-[#7a8c71] mr-1">Шаблоны:</span>
                {[
                  { label: 'Газификация', icon: '🔥' },
                  { label: 'Субботники', icon: '🧹' },
                  { label: 'Питомцы', icon: '🐕' },
                  { label: 'Строительство', icon: '🏗️' },
                  { label: 'Детская площадка', icon: '🎉' },
                ].map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => {
                      setNewTopicTitle(tmpl.label);
                      setNewTopicIcon(tmpl.icon);
                    }}
                    className="px-2 py-0.5 rounded-md text-[10px] bg-[#e9eddf] text-[#5c4033] hover:bg-[#dce3d5] transition flex items-center gap-0.5"
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.label}</span>
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f4f7f1] px-5 py-3 border-t border-[#dce3d5] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5a6b52] hover:bg-[#e9eddf] transition"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] text-xs font-bold shadow-xs transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Сохранить темы</span>
          </button>
        </div>
      </div>
    </div>
  );
};
