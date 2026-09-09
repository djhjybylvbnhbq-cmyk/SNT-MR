// 25 numbered streets in SNT "Mezhdurechye" (no named streets)
export const SNT_STREETS: string[] = Array.from(
  { length: 25 },
  (_, i) => `${i + 1}-я улица`
);

/**
 * Normalizes any street representation ('4', '4-я улица', '4 улица', 'ул. 4')
 * into the standard '4-я улица' format.
 */
export function formatStreetName(raw: string | undefined | null): string {
  if (!raw) return '1-я улица';
  const trimmed = raw.trim();
  const numMatch = trimmed.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    if (num >= 1 && num <= 25) {
      return `${num}-я улица`;
    }
  }
  return trimmed || '1-я улица';
}

/**
 * Extracts just the number of the street (e.g., '4' from '4-я улица')
 */
export function getStreetNumber(raw: string | undefined | null): string {
  if (!raw) return '1';
  const numMatch = raw.match(/\d+/);
  return numMatch ? numMatch[0] : '1';
}
