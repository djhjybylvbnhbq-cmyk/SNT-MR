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

  // Regex matching supported outer tags
  const tagRegex =
    /(\[color=([#a-zA-Z0-9]+)\]([\s\S]*?)\[\/color\]|\[size=(xs|sm|base|lg|xl)\]([\s\S]*?)\[\/size\]|\[bg=([#a-zA-Z0-9]+)\]([\s\S]*?)\[\/bg\]|\*\*([\s\S]+?)\*\*|\*([^\*\n]+?)\*|__([\s\S]+?)__|~~([\s\S]+?)~~)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
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

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
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
