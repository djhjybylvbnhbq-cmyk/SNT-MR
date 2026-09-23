import React from 'react';

/**
 * Parses markdown-like and BBCode tags for rich inline formatting:
 * - **bold**
 * - *italic*
 * - [color=#hex or name]text[/color]
 * - [size=xs|sm|base|lg|xl]text[/size]
 * - [bg=#hex or name]text[/bg]
 * - __underline__
 * - ~~strikethrough~~
 */
export function parseFormattedText(text: string): React.ReactNode[] {
  if (!text) return [];

  // Pre-clean any nested duplicate or conflicting color tags: e.g. [color=A][color=B]...[/color][/color] -> [color=B]...[/color]
  let sanitized = text;
  while (/\[color=[^\]]+\]\s*(\[color=[^\]]+\][\s\S]*?\[\/color\])\s*\[\/color\]/.test(sanitized)) {
    sanitized = sanitized.replace(/\[color=[^\]]+\]\s*(\[color=[^\]]+\][\s\S]*?\[\/color\])\s*\[\/color\]/g, '$1');
  }
  while (/\[size=[^\]]+\]\s*(\[size=[^\]]+\][\s\S]*?\[\/size\])\s*\[\/size\]/.test(sanitized)) {
    sanitized = sanitized.replace(/\[size=[^\]]+\]\s*(\[size=[^\]]+\][\s\S]*?\[\/size\])\s*\[\/size\]/g, '$1');
  }

  // Regex matching supported outer tags
  const tagRegex =
    /(\[color=([#a-zA-Z0-9]+)\]([\s\S]*?)\[\/color\]|\[size=(xs|sm|base|lg|xl)\]([\s\S]*?)\[\/size\]|\[bg=([#a-zA-Z0-9]+)\]([\s\S]*?)\[\/bg\]|\*\*([\s\S]+?)\*\*|\*([^\*\n]+?)\*|__([\s\S]+?)__|~~([\s\S]+?)~~)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(sanitized)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(sanitized.substring(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const key = `fmt-${match.index}-${lastIndex}`;

    if (fullMatch.startsWith('[color=')) {
      const colorVal = match[2];
      const innerText = match[3];
      nodes.push(
        <span key={key} style={{ color: colorVal }}>
          {parseFormattedText(innerText)}
        </span>
      );
    } else if (fullMatch.startsWith('[size=')) {
      const sizeVal = match[4];
      const innerText = match[5];
      const sizeClass =
        sizeVal === 'xs'
          ? 'text-xs'
          : sizeVal === 'sm'
          ? 'text-sm'
          : sizeVal === 'base'
          ? 'text-base'
          : sizeVal === 'lg'
          ? 'text-lg'
          : 'text-xl';
      nodes.push(
        <span key={key} className={sizeClass}>
          {parseFormattedText(innerText)}
        </span>
      );
    } else if (fullMatch.startsWith('[bg=')) {
      const bgVal = match[6];
      const innerText = match[7];
      nodes.push(
        <span
          key={key}
          style={{ backgroundColor: bgVal }}
          className="px-1 py-0.5 rounded"
        >
          {parseFormattedText(innerText)}
        </span>
      );
    } else if (fullMatch.startsWith('**')) {
      const innerText = match[8];
      nodes.push(
        <strong key={key} className="font-bold">
          {parseFormattedText(innerText)}
        </strong>
      );
    } else if (fullMatch.startsWith('*')) {
      const innerText = match[9];
      nodes.push(
        <em key={key} className="italic">
          {parseFormattedText(innerText)}
        </em>
      );
    } else if (fullMatch.startsWith('__')) {
      const innerText = match[10];
      nodes.push(
        <span key={key} className="underline">
          {parseFormattedText(innerText)}
        </span>
      );
    } else if (fullMatch.startsWith('~~')) {
      const innerText = match[11];
      nodes.push(
        <span key={key} className="line-through">
          {parseFormattedText(innerText)}
        </span>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < sanitized.length) {
    nodes.push(sanitized.substring(lastIndex));
  }

  return nodes;
}

/**
 * Strips formatting tags to return clean plain text.
 */
export function stripFormattingTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[color=[^\]]+\]([\s\S]*?)\[\/color\]/g, '$1')
    .replace(/\[size=[^\]]+\]([\s\S]*?)\[\/size\]/g, '$1')
    .replace(/\[bg=[^\]]+\]([\s\S]*?)\[\/bg\]/g, '$1')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/\*([^\*\n]+?)\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1');
}

/**
 * Helper to wrap or toggle a tag around a selected range in a textarea or text input.
 */
export function applyFormatToSelection(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
  formatType: 'bold' | 'italic' | 'underline' | 'strike' | 'color' | 'size' | 'bg' | 'clear',
  formatValue?: string
): { newText: string; newSelectionStart: number; newSelectionEnd: number } {
  const before = fullText.substring(0, selectionStart);
  const selected = fullText.substring(selectionStart, selectionEnd);
  const after = fullText.substring(selectionEnd);

  // If no selection, provide a sensible default placeholder
  const targetText = selected || (formatType === 'clear' ? '' : 'текст');

  let replacement = '';
  switch (formatType) {
    case 'bold':
      if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
      } else {
        replacement = `**${targetText}**`;
      }
      break;

    case 'italic':
      if (selected.startsWith('*') && selected.endsWith('*') && selected.length >= 2 && !selected.startsWith('**')) {
        replacement = selected.slice(1, -1);
      } else {
        replacement = `*${targetText}*`;
      }
      break;

    case 'underline':
      if (selected.startsWith('__') && selected.endsWith('__') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
      } else {
        replacement = `__${targetText}__`;
      }
      break;

    case 'strike':
      if (selected.startsWith('~~') && selected.endsWith('~~') && selected.length >= 4) {
        replacement = selected.slice(2, -2);
      } else {
        replacement = `~~${targetText}~~`;
      }
      break;

    case 'color':
      if (formatValue) {
        // Strip any existing color wrapper on this exact selection to avoid double wrapping
        const uncolored = selected.replace(/^\[color=[^\]]+\]([\s\S]*)\[\/color\]$/, '$1');
        replacement = `[color=${formatValue}]${uncolored || targetText}[/color]`;
      } else {
        replacement = targetText;
      }
      break;

    case 'size':
      if (formatValue) {
        const unsized = selected.replace(/^\[size=[^\]]+\]([\s\S]*)\[\/size\]$/, '$1');
        replacement = `[size=${formatValue}]${unsized || targetText}[/size]`;
      } else {
        replacement = targetText;
      }
      break;

    case 'bg':
      if (formatValue) {
        const unbged = selected.replace(/^\[bg=[^\]]+\]([\s\S]*)\[\/bg\]$/, '$1');
        replacement = `[bg=${formatValue}]${unbged || targetText}[/bg]`;
      } else {
        replacement = targetText;
      }
      break;

    case 'clear':
      replacement = stripFormattingTags(selected);
      break;

    default:
      replacement = targetText;
  }

  const newText = before + replacement + after;
  const newSelectionStart = selectionStart;
  const newSelectionEnd = selectionStart + replacement.length;

  return { newText, newSelectionStart, newSelectionEnd };
}

/**
 * Converts rgb(...) or hex string into clean uppercase #RRGGBB hex.
 */
export function rgbToHex(rgb: string): string {
  if (!rgb) return '';
  const clean = rgb.trim();
  if (clean.startsWith('#')) {
    if (clean.length === 4) {
      return ('#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3]).toUpperCase();
    }
    return clean.toUpperCase();
  }
  const match = clean.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return clean.toUpperCase();
  const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
  const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
  const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Maps CSS font-size strings to 'xs' | 'sm' | 'base' | 'lg' | 'xl'.
 */
export function parseFontSize(fontSizeStr: string): string | null {
  if (!fontSizeStr) return null;
  const num = parseFloat(fontSizeStr);
  if (isNaN(num)) return null;
  if (fontSizeStr.includes('px')) {
    if (num <= 12) return 'xs';
    if (num <= 14) return 'sm';
    if (num <= 16) return 'base';
    if (num <= 18) return 'lg';
    return 'xl';
  }
  if (fontSizeStr.includes('rem') || fontSizeStr.includes('em')) {
    if (num <= 0.75) return 'xs';
    if (num <= 0.875) return 'sm';
    if (num <= 1.0) return 'base';
    if (num <= 1.125) return 'lg';
    return 'xl';
  }
  return null;
}

/**
 * Converts BBCode markup into editable HTML for the visual WYSIWYG editor.
 */
export function bbcodeToHtml(bbcode: string): string {
  if (!bbcode) return '';

  let html = bbcode;

  // 1. Color tags
  html = html.replace(/\[color=([#a-zA-Z0-9]+)\]([\s\S]*?)\[\/color\]/g, (_match, color, content) => {
    return `<span style="color: ${color};">${content}</span>`;
  });

  // 2. Size tags
  const sizeMap: Record<string, string> = {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
  };
  html = html.replace(/\[size=(xs|sm|base|lg|xl)\]([\s\S]*?)\[\/size\]/g, (_match, size, content) => {
    return `<span style="font-size: ${sizeMap[size] || '14px'}; line-height: 1.3;" data-size="${size}">${content}</span>`;
  });

  // 3. Background tags
  html = html.replace(/\[bg=([#a-zA-Z0-9]+)\]([\s\S]*?)\[\/bg\]/g, (_match, bg, content) => {
    return `<span style="background-color: ${bg};" data-bg="${bg}">${content}</span>`;
  });

  // 4. Markdown styles
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^\*\n]+?)\*/g, '<em>$1</em>');
  html = html.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
  html = html.replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');

  // 5. Convert linebreaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Converts visual editor HTML back into clean BBCode markup for storage.
 */
export function htmlToBbcode(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html;

  const container = document.createElement('div');
  container.innerHTML = html;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      return '\n';
    }

    let inner = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      inner += walk(el.childNodes[i]);
    }

    // Bold detection
    const isBold =
      tag === 'strong' ||
      tag === 'b' ||
      el.style.fontWeight === 'bold' ||
      parseInt(el.style.fontWeight || '0', 10) >= 600;

    // Italic detection
    const isItalic =
      tag === 'em' ||
      tag === 'i' ||
      el.style.fontStyle === 'italic';

    // Underline detection
    const isUnderline =
      tag === 'u' ||
      Boolean(el.style.textDecoration && el.style.textDecoration.includes('underline'));

    // Strike detection
    const isStrike =
      tag === 's' ||
      tag === 'strike' ||
      tag === 'del' ||
      Boolean(el.style.textDecoration && el.style.textDecoration.includes('line-through'));

    // Color detection: colorStyle (actual inline style) takes precedence over legacy attributes
    const colorStyle = el.style.color;
    const fontColor = el.getAttribute('color');
    const dataColor = el.getAttribute('data-color');
    const rawColor = colorStyle || fontColor || dataColor;
    let colorHex: string | null = null;
    if (rawColor) {
      const hex = rgbToHex(rawColor);
      if (hex && hex !== '#000000' && hex !== '#000' && hex !== 'INHERIT') {
        colorHex = hex;
      }
    }

    // Size detection
    const dataSize = el.getAttribute('data-size');
    const sizeStyle = el.style.fontSize;
    let sizeKey: string | null = null;
    if (dataSize && ['xs', 'sm', 'base', 'lg', 'xl'].includes(dataSize)) {
      sizeKey = dataSize;
    } else if (sizeStyle) {
      sizeKey = parseFontSize(sizeStyle);
    }

    // Background detection
    const bgStyle = el.style.backgroundColor;
    const dataBg = el.getAttribute('data-bg');
    const rawBg = bgStyle || dataBg;
    let bgHex: string | null = null;
    if (rawBg) {
      const hex = rgbToHex(rawBg);
      if (hex && hex !== 'TRANSPARENT' && hex !== 'RGBA(0, 0, 0, 0)') {
        bgHex = hex;
      }
    }

    let wrapped = inner;
    if (isBold && wrapped) wrapped = `**${wrapped}**`;
    if (isItalic && wrapped) wrapped = `*${wrapped}*`;
    if (isUnderline && wrapped) wrapped = `__${wrapped}__`;
    if (isStrike && wrapped) wrapped = `~~${wrapped}~~`;
    if (colorHex && wrapped) {
      // If inner is already fully wrapped in a color tag, the innermost (more specific) color prevails
      if (/^\[color=[^\]]+\][\s\S]*?\[\/color\]$/.test(wrapped.trim())) {
        // Child color takes precedence, don't wrap outer
      } else {
        wrapped = `[color=${colorHex}]${wrapped}[/color]`;
      }
    }
    if (sizeKey && wrapped) {
      // If inner is already fully wrapped in a size tag, overwrite it cleanly
      if (/^\[size=[^\]]+\][\s\S]*?\[\/size\]$/.test(wrapped.trim())) {
        wrapped = `[size=${sizeKey}]${wrapped.trim().replace(/^\[size=[^\]]+\]|\[\/size\]$/g, '')}[/size]`;
      } else {
        wrapped = `[size=${sizeKey}]${wrapped}[/size]`;
      }
    }
    if (bgHex && wrapped) wrapped = `[bg=${bgHex}]${wrapped}[/bg]`;

    if (tag === 'div' || tag === 'p') {
      if (!wrapped && el.childNodes.length === 0) return '\n';
      return wrapped + '\n';
    }

    return wrapped;
  }

  let result = walk(container);
  result = result.replace(/\n+$/, '');
  // Collapse any nested color tags e.g. [color=A][color=B]text[/color][/color] -> [color=B]text[/color]
  while (/\[color=[^\]]+\]\s*(\[color=[^\]]+\][\s\S]*?\[\/color\])\s*\[\/color\]/.test(result)) {
    result = result.replace(/\[color=[^\]]+\]\s*(\[color=[^\]]+\][\s\S]*?\[\/color\])\s*\[\/color\]/g, '$1');
  }
  // Collapse any nested size tags e.g. [size=A][size=B]text[/size][/size] -> [size=B]text[/size]
  while (/\[size=[^\]]+\]\s*(\[size=[^\]]+\][\s\S]*?\[\/size\])\s*\[\/size\]/.test(result)) {
    result = result.replace(/\[size=[^\]]+\]\s*(\[size=[^\]]+\][\s\S]*?\[\/size\])\s*\[\/size\]/g, '$1');
  }
  return result;
}
