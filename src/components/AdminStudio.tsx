import React, { useState } from 'react';
import {
  Sliders,
  Type,
  Layers,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  Phone,
  ShieldCheck,
  Info,
  Bell,
  MessageSquare,
  Users,
  ChevronRight,
  Shield,
  Upload,
  Download,
  Edit3,
  KeyRound,
  Hash,
  ArrowUp,
  ArrowDown,
  Pencil,
  ShieldAlert,
  Clock,
  UserX,
} from 'lucide-react';
import {
  AppConfig,
  AppSectionConfig,
  AppBrandingConfig,
  CustomContentItem,
  User,
  UserRole,
  ChatTopicConfig,
} from '../types';
import { resetAppConfig, DEFAULT_CHAT_TOPICS } from '../utils/appConfig';
import { isUserChatBlocked, getChatBlockDurationText, checkIsAdmin } from '../utils/moderation';
import { formatStreetName } from '../utils/streets';
import { ChatBlockModal } from './ChatBlockModal';

interface AdminStudioProps {
  currentUser: User;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onClose?: () => void;
  onUpdateCurrentUserAdmin: (isAdmin: boolean) => void;
  lastChatVisitTimestamp?: string;
  unreadChatCount?: number;
  onSetLastChatVisitTimestamp?: (ts: string) => void;
  onSimulateNeighborMessage?: () => void;
  residents?: User[];
  onUpdateResidentRole?: (residentId: string, newRole: UserRole) => void;
  onUpdateChatBlock?: (
    residentId: string,
    blocked: boolean,
    durationMinutes?: number | null,
    reason?: string
  ) => void;
  onDeleteResident?: (residentId: string) => Promise<void> | void;
}

export const AdminStudio: React.FC<AdminStudioProps> = ({
  currentUser,
  config,
  onSaveConfig,
  onClose,
  onUpdateCurrentUserAdmin,
  lastChatVisitTimestamp,
  unreadChatCount = 0,
  onSetLastChatVisitTimestamp,
  onSimulateNeighborMessage,
  residents = [],
  onUpdateResidentRole,
  onUpdateChatBlock,
  onDeleteResident,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'sections' | 'topics' | 'access'>(
    'branding'
  );

  const [modalUser, setModalUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminSelectBlockUser, setAdminSelectBlockUser] = useState('');
  const [residentToDelete, setResidentToDelete] = useState<User | null>(null);
  const [isDeletingResident, setIsDeletingResident] = useState(false);
  const isCurrentUserAdmin = checkIsAdmin(currentUser);

  // Local working copy of config
  const [localConfig, setLocalConfig] = useState<AppConfig>(() => {
    const copy = JSON.parse(JSON.stringify(config));
    if (!copy.chatTopics || !Array.isArray(copy.chatTopics) || copy.chatTopics.length === 0) {
      copy.chatTopics = DEFAULT_CHAT_TOPICS;
    }
    return copy;
  });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showAdminSecret, setShowAdminSecret] = useState<boolean>(false);

  // Topic manager state
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicIcon, setNewTopicIcon] = useState('💬');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState('');
  const [editingTopicIcon, setEditingTopicIcon] = useState('');
  const [confirmDeleteTopicId, setConfirmDeleteTopicId] = useState<string | null>(null);
  const [confirmResetTopics, setConfirmResetTopics] = useState<boolean>(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  // Section editor modal / drawer state
  const [editingSection, setEditingSection] = useState<AppSectionConfig | null>(null);
  const [editingSectionMeta, setEditingSectionMeta] = useState<AppSectionConfig | null>(null);
  const [editSectionLabel, setEditSectionLabel] = useState('');
  const [editSectionSubtitle, setEditSectionSubtitle] = useState('');
  const [newSectionModal, setNewSectionModal] = useState<boolean>(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState('FileText');

  // Custom Item for section being edited
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [newItemBadge, setNewItemBadge] = useState('');
  const [newItemPhone, setNewItemPhone] = useState('');

  // Handle saving the config
  const handleApplySave = () => {
    onSaveConfig(localConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Reset to default configuration
  const handleResetToDefaults = () => {
    const def = resetAppConfig();
    setLocalConfig(def);
    onSaveConfig(def);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Update Branding field
  const updateBranding = <K extends keyof AppBrandingConfig>(key: K, value: AppBrandingConfig[K]) => {
    setLocalConfig((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        [key]: value,
      },
    }));
  };

  // Toggle section enabled
  const toggleSection = (sectionId: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s)),
    }));
  };

  // Open edit modal for section name & description
  const openEditSectionModal = (sec: AppSectionConfig) => {
    setEditingSectionMeta(sec);
    setEditSectionLabel(sec.label);
    setEditSectionSubtitle(sec.subtitle || '');
  };

  // Save edited section name & description
  const handleSaveSectionMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectionMeta || !editSectionLabel.trim()) return;

    const updatedSections = localConfig.sections.map((sec) => {
      if (sec.id !== editingSectionMeta.id) return sec;
      return {
        ...sec,
        label: editSectionLabel.trim(),
        subtitle: editSectionSubtitle.trim(),
        customContent: sec.customContent
          ? {
              ...sec.customContent,
              title: editSectionLabel.trim(),
              description: editSectionSubtitle.trim(),
            }
          : undefined,
      };
    });

    const updated = {
      ...localConfig,
      sections: updatedSections,
    };
    setLocalConfig(updated);
    onSaveConfig(updated);
    setEditingSectionMeta(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Reorder sections: move up
  const moveSectionUp = (index: number) => {
    if (index <= 0) return;
    const list = [...localConfig.sections];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;

    const reordered = list.map((sec, idx) => ({
      ...sec,
      order: idx + 1,
    }));

    const updated = {
      ...localConfig,
      sections: reordered,
    };
    setLocalConfig(updated);
    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Reorder sections: move down
  const moveSectionDown = (index: number) => {
    if (index >= localConfig.sections.length - 1) return;
    const list = [...localConfig.sections];
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;

    const reordered = list.map((sec, idx) => ({
      ...sec,
      order: idx + 1,
    }));

    const updated = {
      ...localConfig,
      sections: reordered,
    };
    setLocalConfig(updated);
    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Delete custom section
  const deleteSection = (sectionId: string) => {
    const updated = {
      ...localConfig,
      sections: localConfig.sections.filter((s) => s.id !== sectionId),
    };
    setLocalConfig(updated);
    onSaveConfig(updated);
    if (editingSection?.id === sectionId) setEditingSection(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Add custom section
  const handleCreateNewSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    const id = `custom-${Date.now()}`;
    const newSec: AppSectionConfig = {
      id,
      label: newSectionTitle.trim(),
      subtitle: newSectionSubtitle.trim() || 'Информационный раздел',
      icon: newSectionIcon,
      enabled: true,
      order: localConfig.sections.length + 1,
      isCustom: true,
      customContent: {
        title: newSectionTitle.trim(),
        description: newSectionSubtitle.trim() || 'Информационный раздел',
        items: [
          {
            id: `item-${Date.now()}`,
            title: 'Первая запись раздела',
            text: 'Нажмите «Редактировать» в админке, чтобы изменить или дополнить этот блок.',
            badge: 'Информация',
          },
        ],
      },
    };

    setLocalConfig((prev) => ({
      ...prev,
      sections: [...prev.sections, newSec],
    }));

    setNewSectionTitle('');
    setNewSectionSubtitle('');
    setNewSectionModal(false);
  };

  // Add custom item into section
  const handleAddItemToSection = (sectionId: string) => {
    if (!newItemTitle.trim() || !newItemText.trim()) return;

    const newItem: CustomContentItem = {
      id: `item-${Date.now()}`,
      title: newItemTitle.trim(),
      text: newItemText.trim(),
      badge: newItemBadge.trim() || undefined,
      linkOrPhone: newItemPhone.trim() || undefined,
    };

    setLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const currentContent = sec.customContent || {
          title: sec.label,
          description: sec.subtitle || '',
          items: [],
        };
        return {
          ...sec,
          customContent: {
            ...currentContent,
            items: [...currentContent.items, newItem],
          },
        };
      }),
    }));

    // If editingSection is this one, update it too
    if (editingSection?.id === sectionId) {
      setEditingSection((prev) => {
        if (!prev) return null;
        const currentContent = prev.customContent || {
          title: prev.label,
          description: prev.subtitle || '',
          items: [],
        };
        return {
          ...prev,
          customContent: {
            ...currentContent,
            items: [...currentContent.items, newItem],
          },
        };
      });
    }

    setNewItemTitle('');
    setNewItemText('');
    setNewItemBadge('');
    setNewItemPhone('');
  };

  // Delete item from section
  const handleDeleteItemFromSection = (sectionId: string, itemId: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId || !sec.customContent) return sec;
        return {
          ...sec,
          customContent: {
            ...sec.customContent,
            items: sec.customContent.items.filter((it) => it.id !== itemId),
          },
        };
      }),
    }));

    if (editingSection?.id === sectionId && editingSection.customContent) {
      setEditingSection((prev) => {
        if (!prev || !prev.customContent) return null;
        return {
          ...prev,
          customContent: {
            ...prev.customContent,
            items: prev.customContent.items.filter((it) => it.id !== itemId),
          },
        };
      });
    }
  };


  // Export config as JSON file
  const handleExportConfigJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(localConfig, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `snt-config-${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  // Import config from JSON
  const handleImportConfigJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.branding && parsed.sections) {
          setLocalConfig(parsed);
          onSaveConfig(parsed);
          alert('Конфигурация приложения успешно загружена!');
        } else {
          alert('Некорректный формат файла конфигурации');
        }
      } catch {
        alert('Ошибка при чтении файла JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Top Banner & Actions */}
      <div className="bg-[#2d4a22] text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#a2d1a2]" />
            <h2 className="text-base sm:text-lg font-bold">Панель управления и конструктор приложения</h2>
          </div>
          <p className="text-xs text-[#dce3d5] mt-0.5">
            Редактирование надписей, структуры разделов, информационных блоков и прав доступа
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={handleApplySave}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-[#2d4a22] hover:bg-[#f4f7f1]'
            }`}
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Сохранено!' : 'Применить изменения'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-[#3a5d2b] hover:bg-[#4d733c] text-white text-xs font-semibold transition cursor-pointer"
            >
              Закрыть
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex border-b border-[#dce3d5] bg-white rounded-2xl p-1 shadow-2xs gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('branding')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'branding'
              ? 'bg-[#2d4a22] text-white shadow-2xs'
              : 'text-[#5a6b52] hover:bg-[#f4f7f1]'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Надписи и бренд</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sections')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'sections'
              ? 'bg-[#2d4a22] text-white shadow-2xs'
              : 'text-[#5a6b52] hover:bg-[#f4f7f1]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Разделы ({localConfig.sections.filter((s) => s.enabled).length}/{localConfig.sections.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('topics')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'topics'
              ? 'bg-[#2d4a22] text-white shadow-2xs'
              : 'text-[#5a6b52] hover:bg-[#f4f7f1]'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>Темы чата ({(localConfig.chatTopics || DEFAULT_CHAT_TOPICS).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('access')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'access'
              ? 'bg-[#2d4a22] text-white shadow-2xs'
              : 'text-[#5a6b52] hover:bg-[#f4f7f1]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Права и экспорт</span>
        </button>
      </div>

      {/* 1. BRANDING & TEXTS TAB */}
      {activeSubTab === 'branding' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6ebe0] shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#f0f4ec] pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#2c3e2d] flex items-center gap-2">
                <Type className="w-4 h-4 text-[#2d4a22]" />
                <span>Основные надписи и контакты СНТ</span>
              </h3>
              <p className="text-xs text-[#5a6b52]">
                Измените название, слоган в шапке или дежурные телефоны — они мгновенно обновятся во всем приложении
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-[11px] text-[#7a8c71] hover:text-[#2d4a22] flex items-center gap-1 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>По умолчанию</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                Название СНТ / Приложения
              </label>
              <input
                type="text"
                value={localConfig.branding.appName}
                onChange={(e) => updateBranding('appName', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                placeholder="СНТ «Междуречье»"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                Подзаголовок в шапке (слоган)
              </label>
              <input
                type="text"
                value={localConfig.branding.appTagline}
                onChange={(e) => updateBranding('appTagline', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                placeholder="Локальная сеть участников • 25 улиц, ~200 участков"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                Текст бейджа в шапке (справа от названия)
              </label>
              <input
                type="text"
                value={localConfig.branding.badgeText}
                onChange={(e) => updateBranding('badgeText', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                placeholder="AES-256 включено"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                Телефон дежурного электрика
              </label>
              <input
                type="text"
                value={localConfig.branding.emergencyPhoneElectrician}
                onChange={(e) => updateBranding('emergencyPhoneElectrician', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                placeholder="+7 (925) 123-45-67"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                Телефон председателя правления
              </label>
              <input
                type="text"
                value={localConfig.branding.emergencyPhoneChairman}
                onChange={(e) => updateBranding('emergencyPhoneChairman', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                placeholder="+7 (916) 777-88-99"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                Телефон поста охраны / КПП
              </label>
              <input
                type="text"
                value={localConfig.branding.emergencyPhoneSecurity}
                onChange={(e) => updateBranding('emergencyPhoneSecurity', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                placeholder="+7 (903) 444-22-11"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                Основной текст в подвале сайта (Footer)
              </label>
              <input
                type="text"
                value={localConfig.branding.footerText}
                onChange={(e) => updateBranding('footerText', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                placeholder="СНТ «Междуречье»"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                Пояснение к экрану блокировки базы данных
              </label>
              <input
                type="text"
                value={localConfig.branding.lockScreenNote}
                onChange={(e) => updateBranding('lockScreenNote', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                placeholder="Все данные зашифрованы ключом AES-256 в локальной памяти вашего устройства"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleApplySave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить надписи</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. SECTIONS TAB */}
      {activeSubTab === 'sections' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6ebe0] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#f0f4ec] pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#2c3e2d] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2d4a22]" />
                <span>Управление разделами приложения</span>
              </h3>
              <p className="text-xs text-[#5a6b52]">
                Включайте, отключайте, переименовывайте разделы или добавляйте новые произвольные страницы
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNewSectionModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Добавить раздел</span>
            </button>
          </div>

          {/* List of Sections */}
          <div className="space-y-2.5">
            {localConfig.sections.map((sec, index) => {
              return (
                <div
                  key={sec.id}
                  className={`p-3 sm:p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    sec.enabled
                      ? 'bg-[#fcfdfa] border-[#dce3d5]'
                      : 'bg-[#f4f4f4] border-[#e0e0e0] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Reorder controls */}
                    <div className="flex flex-col items-center justify-center gap-0.5 bg-[#f4f7f1] p-1 rounded-xl border border-[#dce3d5] shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveSectionUp(index)}
                        className={`p-0.5 rounded-md transition ${
                          index === 0
                            ? 'opacity-25 cursor-not-allowed text-[#a0a0a0]'
                            : 'hover:bg-[#e2eadb] text-[#2d4a22] cursor-pointer'
                        }`}
                        title="Поднять выше в меню"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-[#5a6b52] leading-none px-1">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={index === localConfig.sections.length - 1}
                        onClick={() => moveSectionDown(index)}
                        className={`p-0.5 rounded-md transition ${
                          index === localConfig.sections.length - 1
                            ? 'opacity-25 cursor-not-allowed text-[#a0a0a0]'
                            : 'hover:bg-[#e2eadb] text-[#2d4a22] cursor-pointer'
                        }`}
                        title="Опустить ниже в меню"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className={`w-10 h-6 flex items-center rounded-full p-0.5 transition cursor-pointer shrink-0 ${
                        sec.enabled ? 'bg-[#2d4a22] justify-end' : 'bg-[#a0a0a0] justify-start'
                      }`}
                      title={sec.enabled ? 'Отключить раздел' : 'Включить раздел'}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#2c3e2d] truncate">{sec.label}</span>
                        {sec.isCustom ? (
                          <span className="text-[10px] px-2 py-0.2 rounded-md bg-[#e0f2fe] text-[#0369a1] font-semibold border border-[#bae6fd]">
                            Пользовательский раздел
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.2 rounded-md bg-[#f4f7f1] text-[#5a6b52] font-semibold border border-[#dce3d5]">
                            Системный
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7a8c71] mt-0.5 line-clamp-1">{sec.subtitle || 'Без описания'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditSectionModal(sec)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-[#dce3d5] hover:border-[#8ba888] text-xs font-semibold text-[#2d4a22] flex items-center gap-1 cursor-pointer transition shadow-2xs hover:bg-[#fcfdfa]"
                      title="Изменить название и описание раздела"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#2d4a22]" />
                      <span>Изменить</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal for creating a new section */}
          {newSectionModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
              <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-[#dce3d5] shadow-xl space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-[#f0f4ec] pb-3">
                  <div className="font-bold text-base text-[#2c3e2d] flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[#2d4a22]" />
                    <span>Новый раздел приложения</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewSectionModal(false)}
                    className="text-xs text-[#7a8c71] hover:text-[#2d4a22]"
                  >
                    Отмена
                  </button>
                </div>

                <form onSubmit={handleCreateNewSection} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                      Название раздела (будет в меню)
                    </label>
                    <input
                      type="text"
                      required
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="Например: Документы СНТ или Барахолка"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                      Краткое описание раздела
                    </label>
                    <input
                      type="text"
                      value={newSectionSubtitle}
                      onChange={(e) => setNewSectionSubtitle(e.target.value)}
                      placeholder="Например: Устав, протоколы собраний и сметы"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNewSectionModal(false)}
                      className="px-3 py-2 rounded-xl bg-[#f4f7f1] text-xs font-semibold text-[#5a6b52]"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2d4a22] text-white text-xs font-bold shadow-xs hover:bg-[#3a5d2b]"
                    >
                      Создать раздел
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal for editing section name & description */}
          {editingSectionMeta && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
              <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-[#dce3d5] shadow-xl space-y-4 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-[#f0f4ec] pb-3">
                  <div className="font-bold text-base text-[#2c3e2d] flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-[#2d4a22]" />
                    <span>Редактирование раздела</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingSectionMeta(null)}
                    className="text-xs text-[#7a8c71] hover:text-[#2d4a22] cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>

                <form onSubmit={handleSaveSectionMeta} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                      Название раздела <span className="text-[#9f1239]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editSectionLabel}
                      onChange={(e) => setEditSectionLabel(e.target.value)}
                      placeholder="Например: Чат, Объявления, Справка..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888]"
                    />
                    <p className="text-[11px] text-[#7a8c71] mt-1">
                      Отображается на вкладках нижней навигации и в заголовках.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5c4033] mb-1">
                      Описание раздела (подзаголовок)
                    </label>
                    <textarea
                      rows={3}
                      value={editSectionSubtitle}
                      onChange={(e) => setEditSectionSubtitle(e.target.value)}
                      placeholder="Краткое пояснение, о чем этот раздел..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888] resize-none"
                    />
                    <p className="text-[11px] text-[#7a8c71] mt-1">
                      Поясняющий текст для садоводов и жителей.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-[#f0f4ec]">
                    <button
                      type="button"
                      onClick={() => setEditingSectionMeta(null)}
                      className="px-3.5 py-2 rounded-xl bg-[#f4f7f1] text-xs font-semibold text-[#5a6b52] hover:bg-[#e9eddf] transition cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#2d4a22] text-white text-xs font-bold shadow-xs hover:bg-[#3a5d2b] transition cursor-pointer"
                    >
                      Сохранить изменения
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ACCESS & EXPORT TAB */}
      {activeSubTab === 'access' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6ebe0] shadow-xs space-y-5">
          <div className="border-b border-[#f0f4ec] pb-3">
            <h3 className="font-bold text-sm sm:text-base text-[#2c3e2d] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2d4a22]" />
              <span>Права доступа и резервное копирование настроек</span>
            </h3>
            <p className="text-xs text-[#5a6b52]">
              Управление статусом администратора и сохранение структуры в файл JSON
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#f4f7f1] border border-[#dce3d5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-xs sm:text-sm text-[#2c3e2d]">
                Статус текущего пользователя ({currentUser.fullName})
              </div>
              <p className="text-xs text-[#5a6b52] mt-0.5">
                {currentUser.isAdmin
                  ? 'Вы являетесь администратором СНТ и можете редактировать приложение'
                  : 'Пользовательский режим без прав редактирования'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onUpdateCurrentUserAdmin(!currentUser.isAdmin)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                currentUser.isAdmin
                  ? 'bg-[#be123c] text-white hover:bg-[#9f1239]'
                  : 'bg-[#2d4a22] text-white hover:bg-[#3a5d2b]'
              }`}
            >
              {currentUser.isAdmin ? 'Снять права администратора' : 'Включить права администратора'}
            </button>
          </div>

          {/* Secret Admin Registration Password Management */}
          <div className="p-4 rounded-2xl bg-[#fcfdfa] border border-[#dce3d5] space-y-3">
            <div className="flex items-center justify-between border-b border-[#e6ebe0] pb-2">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-[#2c3e2d]">
                <KeyRound className="w-4 h-4 text-[#2d4a22]" />
                <span>Пароль для автоматической регистрации администратора</span>
              </div>
            </div>
            <p className="text-xs text-[#5a6b52]">
              Если новый пользователь введет этот пароль в форме регистрации, он автоматически получит права Администратора СНТ. Никаких подсказок в публичном окне регистрации не отображается. Вы можете изменить этот пароль в любое время.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <div className="relative flex-1">
                <input
                  type={showAdminSecret ? 'text' : 'password'}
                  value={localConfig.adminSecretPassword || 'V6544Dv*'}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      adminSecretPassword: e.target.value,
                    }))
                  }
                  placeholder="Секретный пароль админа"
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminSecret(!showAdminSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a8c71] hover:text-[#2c3e2d] cursor-pointer"
                >
                  {showAdminSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleApplySave}
                className="px-4 py-2 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] text-white font-semibold text-xs transition cursor-pointer shrink-0"
              >
                Сохранить пароль
              </button>
            </div>
          </div>

          {/* Board Status & Roles Management (Admin capability only) */}
          <div className="p-4 rounded-2xl bg-[#fcfdfa] border border-[#dce3d5] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e6ebe0] pb-2.5">
              <div>
                <div className="font-bold text-xs sm:text-sm text-[#2c3e2d] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#2d4a22]" />
                  <span>Управление статусами правления и садоводов</span>
                </div>
                <p className="text-xs text-[#5a6b52] mt-0.5">
                  Только администратор имеет полномочия присваивать статус Председателя правления или Члена СНТ
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#2d4a22] bg-[#e9eddf] px-2.5 py-1 rounded-full border border-[#dce3d5]">
                Жителей в базе: {residents.length}
              </span>
            </div>

            <div className="divide-y divide-[#f0f4ec] max-h-64 overflow-y-auto pr-1">
              {residents.map((res) => {
                const isChairman = res.role === 'chairman' || res.isChairman;
                const isAdmin = res.role === 'admin' || res.isAdmin;
                const currentRole: UserRole = res.role || (isAdmin ? 'admin' : isChairman ? 'chairman' : 'member');

                return (
                  <div key={res.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#2c3e2d] truncate flex items-center gap-1.5">
                        <span>{res.fullName}</span>
                        {res.id === currentUser.id && (
                          <span className="text-[10px] bg-[#e9eddf] text-[#2d4a22] px-1.5 py-0.2 rounded font-bold">
                            Вы
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#7a8c71]">
                        {res.streetNumber} • участок №{res.plotNumber}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isUserChatBlocked(res) ? (
                        isCurrentUserAdmin ? (
                          <button
                            type="button"
                            onClick={() => {
                              setModalUser(res);
                              setIsModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] font-bold text-[10px] hover:bg-[#ffe4e6] transition flex items-center gap-1 cursor-pointer"
                            title="Садовод заблокирован в чате. Нажмите для управления"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Бан ({getChatBlockDurationText(res)})</span>
                          </button>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] font-bold text-[10px] flex items-center gap-1"
                            title="Садовод заблокирован в чате"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Бан ({getChatBlockDurationText(res)})</span>
                          </span>
                        )
                      ) : (
                        res.id !== currentUser.id && isCurrentUserAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalUser(res);
                              setIsModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded-lg text-[#be123c] hover:bg-[#fff1f2] border border-transparent hover:border-[#fecdd3] text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Заблокировать в чатах СНТ"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Бан</span>
                          </button>
                        )
                      )}

                      {isCurrentUserAdmin ? (
                        <select
                          value={currentRole}
                          onChange={(e) =>
                            onUpdateResidentRole &&
                            onUpdateResidentRole(res.id, e.target.value as UserRole)
                          }
                          className="px-2.5 py-1 text-xs rounded-xl border border-[#8ba888] bg-white text-[#2c3e2d] font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="member">Член СНТ</option>
                          <option value="chairman">Председатель</option>
                          <option value="admin">Администратор</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 text-xs rounded-xl border border-[#dce3d5] bg-[#f0f4ec] text-[#2c3e2d] font-semibold">
                          {currentRole === 'chairman'
                            ? 'Председатель'
                            : currentRole === 'admin'
                            ? 'Администратор'
                            : 'Член СНТ'}
                        </span>
                      )}

                      {isCurrentUserAdmin && res.id !== currentUser.id && onDeleteResident && (
                        <button
                          id={`btn-admin-studio-delete-resident-${res.id}`}
                          type="button"
                          onClick={() => setResidentToDelete(res)}
                          className="p-1 rounded-lg text-[#e11d48] hover:bg-[#fff1f2] border border-transparent hover:border-[#fecdd3] transition cursor-pointer"
                          title="Удалить садовода из базы данных"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. CHAT MODERATION & USER BLOCKING */}
          <div className="p-4 rounded-2xl bg-[#fcfdfa] border border-[#dce3d5] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e6ebe0] pb-2.5">
              <div>
                <div className="font-bold text-xs sm:text-sm text-[#2c3e2d] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#be123c]" />
                  <span>Модерация и блокировки в чатах СНТ</span>
                </div>
                <p className="text-xs text-[#5a6b52] mt-0.5">
                  Блокировка возможности писать сообщения и ставить реакции на определенный срок или бессрочно
                </p>
              </div>

              {(() => {
                const blockedResidents = residents.filter((r) => isUserChatBlocked(r));
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      blockedResidents.length > 0
                        ? 'bg-[#fff1f2] text-[#9f1239] border border-[#fecdd3]'
                        : 'bg-[#f4f7f1] text-[#7a8c71] border border-[#dce3d5]'
                    }`}
                  >
                    Заблокировано садоводов: {blockedResidents.length}
                  </span>
                );
              })()}
            </div>

            {/* Quick Block Resident Selector */}
            {!isCurrentUserAdmin ? (
              <div className="p-3 rounded-xl bg-[#f4f7f1] border border-[#dce3d5] text-xs text-[#7a8c71] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#7a8c71] shrink-0" />
                <span>Блокировка садоводов в чатах СНТ доступна исключительно Администратору.</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-xl bg-white border border-[#e6ebe0]">
                <span className="text-xs font-semibold text-[#2c3e2d] shrink-0">
                  Заблокировать садовода:
                </span>
                <select
                  value={adminSelectBlockUser}
                  onChange={(e) => setAdminSelectBlockUser(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                >
                  <option value="">-- Выберите садовода из списка --</option>
                  {residents
                    .filter((r) => r.id !== currentUser.id)
                    .map((r) => {
                      const blocked = isUserChatBlocked(r);
                      return (
                        <option key={r.id} value={r.id}>
                          {r.fullName} ({formatStreetName(r.streetNumber)}, уч. {r.plotNumber}){' '}
                          {blocked ? '⛔ [Уже заблокирован]' : ''}
                        </option>
                      );
                    })}
                </select>
                <button
                  type="button"
                  disabled={!adminSelectBlockUser}
                  onClick={() => {
                    const target = residents.find((r) => r.id === adminSelectBlockUser);
                    if (target) {
                      setModalUser(target);
                      setIsModalOpen(true);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#be123c] text-white hover:bg-[#9f1239] disabled:opacity-40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Настроить блокировку</span>
                </button>
              </div>
            )}

            {/* Currently Blocked Residents List */}
            {(() => {
              const blockedResidents = residents.filter((r) => isUserChatBlocked(r));
              if (blockedResidents.length === 0) {
                return (
                  <div className="p-4 rounded-xl bg-[#f4f7f1]/60 border border-[#dce3d5] text-center text-xs text-[#7a8c71]">
                    Все садоводы имеют право писать в чатах. Активных блокировок нет.
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#9f1239] uppercase tracking-wider">
                    Активные блокировки ({blockedResidents.length}):
                  </div>
                  <div className="divide-y divide-[#fecdd3]/60 rounded-xl border border-[#fecdd3] bg-[#fff1f2]/40 overflow-hidden">
                    {blockedResidents.map((res) => {
                      const isIndefinite =
                        !res.chatBlockUntil || res.chatBlockUntil === 'indefinite';
                      const untilDate = !isIndefinite
                        ? new Date(res.chatBlockUntil as string)
                        : null;

                      return (
                        <div
                          key={res.id}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white/70"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="font-bold text-[#2c3e2d] flex items-center gap-2">
                              <span>{res.fullName}</span>
                              <span className="text-[11px] text-[#7a8c71] font-normal">
                                ({formatStreetName(res.streetNumber)}, уч. {res.plotNumber})
                              </span>
                            </div>

                            <div className="text-xs text-[#be123c] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="font-semibold">
                                Срок: {getChatBlockDurationText(res)}
                              </span>
                              {untilDate && (
                                <span className="text-[#9f1239]/80 text-[11px]">
                                  (до {untilDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })})
                                </span>
                              )}
                            </div>

                            {res.chatBlockReason && (
                              <div className="text-[11px] text-[#78350f] bg-amber-50/80 px-2 py-1 rounded border border-amber-200/60 inline-block">
                                <span className="font-semibold">Причина: </span>
                                {res.chatBlockReason}
                              </div>
                            )}
                          </div>

                          {isCurrentUserAdmin && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setModalUser(res);
                                  setIsModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-[#dce3d5] text-[#2c3e2d] hover:bg-[#f4f7f1] transition cursor-pointer"
                              >
                                Изменить срок
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (onUpdateChatBlock) {
                                    await onUpdateChatBlock(res.id, false);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#2d4a22] text-white hover:bg-[#3a5d2b] transition cursor-pointer shadow-2xs"
                              >
                                Разблокировать
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Chat Unread Badge Diagnostics & Testing */}
          <div className="p-4 rounded-2xl bg-[#fcfdfa] border border-[#dce3d5] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e6ebe0] pb-2.5">
              <div>
                <div className="font-bold text-xs sm:text-sm text-[#2c3e2d] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#2d4a22]" />
                  <span>Индикатор новых сообщений чата (Badge)</span>
                </div>
                <p className="text-xs text-[#5a6b52] mt-0.5">
                  Показывает количество непрочитанных сообщений по метке времени последнего посещения
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5c4033]">Статус:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    unreadChatCount > 0
                      ? 'bg-[#2d4a22] text-white animate-pulse'
                      : 'bg-[#f4f7f1] text-[#7a8c71] border border-[#dce3d5]'
                  }`}
                >
                  {unreadChatCount > 0 ? `Горит бейдж: +${unreadChatCount}` : 'Все прочитано (0)'}
                </span>
              </div>
            </div>

            <div className="text-xs text-[#5a6b52] space-y-1">
              <div>
                <span className="font-semibold text-[#2c3e2d]">Метка последнего посещения чата: </span>
                <span className="font-mono bg-[#f4f7f1] px-1.5 py-0.5 rounded border border-[#dce3d5]">
                  {lastChatVisitTimestamp
                    ? new Date(lastChatVisitTimestamp).toLocaleString('ru-RU')
                    : 'Метка отсутствует (все сообщения считаются непрочитанными)'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onSimulateNeighborMessage && (
                <button
                  type="button"
                  onClick={onSimulateNeighborMessage}
                  className="px-3 py-1.5 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Отправить смоделированное сообщение в чат для проверки индикатора"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Смоделировать сообщение соседа (+1 к бейджу)</span>
                </button>
              )}

              {onSetLastChatVisitTimestamp && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
                      onSetLastChatVisitTimestamp(twoHoursAgo);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#f4f7f1] hover:bg-[#e9eddf] text-[#2d4a22] text-xs font-semibold border border-[#dce3d5] transition cursor-pointer"
                    title="Установить метку визита на 2 часа назад, чтобы протестировать бейдж на существующих сообщениях"
                  >
                    Сбросить визит на 2 ч назад (тест)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date().toISOString();
                      onSetLastChatVisitTimestamp(now);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#f4f7f1] hover:bg-[#e9eddf] text-[#5a6b52] text-xs font-semibold border border-[#dce3d5] transition cursor-pointer"
                    title="Пометить все сообщения чата прочитанными прямо сейчас"
                  >
                    Пометить всё прочитанным
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Backup Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl border border-[#dce3d5] bg-white space-y-2">
              <div className="font-bold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[#2d4a22]" />
                <span>Экспорт конфигурации (JSON)</span>
              </div>
              <p className="text-xs text-[#5a6b52]">
                Сохранить все настройки, тексты, блоки и разделы в файл на устройство.
              </p>
              <button
                type="button"
                onClick={handleExportConfigJson}
                className="w-full py-2 px-3 rounded-xl bg-[#f4f7f1] hover:bg-[#e9eddf] text-xs font-bold text-[#2d4a22] border border-[#dce3d5] transition cursor-pointer"
              >
                Скачать snt-config.json
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-[#dce3d5] bg-white space-y-2">
              <div className="font-bold text-xs text-[#2c3e2d] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#2d4a22]" />
                <span>Импорт конфигурации (JSON)</span>
              </div>
              <p className="text-xs text-[#5a6b52]">
                Загрузить сохраненную конфигурацию приложения из файла.
              </p>
              <label className="w-full py-2 px-3 rounded-xl bg-[#f4f7f1] hover:bg-[#e9eddf] text-xs font-bold text-[#2d4a22] border border-[#dce3d5] transition cursor-pointer block text-center">
                <span>Выбрать файл JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportConfigJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 5. CHAT TOPICS TAB */}
      {activeSubTab === 'topics' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e6ebe0] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f4ec] pb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#2c3e2d] flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#2d4a22]" />
                <span>Управление темами чата сообщества</span>
              </h3>
              <p className="text-xs text-[#5a6b52]">
                Настройте названия каналов, удаляйте неактуальные или добавляйте новые темы для жителей
              </p>
            </div>
            {confirmResetTopics ? (
              <div className="flex items-center gap-1.5 bg-[#fef3c7] px-2.5 py-1 rounded-xl border border-[#fde68a]">
                <span className="text-xs text-[#92400e] font-semibold">Сбросить темы к стандартным?</span>
                <button
                  type="button"
                  onClick={() => {
                    const newConfig = { ...localConfig, chatTopics: DEFAULT_CHAT_TOPICS };
                    setLocalConfig(newConfig);
                    onSaveConfig(newConfig);
                    setConfirmResetTopics(false);
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 2500);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[#d97706] text-white text-xs font-bold hover:bg-[#b45309] transition cursor-pointer"
                >
                  Да, сбросить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetTopics(false)}
                  className="px-2 py-0.5 rounded-lg bg-white text-[#5a6b52] text-xs font-medium hover:bg-[#f4f7f1] transition cursor-pointer border border-[#dce3d5]"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResetTopics(true)}
                className="text-xs text-[#7a8c71] hover:text-[#5c4033] flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить темы к стандартным</span>
              </button>
            )}
          </div>

          {topicError && (
            <div className="p-3 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#9f1239] text-xs">
              {topicError}
            </div>
          )}

          {/* Current topics list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5c4033] uppercase tracking-wider">
                Существующие темы ({(localConfig.chatTopics || DEFAULT_CHAT_TOPICS).length})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(localConfig.chatTopics || DEFAULT_CHAT_TOPICS).map((topic) => {
                const isEditing = editingTopicId === topic.id;

                return (
                  <div
                    key={topic.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      isEditing
                        ? 'bg-[#f4f7f1] border-[#8ba888] ring-2 ring-[#8ba888]/20'
                        : 'bg-white border-[#dce3d5] hover:border-[#8ba888]'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTopicIcon}
                            onChange={(e) => setEditingTopicIcon(e.target.value)}
                            className="w-10 text-center px-2 py-1.5 text-base rounded-xl border border-[#dce3d5] bg-white"
                            title="Значок"
                          />
                          <input
                            type="text"
                            value={editingTopicTitle}
                            onChange={(e) => setEditingTopicTitle(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                            placeholder="Название темы"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (!editingTopicTitle.trim()) return;
                                const updated = (localConfig.chatTopics || DEFAULT_CHAT_TOPICS).map((t) =>
                                  t.id === topic.id
                                    ? { ...t, label: editingTopicTitle.trim(), icon: editingTopicIcon || '💬' }
                                    : t
                                );
                                const newConfig = { ...localConfig, chatTopics: updated };
                                setLocalConfig(newConfig);
                                onSaveConfig(newConfig);
                                setEditingTopicId(null);
                              }
                              if (e.key === 'Escape') setEditingTopicId(null);
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingTopicId(null)}
                            className="px-2.5 py-1 text-xs rounded-lg text-[#5a6b52] hover:bg-[#e9eddf] transition"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingTopicTitle.trim()) {
                                setTopicError('Название темы не может быть пустым');
                                return;
                              }
                              const updated = (localConfig.chatTopics || DEFAULT_CHAT_TOPICS).map((t) =>
                                t.id === topic.id
                                  ? { ...t, label: editingTopicTitle.trim(), icon: editingTopicIcon || '💬' }
                                  : t
                              );
                              const newConfig = { ...localConfig, chatTopics: updated };
                              setLocalConfig(newConfig);
                              onSaveConfig(newConfig);
                              setEditingTopicId(null);
                              setTopicError(null);
                            }}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#2d4a22] text-white hover:bg-[#3a5d2b] transition flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Применить</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl shrink-0">{topic.icon}</span>
                          <div className="truncate">
                            <span className="text-sm font-bold text-[#2c3e2d] block truncate">
                              {topic.label}
                            </span>
                            <span className="text-[10px] text-[#7a8c71]">ID: {topic.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTopicId(topic.id);
                              setEditingTopicTitle(topic.label);
                              setEditingTopicIcon(topic.icon);
                              setConfirmDeleteTopicId(null);
                              setTopicError(null);
                            }}
                            className="p-1.5 rounded-lg text-[#5a6b52] hover:text-[#2d4a22] hover:bg-[#e9eddf] transition"
                            title="Переименовать тему"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {confirmDeleteTopicId === topic.id ? (
                            <div className="flex items-center gap-1 bg-[#fee2e2] px-2 py-1 rounded-xl border border-[#fca5a5]">
                              <span className="text-[11px] font-bold text-[#b91c1c]">Удалить?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentList = localConfig.chatTopics || DEFAULT_CHAT_TOPICS;
                                  if (currentList.length <= 1) {
                                    setTopicError('В чате должна оставаться как минимум одна тема');
                                    setConfirmDeleteTopicId(null);
                                    return;
                                  }
                                  const updated = currentList.filter((t) => t.id !== topic.id);
                                  const newConfig = { ...localConfig, chatTopics: updated };
                                  setLocalConfig(newConfig);
                                  onSaveConfig(newConfig);
                                  setConfirmDeleteTopicId(null);
                                  setTopicError(null);
                                  setSaveSuccess(true);
                                  setTimeout(() => setSaveSuccess(false), 2500);
                                }}
                                className="px-2 py-0.5 rounded-lg bg-[#dc2626] text-white text-[11px] font-bold hover:bg-[#b91c1c] transition cursor-pointer shadow-2xs"
                              >
                                Да
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTopicId(null)}
                                className="px-1.5 py-0.5 rounded-lg bg-white text-[#5a6b52] text-[11px] font-medium hover:bg-[#f4f7f1] transition cursor-pointer border border-[#e5e7eb]"
                              >
                                Нет
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const currentList = localConfig.chatTopics || DEFAULT_CHAT_TOPICS;
                                if (currentList.length <= 1) {
                                  setTopicError('В чате должна оставаться как минимум одна тема');
                                  return;
                                }
                                setConfirmDeleteTopicId(topic.id);
                                setTopicError(null);
                              }}
                              className="p-1.5 rounded-lg text-[#b91c1c] hover:bg-[#fee2e2] transition cursor-pointer"
                              title="Удалить тему"
                              disabled={(localConfig.chatTopics || DEFAULT_CHAT_TOPICS).length <= 1}
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Form to add new topic */}
          <div className="p-4 rounded-2xl bg-[#fcfdfa] border border-[#dce3d5] space-y-3">
            <div className="font-bold text-xs sm:text-sm text-[#2c3e2d] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2d4a22]" />
              <span>Создать новую тему чата</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newTopicTitle.trim();
                if (!trimmed) {
                  setTopicError('Введите название новой темы');
                  return;
                }
                const currentList = localConfig.chatTopics || DEFAULT_CHAT_TOPICS;
                const uniqueId = `topic-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
                const newTopic: ChatTopicConfig = {
                  id: uniqueId,
                  label: trimmed,
                  icon: newTopicIcon.trim() || '💬',
                };
                const updated = [...currentList, newTopic];
                setLocalConfig((prev) => ({ ...prev, chatTopics: updated }));
                onSaveConfig({ ...localConfig, chatTopics: updated });
                setNewTopicTitle('');
                setNewTopicIcon('💬');
                setTopicError(null);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2500);
              }}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTopicIcon}
                    onChange={(e) => setNewTopicIcon(e.target.value)}
                    className="w-12 text-center px-2 py-2 text-lg rounded-xl border border-[#dce3d5] bg-white"
                    title="Эмодзи или значок темы"
                    placeholder="💬"
                  />
                  <input
                    type="text"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    placeholder="Название темы (напр. Газификация, Охрана, Детская площадка)"
                    className="flex-1 min-w-[200px] px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newTopicTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-[#2d4a22] text-white hover:bg-[#3a5d2b] disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить тему</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-[#7a8c71] mr-1">Быстрый выбор:</span>
                {[
                  { label: 'Газификация', icon: '🔥' },
                  { label: 'Субботники', icon: '🧹' },
                  { label: 'Питомцы', icon: '🐕' },
                  { label: 'Строительство', icon: '🏗️' },
                  { label: 'Детская площадка', icon: '🎉' },
                  { label: 'Мусор и чистота', icon: '♻️' },
                  { label: 'Озеленение', icon: '🌲' },
                ].map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => {
                      setNewTopicTitle(tmpl.label);
                      setNewTopicIcon(tmpl.icon);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[#e9eddf] text-[#5c4033] hover:bg-[#dce3d5] transition flex items-center gap-1"
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.label}</span>
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Chat Block Modal */}
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

      {/* Delete Resident Confirmation Modal */}
      {residentToDelete && (
        <div
          id="modal-admin-delete-resident-backdrop"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            id="modal-admin-delete-resident-dialog"
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
                  {residentToDelete.streetNumber}, уч. {residentToDelete.plotNumber}) будет удалён из списка жителей и базы данных СНТ.
                </p>
                <p className="text-[11px] text-[#be123c] mt-2 bg-[#fff1f2] p-2 rounded-xl border border-[#fecdd3]">
                  Это действие невозможно отменить. Пользователь потеряет доступ к приложению.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e6ebe0]">
              <button
                type="button"
                disabled={isDeletingResident}
                onClick={() => setResidentToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#dce3d5] text-xs font-semibold text-[#5a6b52] hover:bg-[#f4f7f1] transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isDeletingResident}
                onClick={async () => {
                  if (onDeleteResident && residentToDelete) {
                    setIsDeletingResident(true);
                    try {
                      await onDeleteResident(residentToDelete.id);
                    } finally {
                      setIsDeletingResident(false);
                      setResidentToDelete(null);
                    }
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>{isDeletingResident ? 'Удаление...' : 'Да, удалить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
