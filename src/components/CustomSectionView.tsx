import React, { useState, useEffect, useRef } from 'react';
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
  Type,
  Tag,
  Eye,
  Sparkles,
  Maximize2,
  Minimize2,
  StretchHorizontal,
} from 'lucide-react';
import { AppSectionConfig, AppBlockConfig, BlockIconConfig, User, CustomContentItem } from '../types';
import { TextStyleToolbar, getTextStyleClass } from './TextStyleToolbar';
import { renderBlockIcon, DEFAULT_BLOCK_ICONS } from '../utils/blockIcons';
import { parseFormattedText, bbcodeToHtml, htmlToBbcode } from '../utils/formattedText';

interface CustomSectionViewProps {
  section: AppSectionConfig;
  blocks: AppBlockConfig[];
  customBlockIcons?: BlockIconConfig[];
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
  customBlockIcons,
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

  // Active list of icons available for blocks (defaults merged with custom icons)
  const availableIcons: BlockIconConfig[] =
    customBlockIcons && customBlockIcons.length > 0 ? customBlockIcons : DEFAULT_BLOCK_ICONS;

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIcon, setFormIcon] = useState('Info');
  const [formColor, setFormColor] = useState<AppBlockConfig['accentColor']>('emerald');
  const [formColSpan, setFormColSpan] = useState<1 | 2>(1);
  const [formFontSize, setFormFontSize] = useState<'xs' | 'sm' | 'base' | 'lg' | 'xl'>('sm');
  const [formIsBold, setFormIsBold] = useState(false);
  const [formIsItalic, setFormIsItalic] = useState(false);
  const [formTextColor, setFormTextColor] = useState('');

  // Title styling states
  const [formTitleFontSize, setFormTitleFontSize] = useState<'xs' | 'sm' | 'base' | 'lg' | 'xl'>('sm');
  const [formTitleBold, setFormTitleBold] = useState(true);
  const [formTitleItalic, setFormTitleItalic] = useState(false);
  const [formTitleColor, setFormTitleColor] = useState('');
  const [showTitleStyleToolbar, setShowTitleStyleToolbar] = useState(false);

  // Badge styling states
  const [formBadgeFontSize, setFormBadgeFontSize] = useState<'xs' | 'sm' | 'base'>('xs');
  const [formBadgeBold, setFormBadgeBold] = useState(true);
  const [formBadgeItalic, setFormBadgeItalic] = useState(false);
  const [formBadgeColor, setFormBadgeColor] = useState('');
  const [formBadgeBgColor, setFormBadgeBgColor] = useState('');
  const [showBadgeStyleToolbar, setShowBadgeStyleToolbar] = useState(false);

  // Content text selection & visual editor
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState('');

  const [error, setError] = useState('');

  // Format selection in visual editor (WYSIWYG)
  const handleFormatContentSelection = (
    type: 'bold' | 'italic' | 'underline' | 'color' | 'size' | 'bg' | 'clear',
    value?: string
  ) => {
    if (!visualEditorRef.current) return;

    let sel = window.getSelection();
    // If browser selection was collapsed/lost when clicking color button, restore savedRangeRef
    if ((!sel || sel.rangeCount === 0 || sel.isCollapsed) && savedRangeRef.current) {
      if (visualEditorRef.current.contains(savedRangeRef.current.commonAncestorContainer)) {
        sel?.removeAllRanges();
        sel?.addRange(savedRangeRef.current);
        sel = window.getSelection();
      }
    }

    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && visualEditorRef.current) {
      const range = sel.getRangeAt(0);
      if (visualEditorRef.current.contains(range.commonAncestorContainer)) {
        if (type === 'bold') {
          document.execCommand('bold', false);
        } else if (type === 'italic') {
          document.execCommand('italic', false);
        } else if (type === 'underline') {
          document.execCommand('underline', false);
        } else if (type === 'clear') {
          document.execCommand('removeFormat', false);
          // Also clear parent span inline color/background if any
          let p: Node | null = range.commonAncestorContainer;
          while (p && p !== visualEditorRef.current) {
            if (p.nodeType === Node.ELEMENT_NODE) {
              const el = p as HTMLElement;
              if (el.tagName.toLowerCase() === 'span') {
                el.style.color = '';
                el.style.backgroundColor = '';
                el.removeAttribute('data-color');
                el.removeAttribute('data-bg');
              }
            }
            p = p.parentNode;
          }
        } else if (type === 'color' && value) {
          document.execCommand('styleWithCSS', false, 'true');
          document.execCommand('foreColor', false, value);
          // If the range was inside an existing span that had an explicit color, update that parent span too
          let p: Node | null = range.commonAncestorContainer;
          while (p && p !== visualEditorRef.current) {
            if (p.nodeType === Node.ELEMENT_NODE) {
              const el = p as HTMLElement;
              if (el.tagName.toLowerCase() === 'span' && (el.style.color || el.getAttribute('data-color'))) {
                el.style.color = value;
                el.removeAttribute('data-color');
              }
            }
            p = p.parentNode;
          }
        } else if (type === 'size' && value) {
          const sizeMap: Record<string, string> = {
            xs: '12px',
            sm: '14px',
            base: '16px',
            lg: '18px',
            xl: '20px',
          };
          const targetPx = sizeMap[value] || '14px';

          try {
            const fragment = range.extractContents();

            // 1. CRITICAL: Strip any existing font-size and data-size from all descendant elements in the fragment
            // so that lines/words that already had a different size (e.g. lg) won't override the new size!
            const allDescendants = fragment.querySelectorAll('*');
            allDescendants.forEach((node) => {
              const el = node as HTMLElement;
              if (el.style) {
                el.style.fontSize = '';
                el.style.lineHeight = '';
              }
              el.removeAttribute('data-size');
              if (el.tagName.toLowerCase() === 'font') {
                el.removeAttribute('size');
              }
            });

            // 2. Unwrap any redundant size spans that now have no styles or attributes left
            fragment.querySelectorAll('span').forEach((s) => {
              const style = s.getAttribute('style')?.trim();
              const hasOtherStyles =
                style &&
                style !== '' &&
                !/^line-height:[^;]+;?$/.test(style);
              const hasOtherAttrs =
                s.getAttribute('data-color') ||
                s.getAttribute('data-bg') ||
                s.getAttribute('class');
              if (!hasOtherStyles && !hasOtherAttrs) {
                const parent = s.parentNode;
                while (s.firstChild) {
                  parent?.insertBefore(s.firstChild, s);
                }
                parent?.removeChild(s);
              }
            });

            // 3. Create the new wrapper span with desired size
            const span = document.createElement('span');
            span.setAttribute('data-size', value);
            span.style.fontSize = targetPx;
            span.style.lineHeight = '1.3';
            span.appendChild(fragment);

            range.insertNode(span);

            // 4. If the insertion was placed inside an existing parent span with data-size or fontSize,
            // clean up or clear that parent span's size so it doesn't conflict
            let p: Node | null = span.parentNode;
            while (p && p !== visualEditorRef.current) {
              if (p.nodeType === Node.ELEMENT_NODE) {
                const el = p as HTMLElement;
                if (el.tagName.toLowerCase() === 'span') {
                  if (el.getAttribute('data-size') || el.style.fontSize) {
                    el.style.fontSize = '';
                    el.removeAttribute('data-size');
                  }
                }
              }
              p = p.parentNode;
            }

            sel.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.addRange(newRange);
          } catch {
            // fallback
          }
        }

        // Keep savedRangeRef updated with current selection
        const updatedSel = window.getSelection();
        if (updatedSel && updatedSel.rangeCount > 0 && !updatedSel.isCollapsed) {
          savedRangeRef.current = updatedSel.getRangeAt(0).cloneRange();
          setSelectedSnippet(updatedSel.toString());
        }

        if (visualEditorRef.current) {
          const updatedBbcode = htmlToBbcode(visualEditorRef.current.innerHTML);
          setFormContent(updatedBbcode);
        }
      }
    }
  };

  const handleVisualInput = () => {
    if (visualEditorRef.current) {
      const newBbcode = htmlToBbcode(visualEditorRef.current.innerHTML);
      setFormContent(newBbcode);
    }
  };

  const handleVisualSelect = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && visualEditorRef.current) {
      const range = sel.getRangeAt(0);
      if (visualEditorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
        const text = sel.toString();
        if (text && text.trim()) {
          setSelectedSnippet(text);
          return;
        }
      }
    }
    setSelectedSnippet('');
  };

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
    setFormBadge('');
    setFormContent('');
    setFormIcon('Info');
    setFormColor('emerald');
    setFormFontSize('sm');
    setFormIsBold(false);
    setFormIsItalic(false);
    setFormTextColor('');

    setFormTitleFontSize('sm');
    setFormTitleBold(true);
    setFormTitleItalic(false);
    setFormTitleColor('');
    setShowTitleStyleToolbar(false);

    setFormBadgeFontSize('xs');
    setFormBadgeBold(true);
    setFormBadgeItalic(false);
    setFormBadgeColor('');
    setFormBadgeBgColor('');
    setShowBadgeStyleToolbar(false);

    setSelectedSnippet('');
    setFormColSpan(1);
    setIsAddModalOpen(true);
    setTimeout(() => {
      if (visualEditorRef.current) {
        visualEditorRef.current.innerHTML = '';
      }
    }, 50);
  };

  // Open modal for editing
  const handleOpenEditModal = (blk: AppBlockConfig) => {
    setError('');
    setFormTitle(blk.title);
    setFormBadge(blk.badge || '');
    setFormContent(blk.content);
    setFormIcon(blk.icon || 'Info');
    setFormColor(blk.accentColor || 'emerald');
    setFormColSpan(blk.colSpan === 2 ? 2 : 1);
    setFormFontSize(blk.fontSize || 'sm');
    setFormIsBold(Boolean(blk.isBold));
    setFormIsItalic(Boolean(blk.isItalic));
    setFormTextColor(blk.textColor || '');

    setFormTitleFontSize(blk.titleFontSize || 'sm');
    setFormTitleBold(blk.titleBold !== undefined ? Boolean(blk.titleBold) : true);
    setFormTitleItalic(Boolean(blk.titleItalic));
    setFormTitleColor(blk.titleColor || '');
    setShowTitleStyleToolbar(Boolean(blk.titleColor || (blk.titleFontSize && blk.titleFontSize !== 'sm') || blk.titleItalic));

    setFormBadgeFontSize(blk.badgeFontSize || 'xs');
    setFormBadgeBold(blk.badgeBold !== undefined ? Boolean(blk.badgeBold) : true);
    setFormBadgeItalic(Boolean(blk.badgeItalic));
    setFormBadgeColor(blk.badgeColor || '');
    setFormBadgeBgColor(blk.badgeBgColor || '');
    setShowBadgeStyleToolbar(Boolean(blk.badgeColor || blk.badgeBgColor || (blk.badgeFontSize && blk.badgeFontSize !== 'xs') || blk.badgeItalic));

    setSelectedSnippet('');
    setEditingBlock(blk);
  };

  // Ensure visual editor innerHTML is initialized when modal opens
  useEffect(() => {
    if (isAddModalOpen || Boolean(editingBlock)) {
      const timer = setTimeout(() => {
        if (visualEditorRef.current) {
          const initialContent = editingBlock ? editingBlock.content : formContent;
          visualEditorRef.current.innerHTML = bbcodeToHtml(initialContent);
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isAddModalOpen, Boolean(editingBlock), editingBlock?.id]);

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalContent = visualEditorRef.current
      ? htmlToBbcode(visualEditorRef.current.innerHTML).trim()
      : formContent.trim();

    if (!formTitle.trim()) {
      setError('Укажите заголовок блока');
      return;
    }
    if (!finalContent) {
      setError('Укажите содержимое блока');
      return;
    }

    const targetSection = isInfoStand ? 'dashboard' : section.id;

    const newBlock: AppBlockConfig = {
      id: `block-${Date.now()}`,
      section: targetSection,
      title: formTitle.trim(),
      content: finalContent,
      badge: formBadge.trim() || undefined,
      type: 'card',
      icon: formIcon,
      enabled: true,
      order: sectionBlocks.length + 1,
      accentColor: formColor,
      colSpan: formColSpan,
      fontSize: formFontSize,
      isBold: formIsBold,
      isItalic: formIsItalic,
      textColor: formTextColor.trim() || undefined,
      titleFontSize: formTitleFontSize,
      titleBold: formTitleBold,
      titleItalic: formTitleItalic,
      titleColor: formTitleColor.trim() || undefined,
      badgeFontSize: formBadgeFontSize,
      badgeBold: formBadgeBold,
      badgeItalic: formBadgeItalic,
      badgeColor: formBadgeColor.trim() || undefined,
      badgeBgColor: formBadgeBgColor.trim() || undefined,
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

    const finalContent = visualEditorRef.current
      ? htmlToBbcode(visualEditorRef.current.innerHTML).trim()
      : formContent.trim();

    if (!formTitle.trim()) {
      setError('Укажите заголовок блока');
      return;
    }
    if (!finalContent) {
      setError('Укажите содержимое блока');
      return;
    }

    const updatedBlock: AppBlockConfig = {
      ...editingBlock,
      title: formTitle.trim(),
      content: finalContent,
      badge: formBadge.trim() || undefined,
      icon: formIcon,
      accentColor: formColor,
      colSpan: formColSpan,
      fontSize: formFontSize,
      isBold: formIsBold,
      isItalic: formIsItalic,
      textColor: formTextColor.trim() || undefined,
      titleFontSize: formTitleFontSize,
      titleBold: formTitleBold,
      titleItalic: formTitleItalic,
      titleColor: formTitleColor.trim() || undefined,
      badgeFontSize: formBadgeFontSize,
      badgeBold: formBadgeBold,
      badgeItalic: formBadgeItalic,
      badgeColor: formBadgeColor.trim() || undefined,
      badgeBgColor: formBadgeBgColor.trim() || undefined,
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
    return renderBlockIcon(iconName, `w-4 h-4 shrink-0 ${colorClass}`, availableIcons);
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
          const isDouble = blk.colSpan === 2;

          return (
            <div
              key={blk.id}
              draggable={canManageBlocks && !search.trim()}
              onDragStart={(e) => handleDragStart(e, blk.id)}
              onDragOver={(e) => handleDragOver(e, blk.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, blk.id)}
              onDragEnd={handleDragEnd}
              className={`p-4 rounded-2xl border ${bgClass} shadow-2xs space-y-2 flex flex-col justify-between group transition relative ${
                isDouble ? 'sm:col-span-2' : 'sm:col-span-1'
              } ${
                draggedBlockId === blk.id ? 'opacity-40 scale-[0.98]' : ''
              } ${
                dragOverBlockId === blk.id
                  ? 'ring-2 ring-[#4a7c39] border-transparent scale-[1.01]'
                  : 'hover:border-[#8ba888]/80'
              }`}
            >
              {/* Быстрая кнопка растягивания/сжатия на правой границе карточки при наведении */}
              {canManageBlocks && !search.trim() && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateBlock) {
                      onUpdateBlock({ ...blk, colSpan: isDouble ? 1 : 2 });
                    }
                  }}
                  className="hidden sm:flex items-center justify-center absolute -right-2 top-1/2 -translate-y-1/2 w-4.5 h-9 rounded-md bg-white border border-[#dce3d5] shadow-xs text-[#7a8c71] hover:text-[#2d4a22] hover:border-[#8ba888] hover:scale-110 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
                  title={
                    isDouble
                      ? 'Сжать блок до 1 колонки'
                      : 'Растянуть блок на 2 колонки (двойная ширина)'
                  }
                >
                  <StretchHorizontal className="w-3 h-3" />
                </button>
              )}

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
                    <span
                      style={{ color: blk.titleColor || undefined }}
                      className={`leading-snug break-words ${
                        blk.titleFontSize || blk.titleBold !== undefined || blk.titleItalic !== undefined
                          ? getTextStyleClass(blk.titleFontSize || 'sm', blk.titleBold ?? true, blk.titleItalic ?? false)
                          : 'font-bold text-sm'
                      }`}
                    >
                      {parseFormattedText(blk.title)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {blk.badge && (
                      <span
                        style={{
                          color: blk.badgeColor || undefined,
                          backgroundColor: blk.badgeBgColor || undefined,
                        }}
                        className={`px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          blk.badgeBgColor ? 'border border-black/10' : badgeBg
                        } ${
                          blk.badgeFontSize || blk.badgeBold !== undefined || blk.badgeItalic !== undefined
                            ? getTextStyleClass(blk.badgeFontSize || 'xs', blk.badgeBold ?? true, blk.badgeItalic ?? false)
                            : 'text-[10px] font-bold'
                        }`}
                      >
                        {parseFormattedText(blk.badge)}
                      </span>
                    )}

                    {canManageBlocks && (
                      <div className="flex items-center gap-0.5 ml-1">
                        {/* Кнопка изменения ширины (1 колонка <-> 2 колонки) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateBlock) {
                              onUpdateBlock({ ...blk, colSpan: isDouble ? 1 : 2 });
                            }
                          }}
                          className={`p-1 rounded-md transition cursor-pointer ${
                            isDouble
                              ? 'text-[#2d4a22] bg-[#2d4a22]/10 hover:bg-[#2d4a22]/20 font-bold'
                              : `text-[#5a6b52] hover:text-[#2d4a22] ${btnHover}`
                          }`}
                          title={
                            isDouble
                              ? 'Сжать блок в 1 колонку'
                              : 'Растянуть блок на 2 колонки (двойная ширина)'
                          }
                        >
                          {isDouble ? (
                            <Minimize2 className="w-3.5 h-3.5" />
                          ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                          )}
                        </button>

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

                <div
                  style={{ color: blk.textColor || undefined }}
                  className={`leading-relaxed opacity-95 mt-2 whitespace-pre-line break-words ${
                    blk.fontSize || blk.isBold || blk.isItalic
                      ? getTextStyleClass(blk.fontSize, blk.isBold, blk.isItalic)
                      : 'text-xs'
                  }`}
                >
                  {parseFormattedText(blk.content)}
                </div>
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
          <div className="bg-white rounded-3xl max-w-lg sm:max-w-xl w-full p-5 sm:p-6 shadow-xl border border-[#dce3d5] space-y-4 max-h-[92vh] overflow-y-auto">
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
              className="space-y-4 text-xs"
            >
              {/* Заголовок блока с настройкой стиля */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="font-semibold text-[#5c4033] flex items-center gap-1">
                    <span>Заголовок блока</span>
                    <span className="text-[#9f1239]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTitleStyleToolbar((prev) => !prev)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                      showTitleStyleToolbar || formTitleColor || (formTitleFontSize && formTitleFontSize !== 'sm') || !formTitleBold || formTitleItalic
                        ? 'bg-[#2d4a22] text-white border-[#2d4a22]'
                        : 'bg-[#fcfdfa] text-[#5a6b52] border-[#dce3d5] hover:bg-[#f4f7f1]'
                    }`}
                    title="Настроить стиль текста заголовка"
                  >
                    <Type className="w-3 h-3" />
                    <span>Стиль заголовка</span>
                    {(formTitleColor || (formTitleFontSize && formTitleFontSize !== 'sm') || !formTitleBold || formTitleItalic) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a2d1a2]" />
                    )}
                  </button>
                </div>

                {showTitleStyleToolbar && (
                  <div className="mb-2 p-2 rounded-xl bg-[#f7f9f6] border border-[#dce3d5]">
                    <TextStyleToolbar
                      label="Стиль заголовка:"
                      cardColor={formColor}
                      fontSize={formTitleFontSize}
                      isBold={formTitleBold}
                      isItalic={formTitleItalic}
                      color={formTitleColor}
                      onChange={(opt) => {
                        if (opt.fontSize) setFormTitleFontSize(opt.fontSize);
                        setFormTitleBold(Boolean(opt.isBold));
                        setFormTitleItalic(Boolean(opt.isItalic));
                        setFormTitleColor(opt.color || '');
                      }}
                    />
                  </div>
                )}

                <input
                  type="text"
                  required
                  placeholder="Напр. График работы правления или Магазин"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{ color: formTitleColor || undefined }}
                  className={`w-full px-3 py-2 rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888] text-[#2c3e2d] ${getTextStyleClass(
                    formTitleFontSize,
                    formTitleBold,
                    formTitleItalic
                  )}`}
                />
              </div>

              {/* Бейдж блока с настройкой стиля */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label className="font-semibold text-[#5c4033] flex items-center gap-1.5">
                    <span>Бейдж / метка в углу</span>
                    <span className="text-[11px] font-normal text-[#7a8c71]">(опционально)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {formBadge.trim() && (
                      <span
                        style={{
                          color: formBadgeColor || undefined,
                          backgroundColor: formBadgeBgColor || undefined,
                        }}
                        className={`px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-bold ${
                          formBadgeBgColor ? 'border border-black/10' : 'bg-[#e2edd8] text-[#2d4a22]'
                        } ${getTextStyleClass(formBadgeFontSize, formBadgeBold, formBadgeItalic)}`}
                      >
                        {formBadge.trim()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowBadgeStyleToolbar((prev) => !prev)}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                        showBadgeStyleToolbar || formBadgeColor || formBadgeBgColor || (formBadgeFontSize && formBadgeFontSize !== 'xs') || !formBadgeBold || formBadgeItalic
                          ? 'bg-[#2d4a22] text-white border-[#2d4a22]'
                          : 'bg-[#fcfdfa] text-[#5a6b52] border-[#dce3d5] hover:bg-[#f4f7f1]'
                      }`}
                      title="Настроить стиль и фон бейджа"
                    >
                      <Tag className="w-3 h-3" />
                      <span>Стиль бейджа</span>
                      {(formBadgeColor || formBadgeBgColor || (formBadgeFontSize && formBadgeFontSize !== 'xs') || !formBadgeBold || formBadgeItalic) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a2d1a2]" />
                      )}
                    </button>
                  </div>
                </div>

                {showBadgeStyleToolbar && (
                  <div className="mb-2 p-2 rounded-xl bg-[#f7f9f6] border border-[#dce3d5]">
                    <TextStyleToolbar
                      label="Стиль бейджа:"
                      cardColor={formColor}
                      fontSize={formBadgeFontSize}
                      isBold={formBadgeBold}
                      isItalic={formBadgeItalic}
                      color={formBadgeColor}
                      bgColor={formBadgeBgColor}
                      showBgColor={true}
                      onBgColorChange={(bg) => setFormBadgeBgColor(bg)}
                      onChange={(opt) => {
                        if (opt.fontSize) setFormBadgeFontSize(opt.fontSize as 'xs' | 'sm' | 'base');
                        setFormBadgeBold(Boolean(opt.isBold));
                        setFormBadgeItalic(Boolean(opt.isItalic));
                        setFormBadgeColor(opt.color || '');
                      }}
                    />
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Напр. ИНФО, ВОДА, РАСПИСАНИЕ, ТЕЛЕФОНЫ"
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  style={{
                    color: formBadgeColor || undefined,
                    backgroundColor: formBadgeBgColor ? `${formBadgeBgColor}15` : undefined,
                  }}
                  className={`w-full px-3 py-2 rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#8ba888] text-[#2c3e2d] ${getTextStyleClass(
                    formBadgeFontSize,
                    formBadgeBold,
                    formBadgeItalic
                  )}`}
                />
              </div>

              {/* Содержимое блока с панелью стилей и поддержкой выделенного текста */}
              <div>
                <div className="mb-1.5">
                  <label className="block font-semibold text-[#5c4033]">
                    Текст / информация блока <span className="text-[#9f1239]">*</span>
                  </label>
                </div>

                {/* Toolbar for styling entire block or highlighted selection */}
                <div className="mb-2">
                  <TextStyleToolbar
                    label="Стиль текста:"
                    cardColor={formColor}
                    fontSize={formFontSize}
                    isBold={formIsBold}
                    isItalic={formIsItalic}
                    color={formTextColor}
                    selectedSnippet={selectedSnippet}
                    onFormatSelection={handleFormatContentSelection}
                    showUnderline={true}
                    showClear={true}
                    onChange={(opt) => {
                      if (opt.fontSize) setFormFontSize(opt.fontSize);
                      setFormIsBold(Boolean(opt.isBold));
                      setFormIsItalic(Boolean(opt.isItalic));
                      setFormTextColor(opt.color || '');
                    }}
                  />
                </div>

                {/* Interactive hint for selected snippet */}
                <div className="mb-2 px-2.5 py-1.5 rounded-xl bg-[#f0f9ff] border border-[#bae6fd] text-[11px] text-[#0369a1] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#0284c7]" />
                  <span>
                    {selectedSnippet ? (
                      <>
                        Выделен фрагмент: <strong className="font-semibold underline">«{selectedSnippet}»</strong>. Нажмите на кнопки панели выше (цвет, размер, жирный или курсив), чтобы стилизовать его отдельно!
                      </>
                    ) : (
                      <>
                        Совет: выделите мышью любое слово или телефон в тексте, чтобы применить для него цвет или размер.
                      </>
                    )}
                  </span>
                </div>

                {/* Always visual editor without tags */}
                <div className="relative">
                  <div
                    ref={visualEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleVisualInput}
                    onSelect={handleVisualSelect}
                    onKeyUp={handleVisualSelect}
                    onMouseUp={handleVisualSelect}
                    style={{ color: formTextColor || undefined }}
                    className={`w-full min-h-[130px] max-h-[360px] overflow-y-auto px-3 py-2.5 rounded-xl border border-[#dce3d5] bg-[#fcfdfa] focus:outline-none focus:border-[#2d4a22] focus:ring-1 focus:ring-[#2d4a22]/30 font-sans leading-relaxed whitespace-pre-wrap ${getTextStyleClass(
                      formFontSize,
                      formIsBold,
                      formIsItalic
                    )}`}
                  />
                  {!formContent.trim() && (
                    <div className="absolute top-2.5 left-3 text-[#9ab190] italic pointer-events-none select-none text-sm">
                      Укажите текст, расписание, контакты или телефоны...
                    </div>
                  )}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block font-semibold text-[#5c4033] mb-1.5">
                  Иконка блока
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-1 bg-[#fcfdfa] rounded-xl border border-[#e6ebe0]">
                  {availableIcons.map((ic) => {
                    const isSelected = formIcon === ic.id || formIcon === ic.iconName;
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
                        {renderBlockIcon(
                          ic.iconName,
                          `w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#2d4a22]'}`
                        )}
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

              {/* Выбор ширины блока (1 колонка или двойная ширина на 2 колонки) */}
              <div>
                <label className="block font-semibold text-[#5c4033] mb-1.5">
                  Ширина блока на стенде
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormColSpan(1)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formColSpan === 1
                        ? 'bg-[#2d4a22] text-white border-[#2d4a22] shadow-2xs'
                        : 'bg-[#fcfdfa] text-[#5a6b52] border-[#dce3d5] hover:bg-[#f4f7f1]'
                    }`}
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Стандартный (1 колонка)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormColSpan(2)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                      formColSpan === 2
                        ? 'bg-[#2d4a22] text-white border-[#2d4a22] shadow-2xs'
                        : 'bg-[#fcfdfa] text-[#5a6b52] border-[#dce3d5] hover:bg-[#f4f7f1]'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Двойной (на всю ширину)</span>
                  </button>
                </div>
              </div>

              {/* Живой предпросмотр готовой карточки */}
              <div className="pt-2 border-t border-[#f0f2ec]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#5c4033] flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#2d4a22]" />
                    <span>Живой предпросмотр готовой карточки:</span>
                  </label>
                  <span className="text-[10px] font-semibold text-[#5a6b52] bg-[#f0f4ec] px-2 py-0.5 rounded-full border border-[#dce3d5]">
                    {formColSpan === 2 ? '2 колонки (двойной размер)' : '1 колонка (стандартный)'}
                  </span>
                </div>
                <div className={`p-4 rounded-2xl border ${getColorStyles(formColor).bgClass} shadow-2xs space-y-2`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderBlockIcon(formIcon, `w-4 h-4 ${getColorStyles(formColor).iconColor}`)}
                      <span
                        style={{ color: formTitleColor || undefined }}
                        className={`leading-snug break-words ${getTextStyleClass(
                          formTitleFontSize,
                          formTitleBold,
                          formTitleItalic
                        )}`}
                      >
                        {formTitle ? parseFormattedText(formTitle) : 'Заголовок блока'}
                      </span>
                    </div>

                    {formBadge && (
                      <span
                        style={{
                          color: formBadgeColor || undefined,
                          backgroundColor: formBadgeBgColor || undefined,
                        }}
                        className={`px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          formBadgeBgColor ? 'border border-black/10' : getColorStyles(formColor).badgeBg
                        } ${getTextStyleClass(formBadgeFontSize, formBadgeBold, formBadgeItalic)}`}
                      >
                        {parseFormattedText(formBadge)}
                      </span>
                    )}
                  </div>

                  <div
                    style={{ color: formTextColor || undefined }}
                    className={`leading-relaxed opacity-95 mt-2 whitespace-pre-line break-words ${
                      formFontSize || formIsBold || formIsItalic
                        ? getTextStyleClass(formFontSize, formIsBold, formIsItalic)
                        : 'text-xs'
                    }`}
                  >
                    {formContent ? parseFormattedText(formContent) : 'Здесь будет отображаться текст блока...'}
                  </div>
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
