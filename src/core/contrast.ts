// WCAG 2.x relative luminance and contrast ratio algorithms

interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

function sRGBtoLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: RGB): number {
  const r = sRGBtoLinear(color.r);
  const g = sRGBtoLinear(color.g);
  const b = sRGBtoLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(color1: RGB, color2: RGB): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsAA(ratio: number, isLargeText: boolean): boolean {
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

export function meetsAAA(ratio: number, isLargeText: boolean): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

export function parseHexColor(hex: string): RGB {
  const cleaned = hex.replace("#", "");
  const fullHex =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;

  return {
    r: parseInt(fullHex.slice(0, 2), 16),
    g: parseInt(fullHex.slice(2, 4), 16),
    b: parseInt(fullHex.slice(4, 6), 16),
  };
}

export function parseRGBString(
  rgb: string,
): RGB | null {
  const match = rgb.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/,
  );
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
}
