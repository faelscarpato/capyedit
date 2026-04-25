import type { Histogram } from '../../types/editor';
import { luminance } from '../color/colorMath';

export function emptyHistogram(): Histogram {
  return {
    red: new Uint32Array(256),
    green: new Uint32Array(256),
    blue: new Uint32Array(256),
    luma: new Uint32Array(256)
  };
}

export function computeHistogram(canvas: HTMLCanvasElement, sampleStep = 4): Histogram {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return emptyHistogram();
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  const histogram = emptyHistogram();
  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    histogram.red[r]++;
    histogram.green[g]++;
    histogram.blue[b]++;
    histogram.luma[Math.round(luminance(r, g, b) * 255)]++;
  }
  return histogram;
}
