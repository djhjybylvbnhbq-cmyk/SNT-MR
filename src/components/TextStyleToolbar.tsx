import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Type, Palette, Underline, Eraser, Sparkles, Clipboard, Check, X, ChevronDown } from 'lucide-react';

export interface TextStyleOptions {
  fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  isBold?: boolean;
  isItalic?: boolean;
  color?: string; // hex color or preset color
}

export interface CardColorPreset {
  name: string;
  colors: [string, string];
}

export const CARD_RECOMMENDED_COLORS: Record<string, CardColorPreset> = {
  emerald: { name: 'Зеленый', colors: ['#143628', '#1C4B30'] },
  sky: { name: 'Голубой', colors: ['#1D4ED8', '#1E3A8A'] },
  amber: { name: 'Янтарный', colors: ['#2C221E', '#78350F'] },
  rose: { name: 'Розовый', colors: ['#831843', '#9F1239'] },
  slate: { name: 'Серый', colors: ['#0F172A', '#334155'] },
};

export const getCardPreset = (cardColor?: string): CardColorPreset => {
  if (!cardColor) return CARD_RECOMMENDED_COLORS.emerald;
  const key = cardColor.toLowerCase().trim();
  if (key === 'sky' || key === 'blue' || key === 'голубой') return CARD_RECOMMENDED_COLORS.sky;
  if (key === 'amber' || key === 'yellow' || key === 'orange' || key === 'янтарный') return CARD_RECOMMENDED_COLORS.amber;
  if (key === 'rose' || key === 'pink' || key === 'red' || key === 'розовый') return CARD_RECOMMENDED_COLORS.rose;
  if (key === 'slate' || key === 'gray' || key === 'grey' || key === 'серый') return CARD_RECOMMENDED_COLORS.slate;
  return CARD_RECOMMENDED_COLORS.emerald;
};

export interface TextStyleToolbarProps {
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
  cardColor?: string;
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
  { id: 'pine', label: 'Темно-зеленый (#143628)', value: '#143628' },
  { id: 'green', label: 'Зеленый', value: '#15803d' },
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

export const normalizeHexColor = (val: string): string => {
  let clean = val.trim().replace(/['";]/g, '');
  if (!clean.startsWith('#')) {
    clean = '#' + clean;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    clean = '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
  }
  return clean.toUpperCase();
};

export const isValidHexColor = (val: string): boolean => {
  const normalized = normalizeHexColor(val);
  return /^#[0-9a-fA-F]{6}$/i.test(normalized);
};

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
  cardColor = '',
  onFormatSelection,
  showUnderline = false,
  showClear = false,
  compact = false,
  bgColor = '',
  onBgColorChange,
  showBgColor = false,
}) => {
  const isSelectionActive = Boolean(selectedSnippet && selectedSnippet.trim().length > 0 && onFormatSelection);
  const activePreset = getCardPreset(cardColor);

  // Custom HEX picker state (defaulting to the first recommended color of selected card style)
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [customHexInput, setCustomHexInput] = useState(
    color && isValidHexColor(color) ? normalizeHexColor(color) : activePreset.colors[0]
  );
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const hexInputRef = useRef<HTMLInputElement>(null);

  // Custom Font Size Dropdown state
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const sizeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) {
        setIsSizeDropdownOpen(false);
      }
    };
    if (isSizeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSizeDropdownOpen]);

  useEffect(() => {
    if (color && isValidHexColor(color)) {
      setCustomHexInput(normalizeHexColor(color));
    } else {
      setCustomHexInput(activePreset.colors[0]);
    }
  }, [color, cardColor]);

  const applyColor = (hex: string) => {
    const finalHex = normalizeHexColor(hex);
    if (isSelectionActive && onFormatSelection) {
      onFormatSelection('color', finalHex);
    } else {
      onChange({ fontSize, isBold, isItalic, color: finalHex });
    }
  };

  const handlePasteHex = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const normalized = normalizeHexColor(text);
          setCustomHexInput(normalized);
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 2000);
          if (isValidHexColor(normalized)) {
            applyColor(normalized);
          }
          return;
        }
      }
    } catch {
      // If clipboard access is constrained by browser permissions, focus the input for manual Ctrl+V
    }
    if (hexInputRef.current) {
      hexInputRef.current.focus();
      hexInputRef.current.select();
    }
  };

  return (
    <div
      className={`flex flex-col gap-1.5 p-2 bg-[#fcfdfa] border ${
        isSelectionActive ? 'border-[#4a7c39] ring-2 ring-[#4a7c39]/20 bg-[#f4f7f1]' : 'border-[#dce3d5]'
      } rounded-xl text-xs transition ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
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
          onMouseDown={(e) => e.preventDefault()}
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
          onMouseDown={(e) => e.preventDefault()}
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
            onMouseDown={(e) => e.preventDefault()}
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
          <div className="relative ml-0.5" ref={sizeDropdownRef}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsSizeDropdownOpen((prev) => !prev)}
              className="px-2 py-1 text-xs rounded-lg border border-[#dce3d5] bg-white text-[#2c3e2d] hover:border-[#8ba888] focus:outline-none cursor-pointer flex items-center gap-1 transition"
              title={isSelectionActive ? 'Изменить размер шрифта выделенного фрагмента' : 'Размер шрифта'}
            >
              <span>{FONT_SIZES.find((s) => s.id === fontSize)?.label || 'Размер'}</span>
              <ChevronDown className="w-3 h-3 text-[#7a8c71]" />
            </button>

            {isSizeDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-30 min-w-[130px] bg-white border border-[#dce3d5] rounded-xl shadow-lg p-1 flex flex-col gap-0.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                {FONT_SIZES.map((sz) => {
                  const isCurrent = sz.id === fontSize;
                  return (
                    <button
                      key={sz.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setIsSizeDropdownOpen(false);
                        if (isSelectionActive && onFormatSelection) {
                          onFormatSelection('size', sz.id);
                        } else {
                          onChange({
                            fontSize: sz.id,
                            isBold,
                            isItalic,
                            color,
                          });
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-[#eef3ea] text-[#2d4a22] font-bold'
                          : 'text-[#334155] hover:bg-[#f8faf7] hover:text-[#1e293b]'
                      }`}
                    >
                      <span>{sz.label}</span>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-[#2d4a22]" />}
                    </button>
                  );
                })}
              </div>
            )}
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
                    onMouseDown={(e) => e.preventDefault()}
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

              {/* Custom Color Button (+ opens dedicated HEX input, defaults to card preset) */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowCustomColorPicker((prev) => {
                    const next = !prev;
                    if (next) {
                      const initial = color && isValidHexColor(color) ? normalizeHexColor(color) : activePreset.colors[0];
                      setCustomHexInput(initial);
                      setTimeout(() => {
                        hexInputRef.current?.focus();
                        hexInputRef.current?.select();
                      }, 50);
                    }
                    return next;
                  });
                }}
                className={`w-4 h-4 rounded-full border border-dashed flex items-center justify-center cursor-pointer transition shrink-0 ${
                  showCustomColorPicker
                    ? 'border-[#143628] bg-[#143628] text-white scale-110 shadow-2xs'
                    : 'border-[#8ba888] hover:border-[#143628] hover:scale-105 text-[#5a6b52] bg-white'
                }`}
                title={`Произвольный HEX-код цвета (для стиля "${activePreset.name}": ${activePreset.colors.join(' или ')})`}
              >
                <span className="text-[9px] font-bold leading-none">+</span>
              </button>
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
                  value={bgColor || '#143628'}
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormatSelection('clear')}
            className="ml-auto p-1.5 rounded-lg border border-[#dce3d5] bg-white text-[#7a8c71] hover:text-[#9f1239] hover:bg-[#fff1f2] transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Очистить форматирование выделенного текста"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Очистить</span>
          </button>
        )}
      </div>

      {/* Dedicated HEX Color Panel with #143628 by default and Clipboard Paste */}
      {showCustomColorPicker && (
        <div className="w-full mt-1 pt-2 border-t border-[#dce3d5] flex flex-wrap items-center gap-2 bg-[#f4f7f1] p-2 rounded-xl animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2c3e2d]">
            <Palette className="w-3.5 h-3.5 text-[#143628]" />
            <span>Цвет (HEX):</span>
          </div>

          {/* Color swatch trigger that also opens native gradient picker, initialized to card preset */}
          <label
            className="relative w-6 h-6 rounded-lg border border-black/20 shadow-2xs flex items-center justify-center cursor-pointer overflow-hidden shrink-0 hover:scale-105 transition"
            title="Кликните, чтобы открыть палитру цветов"
            style={{
              backgroundColor: isValidHexColor(customHexInput) ? normalizeHexColor(customHexInput) : activePreset.colors[0],
            }}
          >
            <input
              type="color"
              value={isValidHexColor(customHexInput) ? normalizeHexColor(customHexInput) : activePreset.colors[0]}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setCustomHexInput(val);
                applyColor(val);
              }}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </label>

          {/* HEX code text input: defaults to card preset and supports paste */}
          <input
            ref={hexInputRef}
            type="text"
            value={customHexInput}
            onChange={(e) => {
              const val = e.target.value;
              setCustomHexInput(val);
              if (isValidHexColor(val)) {
                applyColor(normalizeHexColor(val));
              }
            }}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData('text');
              if (pastedText && pastedText.trim()) {
                e.preventDefault();
                const normalized = normalizeHexColor(pastedText);
                setCustomHexInput(normalized);
                setPasteSuccess(true);
                setTimeout(() => setPasteSuccess(false), 2000);
                if (isValidHexColor(normalized)) {
                  applyColor(normalized);
                }
              }
            }}
            placeholder={activePreset.colors[0]}
            maxLength={9}
            className="w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-[#dce3d5] bg-white text-[#2c3e2d] focus:outline-none focus:border-[#143628] focus:ring-1 focus:ring-[#143628]"
            title={`Введите или вставьте HEX-код цвета (напр. ${activePreset.colors[0]})`}
          />

          {/* Paste button from clipboard */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handlePasteHex}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
              pasteSuccess
                ? 'bg-[#dcfce7] border-[#86efac] text-[#166534]'
                : 'bg-white hover:bg-[#e9eddf] border-[#dce3d5] text-[#143628]'
            }`}
            title="Вставить цвет из буфера обмена"
          >
            {pasteSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#16a34a]" />
                <span>Вставлено!</span>
              </>
            ) : (
              <>
                <Clipboard className="w-3.5 h-3.5 text-[#143628]" />
                <span>Вставить</span>
              </>
            )}
          </button>

          {/* Два быстрых варианта цвета в зависимости от выбранного стиля карточки */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {activePreset.colors.map((hexOpt) => {
              const isCurActive = normalizeHexColor(customHexInput) === hexOpt;
              return (
                <button
                  key={hexOpt}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCustomHexInput(hexOpt);
                    applyColor(hexOpt);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isCurActive
                      ? 'bg-white border-2 border-[#143628] text-[#143628] shadow-xs ring-1 ring-[#143628]/20'
                      : 'bg-white hover:bg-[#e9eddf] border border-[#dce3d5] text-[#2c3e2d]'
                  }`}
                  title={`Быстрый вариант цвета для стиля «${activePreset.name}»: ${hexOpt}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 border border-black/15 shadow-2xs"
                    style={{ backgroundColor: hexOpt }}
                  />
                  <span>{hexOpt}</span>
                </button>
              );
            })}
          </div>

          {/* Close custom color panel */}
          <button
            type="button"
            onClick={() => setShowCustomColorPicker(false)}
            className="ml-auto p-1 rounded-lg text-[#7a8c71] hover:text-[#2c3e2d] hover:bg-[#e9eddf] transition cursor-pointer"
            title="Закрыть панель цвета"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
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

