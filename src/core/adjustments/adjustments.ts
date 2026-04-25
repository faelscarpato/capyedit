import type { CurvePointState, EditState, HSLState, LocalAdjustmentState } from '../../types/editor';
import { bandWeight, clamp, clamp255, hslToRgb, luminance, mix, rgbToHsl, stableNoise } from '../color/colorMath';

export type Pixel = [number, number, number];

export function applyChannelCurve(value: number, curve: CurvePointState): number {
  let v = value / 255;
  const shadows = curve.shadows / 100;
  const midtones = curve.midtones / 100;
  const highlights = curve.highlights / 100;
  const shadowWeight = clamp(1 - v * 2, 0, 1);
  const highlightWeight = clamp((v - 0.5) * 2, 0, 1);
  const midWeight = 1 - Math.abs(v - 0.5) * 2;

  v += shadows * shadowWeight * 0.28;
  v += highlights * highlightWeight * 0.28;
  if (midtones !== 0) {
    const gamma = Math.pow(1.85, -midtones);
    v = mix(v, Math.pow(clamp(v), gamma), midWeight);
  }
  return clamp255(v * 255);
}

export function applyGlobalAdjustments(r: number, g: number, b: number, edit: EditState, x = 0, y = 0): Pixel {
  let rr = r;
  let gg = g;
  let bb = b;
  const lum = luminance(rr, gg, bb);

  const exposureFactor = Math.pow(2, edit.exposure);
  rr *= exposureFactor;
  gg *= exposureFactor;
  bb *= exposureFactor;

  const contrastFactor = 1 + edit.contrast / 100;
  rr = (rr - 128) * contrastFactor + 128;
  gg = (gg - 128) * contrastFactor + 128;
  bb = (bb - 128) * contrastFactor + 128;

  const highlightWeight = clamp((lum - 0.45) / 0.55);
  const shadowWeight = clamp((0.55 - lum) / 0.55);
  const whitesWeight = clamp((lum - 0.72) / 0.28);
  const blacksWeight = clamp((0.28 - lum) / 0.28);

  const tonalDelta =
    edit.highlights * highlightWeight * 0.72 +
    edit.shadows * shadowWeight * 0.72 +
    edit.whites * whitesWeight * 0.62 -
    edit.blacks * blacksWeight * 0.62;
  rr += tonalDelta;
  gg += tonalDelta;
  bb += tonalDelta;

  // Temperature/tint approximation in RGB space. It preserves the original pixels because it is recalculated every render.
  rr += edit.temperature * 0.9 + edit.tint * 0.25;
  gg += edit.tint * -0.35;
  bb += edit.temperature * -0.9 + edit.tint * 0.55;

  // Dehaze approximation: adds mid contrast and gently lowers haze-like gray lift.
  if (edit.dehaze !== 0) {
    const d = edit.dehaze / 100;
    rr = (rr - 128) * (1 + d * 0.55) + 128 - d * 7;
    gg = (gg - 128) * (1 + d * 0.55) + 128 - d * 7;
    bb = (bb - 128) * (1 + d * 0.55) + 128 - d * 7;
  }

  // Clarity approximation: microcontrast-like midtone contrast without convolution.
  if (edit.clarity !== 0) {
    const c = edit.clarity / 100;
    const midtone = 1 - Math.abs(lum - 0.5) * 2;
    const factor = 1 + c * 0.45 * midtone;
    rr = (rr - 128) * factor + 128;
    gg = (gg - 128) * factor + 128;
    bb = (bb - 128) * factor + 128;
  }

  [rr, gg, bb] = applySaturation(rr, gg, bb, edit.saturation / 100, edit.vibrance / 100);
  [rr, gg, bb] = applyHslAdjustments(rr, gg, bb, edit.hsl);

  rr = applyChannelCurve(rr, edit.curves.master);
  gg = applyChannelCurve(gg, edit.curves.master);
  bb = applyChannelCurve(bb, edit.curves.master);
  rr = applyChannelCurve(rr, edit.curves.red);
  gg = applyChannelCurve(gg, edit.curves.green);
  bb = applyChannelCurve(bb, edit.curves.blue);

  if (edit.vignette !== 0) {
    const dx = x - 0.5;
    const dy = y - 0.5;
    const dist = clamp(Math.sqrt(dx * dx + dy * dy) / 0.72);
    const amount = edit.vignette / 100;
    const v = 1 - amount * dist * dist * 0.85;
    rr *= v;
    gg *= v;
    bb *= v;
  }

  if (edit.grain > 0) {
    const n = stableNoise((x * 7349 + y * 9157 + edit.grain * 19) * 10000) - 0.5;
    const grain = n * edit.grain * 1.15;
    rr += grain;
    gg += grain;
    bb += grain;
  }

  return [clamp255(rr), clamp255(gg), clamp255(bb)];
}

export function applyLocalAdjustments(r: number, g: number, b: number, local: LocalAdjustmentState, weight: number): Pixel {
  if (weight <= 0) return [r, g, b];
  const exposureFactor = Math.pow(2, local.exposure * weight);
  let rr = r * exposureFactor;
  let gg = g * exposureFactor;
  let bb = b * exposureFactor;
  const c = 1 + (local.contrast / 100) * weight;
  rr = (rr - 128) * c + 128;
  gg = (gg - 128) * c + 128;
  bb = (bb - 128) * c + 128;
  [rr, gg, bb] = applySaturation(rr, gg, bb, (local.saturation / 100) * weight, 0);
  return [clamp255(rr), clamp255(gg), clamp255(bb)];
}

export function applySaturation(r: number, g: number, b: number, saturation: number, vibrance: number): Pixel {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  let rr = mix(gray, r, 1 + saturation);
  let gg = mix(gray, g, 1 + saturation);
  let bb = mix(gray, b, 1 + saturation);

  if (vibrance !== 0) {
    const max = Math.max(rr, gg, bb);
    const avg = (rr + gg + bb) / 3;
    const satLevel = clamp((max - avg) / 128);
    const vib = vibrance * (1 - satLevel) * 0.9;
    rr = mix(gray, rr, 1 + vib);
    gg = mix(gray, gg, 1 + vib);
    bb = mix(gray, bb, 1 + vib);
  }
  return [rr, gg, bb];
}

export function applyHslAdjustments(r: number, g: number, b: number, hsl: HSLState): Pixel {
  let [h, s, l] = rgbToHsl(clamp255(r), clamp255(g), clamp255(b));
  for (const [band, range] of Object.entries(hsl) as [keyof HSLState, HSLState[keyof HSLState]][]) {
    const weight = bandWeight(h, band);
    if (weight > 0) {
      h += range.hue * weight;
      s = clamp(s + (range.saturation / 100) * weight);
      l = clamp(l + (range.luminance / 100) * 0.45 * weight);
    }
  }
  return hslToRgb(h, s, l);
}
