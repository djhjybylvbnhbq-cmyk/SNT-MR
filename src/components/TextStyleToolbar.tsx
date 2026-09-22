import React from 'react';
import { Bold, Italic, Type, Palette, Underline, Eraser, Sparkles } from 'lucide-react';

export interface TextStyleOptions {
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  isBold?: boolean;
  isItalic?: boolean;
  color?: string; // hex color or preset color
}

interface TextStyleToolbarProps {
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  isBold?: boolean;
  isItalic?: boolean;
  color?: string;
  onChange: (options: TextStyleOptions) => void;
  className?: string;
  showFontSize?: boolean;
  showColor?: boolean;
  label?: string;
  selectedSnippet?: string;
  onFormatSelection?: (
    type: 'bold' | 'italic' | 'underline' | 'color' | 'size' | 'bg' | 'clear',
    value?: string
  ) => void;
  showUnderline?: boolean;
  showClear?: boolean;
  compact?: boolean;
  bgColor?: string;
  onBgColorChange?: (bgColor: string) => void;
  showBgColor?: boolean;
}

export const FONT_SIZES: { id: 'xs' | 'sm' | 'base' | 'lg' | 'xl'; label: string; className: string }[] = [
  { id: 'xs', label: 'Мелкий', className: 'text-xs' },
  { id: 'sm', label: 'Обычный', className: 'text-sm' },
  { id: 'base', label: 'Средний', className: 'text-base' },
  { id: 'lg', label: 'Крупный', className: 'text-lg' },
  { id: 'xl', label: 'Очень крупный', className: 'text-xl' },
];

export const PRESET_COLORS: { id: string; label: string; value: string; border?: string }[] = [
  { id: 'default', label: 'По умолчанию', value: '' },
  { id: 'green', label: 'Зеленый', value: '#15803d' },
  { id: 'darkgreen', label: 'Хвойный', value: '#2d4a22' },
  { id: 'blue', label: 'Синий', value: '#0284c7' },
  { id: 'amber', label: 'Янтарный', value: '#b45309' },
  { id: 'red', label: 'Красный', value: '#dc2626' },
  { id: 'rose', label: 'Малиновый', value: '#be123c' },
  { id: 'purple', label: 'Фиолетовый', value: '#7e22ce' },
  { id: 'dark', label: 'Темно-серый', value: '#1f2937' },
];

export const BADGE_BG_PRESETS: { id: string; label: string; value: string }[] = [
  { id: 'default', label: 'Стандарт', value: '' },
  { id: 'emerald', label: 'Зеленый', value: '#e9eddf' },
  { id: 'sky', label: 'Голубой', value: '#e0f2fe' },
  { id: 'amber', label: 'Янтарный', value: '#fef3c7' },
  { id: 'rose', label: 'Красный', value: '#ffe4e6' },
  { id: 'purple', label: 'Фиолетовый', value: '#f3e8ff' },
  { id: 'slate', label: 'Серый', value: '#f1f5f9' },
  { id: 'white', label: 'Белый', value: '#ffffff' },
];

export const TextStyleToolbar: React.FC<TextStyleToolbarProps> = ({
  fontSize = 'sm',
  isBold = false,
  isItalic = false,
  color = '',
  onChange,
  className = '',
  showFontSize = true,
  showColor = true,
  label = 'Стиль текста:',
  selectedSnippet = '',
  onFormatSelection,
  showUnderline = false,
  showClear = false,
  compact = false,
  bgColor = '',
  onBgColorChange,
  showBgColor = false,
}) => {
  const isSelectionActive = Boolean(selectedSnippet && selectedSnippet.trim().length > 0 && onFormatSelection);

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 p-2 bg-[#fcfdfa] border ${
        isSelectionActive ? 'border-[#4a7c39] ring-2 ring-[#4a7c39]/20 bg-[#f4f7f1]' : 'border-[#dce3d5]'
      } rounded-xl text-xs transition ${className}`}
    >
      {/* Header label or selection pill */}
      {isSelectionActive ? (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#2d4a22] text-white text-[11px] font-semibold shrink-0 animate-in fade-in duration-150">
          <Sparkles className="w-3 h-3 text-[#a2d1a2]" />
          <span>Выделено: «{selectedSnippet.slice(0, 16)}{selectedSnippet.length > 16 ? '...' : ''}»</span>
        </div>
      ) : (
        <span className="text-[11px] font-semibold text-[#5a6b52] flex items-center gap-1 mr-1 shrink-0">
          <Type className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      )}

      {/* Bold toggle */}
      <button
        type="button"
        onClick={() => {
          if (isSelectionActive && onFormatSelection) {
            onFormatSelection('bold');
          } else {
            onChange({ fontSize, isBold: !isBold, isItalic, color });
          }
        }}
        className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
          !isSelectionActive && isBold
            ? 'bg-[#2d4a22] text-white border-[#2d4a22] shadow-2xs font-bold'
            : 'bg-white text-[#5a6b52] border-[#dce3d5] hover:bg-[#f4f7f1]'
        }`}
        title={isSelectionActive ? 'Сделать выделенный текст жирным (**...**)' : 'Жирный шрифт (Bold)'}
        aria-pressed={isBold}
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      {/* Italic toggle */}
      <button
        type="button"
        onClick={() => {
          if (isSelectionActive && onFormatSelection) {
            onFormatSelection('italic');
          } else {
            onChange({ fontSize, isBold, isItalic: !isItalic, color });
          }
        }}
        className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
          !isSelectionActive && isItalic
            ? 'bg-[#2d4a22] text-white border-[#2d4a22] shadow-2xs italic'
            : 'bg-white text-[#5a6b52] border-[#dce3d5] hover:bg-[#f4f7f1]'
        }`}
        title={isSelectionActive ? 'Сделать выделенный текст курсивом (*...*)' : 'Курсив (Italic)'}
        aria-pressed={isItalic}
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      {/* Underline toggle */}
      {showUnderline && (
        <button
          type="button"
          onClick={() => {
            if (isSelectionActive && onFormatSelection) {
              onFormatSelection('underline');
            }
          }}
          className="p-1.5 rounded-lg border border-[#dce3d5] bg-white text-[#5a6b52] hover:bg-[#f4f7f1] transition cursor-pointer flex items-center justify-center"
          title={isSelectionActive ? 'Подчеркнуть выделенный текст' : 'Подчеркивание'}
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Font Size Selector */}
      {showFontSize && (
        <div className="flex items-center gap-1 ml-0.5">
          <select
            value={fontSize}
            onChange={(e) => {
              const val = e.target.value as 'xs' | 'sm' | 'base' | 'lg' | 'xl';
              if (isSelectionActive && onFormatSelection) {
                onFormatSelection('size', val);
              } else {
                onChange({
                  fontSize: val,
                  isBold,
                  isItalic,
                  color,
                });
              }
            }}
            className="px-2 py-1 text-xs rounded-lg border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#8ba888] cursor-pointer"
            title={isSelectionActive ? 'Изменить размер шрифта выделенного фрагмента' : 'Размер шрифта'}
          >
            {FONT_SIZES.map((sz) => (
              <option key={sz.id} value={sz.id}>
                {sz.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Font Color Selector */}
      {showColor && (
        <div className="flex items-center gap-1 ml-0.5 sm:ml-1">
          <span title="Цвет текста" className="inline-flex">
            <Palette className="w-3.5 h-3.5 text-[#5a6b52] shrink-0" />
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {PRESET_COLORS.map((c) => {
              const isSelected = !isSelectionActive && (color || '') === c.value;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (isSelectionActive && onFormatSelection) {
                      onFormatSelection('color', c.value);
                    } else {
                      onChange({ fontSize, isBold, isItalic, color: c.value });
                    }
                  }}
                  style={{ backgroundColor: c.value || '#64748b' }}
                  className={`w-4 h-4 rounded-full border transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'ring-2 ring-offset-1 ring-[#2d4a22] scale-110 border-white'
                      : 'border-black/20 hover:scale-105'
                  }`}
                  title={isSelectionActive ? `Окрасить выделенный текст в цвет: ${c.label}` : c.label}
                />
              );
            })}

            {/* Custom Color Input */}
            <label
              className="relative w-4 h-4 rounded-full border border-dashed border-[#8ba888] flex items-center justify-center cursor-pointer hover:border-[#2d4a22] overflow-hidden"
              title="Выбрать произвольный цвет"
            >
              <input
                type="color"
                value={color || '#2c3e2d'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isSelectionActive && onFormatSelection) {
                    onFormatSelection('color', val);
                  } else {
                    onChange({ fontSize, isBold, isItalic, color: val });
                  }
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span className="text-[9px] font-bold text-[#5a6b52] leading-none">+</span>
            </label>
          </div>
        </div>
      )}

      {/* Badge Background Color Selector (optional) */}
      {showBgColor && onBgColorChange && (
        <div className="flex items-center gap-1 ml-1 sm:ml-2 border-l border-[#dce3d5] pl-2">
          <span className="text-[10px] text-[#7a8c71] font-medium hidden sm:inline">Фон:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {BADGE_BG_PRESETS.map((p) => {
              const isSelected = (bgColor || '') === p.value;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onBgColorChange(p.value)}
                  style={{ backgroundColor: p.value || '#e2e8f0' }}
                  className={`w-4 h-4 rounded-md border transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'ring-2 ring-offset-1 ring-[#2d4a22] scale-110 border-[#2d4a22]'
                      : 'border-black/20 hover:scale-105'
                  }`}
                  title={`Цвет фона бейджа: ${p.label}`}
                />
              );
            })}
            <label
              className="relative w-4 h-4 rounded-md border border-dashed border-[#8ba888] flex items-center justify-center cursor-pointer hover:border-[#2d4a22] overflow-hidden"
              title="Свой цвет фона"
            >
              <input
                type="color"
                value={bgColor || '#f4f7f1'}
                onChange={(e) => onBgColorChange(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span className="text-[9px] font-bold text-[#5a6b52] leading-none">+</span>
            </label>
          </div>
        </div>
      )}

      {/* Clear formatting button */}
      {showClear && onFormatSelection && (
        <button
          type="button"
          onClick={() => onFormatSelection('clear')}
          className="ml-auto p-1.5 rounded-lg border border-[#dce3d5] bg-white text-[#7a8c71] hover:text-[#9f1239] hover:bg-[#fff1f2] transition cursor-pointer flex items-center gap-1 text-[11px]"
          title="Очистить форматирование выделенного текста"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Очистить</span>
        </button>
      )}
    </div>
  );
};

export const getTextStyleClass = (
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl',
  isBold?: boolean,
  isItalic?: boolean
): string => {
  const classes: string[] = [];
  if (fontSize) {
    switch (fontSize) {
      case 'xs':
        classes.push('text-xs');
        break;
      case 'sm':
        classes.push('text-sm');
        break;
      case 'base':
        classes.push('text-base');
        break;
      case 'lg':
        classes.push('text-lg');
        break;
      case 'xl':
        classes.push('text-xl');
        break;
    }
  }
  if (isBold) {
    classes.push('font-bold');
  }
  if (isItalic) {
    classes.push('italic');
  }
  return classes.join(' ');
};
