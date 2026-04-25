import type { HSLBand } from '../../types/editor';

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp255(value: number): number {
  return Math.min(255, Math.max(0, value));
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  s = clamp(s);
  l = clamp(l);
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hueToRgb(p, q, h + 1 / 3) * 255,
    hueToRgb(p, q, h) * 255,
    hueToRgb(p, q, h - 1 / 3) * 255
  ];
}

export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export const HSL_BAND_HUES: Record<HSLBand, number> = {
  red: 0,
  orange: 30,
  yellow: 60,
  green: 120,
  aqua: 180,
  blue: 225,
  purple: 275,
  magenta: 315
};

export function nearestBand(hue: number): HSLBand {
  let winner: HSLBand = 'red';
  let best = 999;
  for (const [band, center] of Object.entries(HSL_BAND_HUES) as [HSLBand, number][]) {
    const diff = Math.min(Math.abs(hue - center), 360 - Math.abs(hue - center));
    if (diff < best) {
      best = diff;
      winner = band;
    }
  }
  return winner;
}

export function bandWeight(hue: number, band: HSLBand): number {
  const center = HSL_BAND_HUES[band];
  const diff = Math.min(Math.abs(hue - center), 360 - Math.abs(hue - center));
  return clamp(1 - diff / 42, 0, 1);
}

export function stableNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
