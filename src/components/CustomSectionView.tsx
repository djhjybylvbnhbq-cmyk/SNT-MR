import React, { useState, useEffect } from 'react';
import {
  Phone,
  Droplets,
  Clock,
  AlertTriangle,
  Info,
  Search,
  Plus,
  X,
  PlusCircle,
  Pencil,
  Trash2,
  Check,
  Palette,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
} from 'lucide-react';
import { AppSectionConfig, AppBlockConfig, User, CustomContentItem } from '../types';

interface CustomSectionViewProps {
  section: AppSectionConfig;
  blocks: AppBlockConfig[];
  currentUser: User;
  onOpenAdmin?: () => void;
  onAddBlock?: (block: AppBlockConfig) => void;
  onUpdateBlock?: (block: AppBlockConfig) => void;
  onDeleteBlock?: (blockId: string) => void;
  onReorderBlocks?: (reorderedBlocks: AppBlockConfig[]) => void;
  onMigrateLegacyItems?: (migratedBlocks: AppBlockConfig[], sectionId: string) => void;
  onAddContentItem?: (sectionId: string, item: CustomContentItem) => void;
}

const AVAILABLE_ICONS = [
  { id: 'Info', label: 'Инфо', icon: Info },
  { id: 'Phone', label: 'Телефон', icon: Phone },
  { id: 'Droplets', label: 'Вода', icon: Droplets },
  { id: 'Clock', label: 'Часы / Режим', icon: Clock },
  { id: 'AlertTriangle', label: 'Внимание', icon: AlertTriangle },
];

const AVAILABLE_COLORS: { id: AppBlockConfig['accentColor']; label: string; class: string }[] = [
  { id: 'emerald', label: 'Зеленый', class: 'bg-[#f4f7f1] border-[#dce3d5] text-[#2c3e2d]' },
  { id: 'sky', label: 'Голубой', class: 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]' },
  { id: 'amber', label: 'Янтарный', class: 'bg-[#fffbeb] border-[#fde68a] text-[#78350f]' },
  { id: 'rose', label: 'Розовый', class: 'bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]' },
  { id: 'slate', label: 'Серый', class: 'bg-[#f8fafc] border-[#e2e8f0] text-[#334155]' },
];

export const CustomSectionView: React.FC<CustomSectionViewProps> = ({
  section,
  blocks,
  currentUser,
  onOpenAdmin,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
  onMigrateLegacyItems,
}) => {
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AppBlockConfig | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<AppBlockConfig | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIcon, setFormIcon] = useState('Info');
  const [formColor, setFormColor] = useState<AppBlockConfig['accentColor']>('emerald');
  const [error, setError] = useState('');

  const canManageBlocks = Boolean(
    currentUser.isAdmin ||
    currentUser.isChairman ||
    currentUser.role === 'admin' ||
    currentUser.role === 'chairman'
  );

  const isInfoStand = section.id === 'info';

  // Filter and sort blocks for this section by order
  // 'info' uses legacy 'dashboard' and 'info' blocks, whereas any custom section uses exclusively its own section.id
  const sectionBlocks = blocks
    .filter(
      (b) => b.enabled && (isInfoStand ? (b.section === 'dashboard' || b.section === 'info') : b.section === section.id)
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Automatic migration of any legacy customContent.items into blocks so all items are unified
  useEffect(() => {
    if (section.customContent?.items && section.customContent.items.length > 0 && onMigrateLegacyItems) {
      const legacyItems = section.customContent.items;
      const targetSection = isInfoStand ? 'dashboard' : section.id;
      const convertedBlocks: AppBlockConfig[] = legacyItems.map((item, idx) => ({
        id: item.id.startsWith('block-') ? item.id : `block-${item.id}`,
        section: targetSection,
        title: item.title,
        content: item.text + (item.linkOrPhone ? `\n${item.linkOrPhone}` : ''),
        badge: item.badge || 'ИНФО',
        type: 'card',
        icon: item.linkOrPhone ? 'Phone' : 'Info',
        enabled: true,
        order: sectionBlocks.length + idx + 1,
        accentColor: 'emerald',
      }));
      onMigrateLegacyItems(convertedBlocks, section.id);
    }
  }, [section.id, isInfoStand, section.customContent?.items, onMigrateLegacyItems, sectionBlocks.length]);

  // Open modal for adding
  const handleOpenAddModal = () => {
    setError('');
    setFormTitle('');
    setFormBadge(isInfoStand ? 'ИНФО' : '');
    setFormContent('');
    setFormIcon('Info');
    setFormColor('emerald');
    setIsAddModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (blk: AppBlockConfig) => {
    setError('');
    setFormTitle(blk.title);
    setFormBadge(blk.badge || '');
    setFormContent(blk.content);
    setFormIcon(blk.icon || 'Info');
    setFormColor(blk.accentColor || 'emerald');
    setEditingBlock(blk);
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formTitle.trim()) {
      setError('Укажите заголовок блока');
      return;
    }
    if (!formContent.trim()) {
      setError('Укажите содержимое блока');
      return;
    }

    const targetSection = isInfoStand ? 'dashboard' : section.id;

    const newBlock: AppBlockConfig = {
      id: `block-${Date.now()}`,
      section: targetSection,
      title: formTitle.trim(),
      content: formContent.trim(),
      badge: formBadge.trim() || undefined,
      type: 'card',
      icon: formIcon,
      enabled: true,
      order: sectionBlocks.length + 1,
      accentColor: formColor,
    };

    if (onAddBlock) {
      onAddBlock(newBlock);
    }
    setIsAddModalOpen(false);
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;
    setError('');

    if (!formTitle.trim()) {
      setError('Укажите заголовок блока');
      return;
    }
    if (!formContent.trim()) {
      setError('Укажите содержимое блока');
      return;
    }

    const updatedBlock: AppBlockConfig = {
      ...editingBlock,
      title: formTitle.trim(),
      content: formContent.trim(),
      badge: formBadge.trim() || undefined,
      icon: formIcon,
      accentColor: formColor,
    };

    if (onUpdateBlock) {
      onUpdateBlock(updatedBlock);
    }
    setEditingBlock(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!blockToDelete) return;
    if (onDeleteBlock) {
      onDeleteBlock(blockToDelete.id);
    }
    setBlockToDelete(null);
  };

  // Move block up or down
  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const list = [...sectionBlocks];
    const currentIndex = list.findIndex((b) => b.id === blockId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;

    const updatedSectionBlocks = list.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    if (onReorderBlocks) {
      const updatedMap = new Map(updatedSectionBlocks.map((item) => [item.id, item]));
      const newAllBlocks = blocks.map((b) => updatedMap.get(b.id) || b);
      onReorderBlocks(newAllBlocks);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!canManageBlocks) return;
    setDraggedBlockId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!canManageBlocks || !draggedBlockId || draggedBlockId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverBlockId !== id) {
      setDragOverBlockId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverBlockId(null);
    if (!canManageBlocks || !draggedBlockId || draggedBlockId === targetId) {
      setDraggedBlockId(null);
      return;
    }

    const list = [...sectionBlocks];
    const fromIndex = list.findIndex((b) => b.id === draggedBlockId);
    const toIndex = list.findIndex((b) => b.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);

      const updatedSectionBlocks = list.map((item, idx) => ({
        ...item,
        order: idx + 1,
      }));

      if (onReorderBlocks) {
        const updatedMap = new Map(updatedSectionBlocks.map((item) => [item.id, item]));
        const newAllBlocks = blocks.map((b) => updatedMap.get(b.id) || b);
        onReorderBlocks(newAllBlocks);
      }
    }
    setDraggedBlockId(null);
  };

  const handleDragLeave = () => {
    setDragOverBlockId(null);
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const filteredBlocks = sectionBlocks.filter((blk) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      blk.title.toLowerCase().includes(q) ||
      blk.content.toLowerCase().includes(q) ||
      (blk.badge && blk.badge.toLowerCase().includes(q))
    );
  });

  const renderIcon = (iconName?: string, colorClass: string = 'text-[#2d4a22]') => {
    switch (iconName) {
      case 'Phone':
        return <Phone className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      case 'Droplets':
        return <Droplets className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      case 'Clock':
        return <Clock className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      case 'AlertTriangle':
        return <AlertTriangle className={`w-4 h-4 shrink-0 ${colorClass}`} />;
      default:
        return <Info className={`w-4 h-4 shrink-0 ${colorClass}`} />;
    }
  };

  const getColorStyles = (color?: string) => {
    switch (color) {
      case 'amber':
        return {
          bgClass: 'bg-[#fffbeb] border-[#fde68a] text-[#78350f]',
          badgeBg: 'bg-[#fef3c7] text-[#92400e]',
          iconColor: 'text-[#b45309]',
          btnHover: 'hover:bg-[#fde68a]/50',
        };
      case 'sky':
        return {
          bgClass: 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]',
          badgeBg: 'bg-[#e0f2fe] text-[#0284c7]',
          iconColor: 'text-[#0284c7]',
          btnHover: 'hover:bg-[#bae6fd]/50',
        };
      case 'rose':
        return {
          bgClass: 'bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]',
          badgeBg: 'bg-[#ffe4e6] text-[#be123c]',
          iconColor: 'text-[#e11d48]',
          btnHover: 'hover:bg-[#fecdd3]/50',
        };
      case 'slate':
        return {
          bgClass: 'bg-[#f8fafc] border-[#e2e8f0] text-[#334155]',
          badgeBg: 'bg-[#f1f5f9] text-[#475569]',
          iconColor: 'text-[#475569]',
          btnHover: 'hover:bg-[#e2e8f0]/50',
        };
      case 'emerald':
      default:
        return {
          bgClass: 'bg-[#f4f7f1] border-[#dce3d5] text-[#2c3e2d]',
          badgeBg: 'bg-[#e9eddf] text-[#2d4a22]',
          iconColor: 'text-[#2d4a22]',
          btnHover: 'hover:bg-[#dce3d5]/50',
        };
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* Section Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#e6ebe0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2d4a22]" />
            <h2 className="text-base sm:text-lg font-bold text-[#2c3e2d]">
              {section.customContent?.title || section.label}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#5a6b52] mt-0.5">
            {section.customContent?.description || section.subtitle || 'Информационный раздел СНТ'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {canManageBlocks && sectionBlocks.length > 1 && (
            <button
              type="button"
              id="btn-reorder-info-blocks"
              onClick={() => setIsReorderModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dce3d5] bg-[#f7f9f6] hover:bg-[#eef3ea] text-[#2d4a22] text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Настроить последовательность отображения блоков"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5a6b52]" />
              <span>Порядок блоков</span>
            </button>
          )}

          {canManageBlocks && (
            <button
              type="button"
              id="btn-add-info-stand-item"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] active:bg-[#223a1a] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              title={isInfoStand ? 'Добавить новый информационный блок на стенд' : 'Добавить новый блок в этот раздел'}
            >
              <Plus className="w-3.5 h-3.5 text-[#a2d1a2]" />
              <span>{isInfoStand ? 'Добавить на стенд' : 'Добавить блок'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input for blocks */}
      {sectionBlocks.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7a8c71]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по информационным блокам..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[#dce3d5] bg-white text-[#2c3e2d] placeholder-[#7a8c71] focus:outline-none focus:border-[#8ba888]"
          />
        </div>
      )}

      {/* 2-Column Uniform Blocks Grid (all blocks in the same style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredBlocks.map((blk) => {
          const { bgClass, badgeBg, iconColor, btnHover } = getColorStyles(blk.accentColor);
          const fullIndex = sectionBlocks.findIndex((b) => b.id === blk.id);
          const isFirst = fullIndex === 0;
          const isLast = fullIndex === sectionBlocks.length - 1;

          return (
            <div
              key={blk.id}
              draggable={canManageBlocks && !search.trim()}
              onDragStart={(e) => handleDragStart(e, blk.id)}
              onDragOver={(e) => handleDragOver(e, blk.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, blk.id)}
              onDragEnd={handleDragEnd}
              className={`p-4 rounded-2xl border ${bgClass} shadow-2xs space-y-2 flex flex-col justify-between group transition ${
                draggedBlockId === blk.id ? 'opacity-40 scale-[0.98]' : ''
              } ${
                dragOverBlockId === blk.id
                  ? 'ring-2 ring-[#4a7c39] border-transparent scale-[1.01]'
                  : 'hover:border-[#8ba888]/80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-sm min-w-0">
                    {canManageBlocks && !search.trim() && (
                      <span
                        className="text-[#9ab190] hover:text-[#2d4a22] cursor-grab active:cursor-grabbing p-0.5 -ml-1 transition shrink-0"
                        title="Перетащите блок мышью для изменения порядка"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {renderIcon(blk.icon, iconColor)}
                    <span className="leading-snug break-words">{blk.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {blk.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeBg}`}>
                        {blk.badge}
                      </span>
                    )}

                    {canManageBlocks && (
                      <div className="flex items-center gap-0.5 ml-1">
                        {/* Кнопка перемещения выше / раньше */}
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(blk.id, 'up')}
                          disabled={isFirst}
                          className={`p-1 rounded-md transition cursor-pointer ${
                            isFirst
                              ? 'text-[#dce3d5] cursor-not-allowed opacity-30'
                              : `text-[#5a6b52] hover:text-[#2d4a22] ${btnHover}`
                          }`}
                          title="Переместить выше (раньше)"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Кнопка перемещения ниже / позже */}
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(blk.id, 'down')}
                          disabled={isLast}
                          className={`p-1 rounded-md transition cursor-pointer ${
                            isLast
                              ? 'text-[#dce3d5] cursor-not-allowed opacity-30'
                              : `text-[#5a6b52] hover:text-[#2d4a22] ${btnHover}`
                          }`}
                          title="Переместить ниже (позже)"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(blk)}
                          className={`p-1 rounded-md text-[#5a6b52] hover:text-[#2d4a22] ${btnHover} transition cursor-pointer`}
                          title="Редактировать блок"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlockToDelete(blk)}
                          className="p-1 rounded-md text-[#7a8c71] hover:text-[#9f1239] hover:bg-[#fee2e2] transition cursor-pointer"
                          title="Удалить блок"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs leading-relaxed opacity-90 mt-2 whitespace-pre-line break-words">
                  {blk.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBlocks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#dce3d5] p-6 text-[#7a8c71] text-xs">
          {search
            ? 'Ничего не найдено по вашему запросу.'
            : isInfoStand
            ? 'На информационном стенде пока нет добавленных блоков.'
            : 'В этом разделе пока нет добавленных блоков. Нажмите «+ Добавить блок», чтобы разместить информацию.'}
        </div>
      )}

      {/* Modal: Add or Edit Block */}
      {(isAddModalOpen || Boolean(editingBlock)) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-[#dce3d5] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f0f2ec] pb-3">
              <div className="flex items-center gap-2">
                {editingBlock ? (
                  <Pencil className="w-5 h-5 text-[#2d4a22]" />
                ) : (
                  <PlusCircle className="w-5 h-5 text-[#2d4a22]" />
                )}
                <h3 className="font-bold text-sm sm:text-base text-[#2c3e2d]">
                  {editingBlock
                    ? (isInfoStand ? 'Редактировать блок стенда' : 'Редактировать блок раздела')
                    : (isInfoStand ? 'Добавить блок на стенд' : 'Добавить блок в раздел')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingBlock(null);
                }}
                className="text-[#7a8c71] hover:text-[#2c3e2d] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-[#fef2f2] border border-[#fecdd3] text-[#9f1239] rounded-xl text-xs">
                {error}
              </div>
            )}

            <form
              onSubmit={editingBlock ? handleEditSubmit : handleAddSubmit}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Заголовок блока <span className="text-[#9f1239]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Напр. График работы правления или Магазин"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888] text-[#2c3e2d]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Бейдж / метка в углу (опционально)
                </label>
                <input
                  type="text"
                  placeholder="Напр. ИНФО, ВОДА, РАСПИСАНИЕ, ТЕЛЕФОНЫ"
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888] text-[#2c3e2d]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#5c4033] mb-1">
                  Текст / информация блока <span className="text-[#9f1239]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Укажите текст, расписание, контакты или условия..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888] text-[#2c3e2d]"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block font-semibold text-[#5c4033] mb-1.5">
                  Иконка блока
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_ICONS.map((ic) => {
                    const IconComp = ic.icon;
                    const isSelected = formIcon === ic.id;
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setFormIcon(ic.id)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#2d4a22] text-white border-[#2d4a22] shadow-2xs'
                            : 'bg-white text-[#5a6b52] border-[#dce3d5] hover:bg-[#f4f7f1]'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block font-semibold text-[#5c4033] mb-1.5">
                  Цветовой стиль карточки
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_COLORS.map((col) => {
                    const isSelected = formColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setFormColor(col.id)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${col.class} ${
                          isSelected ? 'ring-2 ring-[#2d4a22] font-bold shadow-2xs' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-[#2d4a22]" />}
                        <span>{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-[#f0f2ec]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingBlock(null);
                  }}
                  className="px-4 py-2 rounded-xl text-[#7a8c71] hover:bg-[#f4f7f1] cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2d4a22] hover:bg-[#3a5d2b] active:bg-[#223a1a] text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {editingBlock ? (
                    <>
                      <Check className="w-4 h-4 text-[#a2d1a2]" />
                      <span>Сохранить изменения</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 text-[#a2d1a2]" />
                      <span>Добавить блок</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {blockToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-[#dce3d5] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#fee2e2] text-[#9f1239] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#2c3e2d]">Удалить блок?</h3>
                <p className="text-xs text-[#7a8c71] mt-0.5 line-clamp-2">
                  «{blockToDelete.title}» будет удален {isInfoStand ? 'со стенда СНТ' : 'из этого раздела'}.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f2ec]">
              <button
                type="button"
                onClick={() => setBlockToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7a8c71] hover:bg-[#f4f7f1] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#9f1239] hover:bg-[#881337] text-white shadow-xs cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reorder Blocks List */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-[#dce3d5] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#f0f2ec] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-[#2d4a22]" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#2c3e2d]">
                    Порядок информационных блоков
                  </h3>
                  <p className="text-xs text-[#5a6b52]">
                    {isInfoStand ? 'Настройте очередность отображения на стенде' : 'Настройте очередность отображения в разделе'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="p-1 rounded-lg text-[#7a8c71] hover:text-[#2c3e2d] hover:bg-[#f4f7f1] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {sectionBlocks.map((blk, idx) => {
                const { bgClass, badgeBg, iconColor } = getColorStyles(blk.accentColor);
                const isFirst = idx === 0;
                const isLast = idx === sectionBlocks.length - 1;

                return (
                  <div
                    key={blk.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${bgClass} shadow-2xs gap-3`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-white/90 border border-[#dce3d5] flex items-center justify-center text-[11px] font-bold text-[#2d4a22] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {renderIcon(blk.icon, iconColor)}
                        <span className="text-xs sm:text-sm font-semibold truncate">
                          {blk.title}
                        </span>
                      </div>
                      {blk.badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeBg} shrink-0`}>
                          {blk.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveBlock(blk.id, 'up')}
                        disabled={isFirst}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          isFirst
                            ? 'border-transparent text-[#dce3d5] opacity-30 cursor-not-allowed'
                            : 'border-[#dce3d5] bg-white hover:bg-[#eef3ea] text-[#2d4a22]'
                        }`}
                        title="Переместить выше"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Вверх</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveBlock(blk.id, 'down')}
                        disabled={isLast}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          isLast
                            ? 'border-transparent text-[#dce3d5] opacity-30 cursor-not-allowed'
                            : 'border-[#dce3d5] bg-white hover:bg-[#eef3ea] text-[#2d4a22]'
                        }`}
                        title="Переместить ниже"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Вниз</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#f0f2ec] flex items-center justify-between gap-3 text-xs shrink-0">
              <span className="text-[#5a6b52]">
                Изменения сохраняются сразу и обновляются у садоводов.
              </span>
              <button
                type="button"
                onClick={() => setIsReorderModalOpen(false)}
                className="px-4 py-2 bg-[#2d4a22] hover:bg-[#3a5d2b] text-white font-semibold rounded-xl transition cursor-pointer shrink-0"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
