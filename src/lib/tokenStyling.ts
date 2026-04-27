/**
 * Token underline styling — flat SVG bar (Pūrākau-style technique).
 * Connector-shaped ends are omitted; bar thickness is tuned for vocab list readability.
 */
import type { CSSProperties } from 'react';

export const UNDERLINE_THICKNESS = 6;

export const FALLBACK_POS_COLOR = '#e5e7eb';

export function isValidTokenColor(color: string | null | undefined): boolean {
  return !!color && /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function getPosTypeBackgroundColor(color: string | null | undefined): string {
  return isValidTokenColor(color) ? color! : FALLBACK_POS_COLOR;
}

const VIEWBOX_H = UNDERLINE_THICKNESS;

function underlineSvgFlat(color: string): string {
  const enc = encodeURIComponent(color);
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 ${VIEWBOX_H}' preserveAspectRatio='none'%3E%3Crect x='0' y='0' width='100' height='${VIEWBOX_H}' fill='${enc}'/%3E%3C/svg%3E")`;
}

export type UnderlineCapStyle = 'left' | 'right' | 'flat' | 'both';

export function getUnderlineCapClass(cap: UnderlineCapStyle): string {
  switch (cap) {
    case 'left':
      return 'rounded-l';
    case 'right':
      return 'rounded-r';
    case 'both':
      return 'rounded';
    default:
      return '';
  }
}

/** Flat POS underline (same data-URL technique as Pūrākau). */
export function getTokenStyle(
  underlineColor: string | null | undefined,
  _connectorConfigLeft?: unknown,
  _connectorConfigRight?: unknown,
  _connectorConfigLegacy?: unknown,
  _connectorEndLegacy?: 'left' | 'right',
): CSSProperties | undefined {
  if (!isValidTokenColor(underlineColor)) return undefined;
  const color = underlineColor as string;
  const t = UNDERLINE_THICKNESS;
  return {
    backgroundImage: underlineSvgFlat(color),
    backgroundSize: `100% ${t}px`,
    backgroundPosition: 'bottom',
    backgroundRepeat: 'no-repeat',
    paddingBottom: t,
    paddingLeft: 0,
    paddingRight: 0,
  };
}

export const TOKEN_CLASS_BASE = 'rounded';
export const TOKEN_CLASS_INTERACTIVE = 'cursor-pointer hover:bg-gray-100';

export function splitWordAndPunctuation(text: string): { leading: string; word: string; trailing: string } {
  const leadingMatch = text.match(/^[.,;:!?'"()[\]{}–—…\u2018\u2019\u201C\u201D\s]+/);
  const trailingMatch = text.match(/[.,;:!?'"()[\]{}–—…\u2018\u2019\u201C\u201D\s]+$/);
  const leading = leadingMatch?.[0] ?? '';
  const trailing = trailingMatch?.[0] ?? '';
  const word = text.slice(leading.length, text.length - trailing.length);
  return { leading, word, trailing };
}
