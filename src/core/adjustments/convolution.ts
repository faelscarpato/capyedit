import { clamp255 } from '../color/colorMath';

export function applyDetailPass(imageData: ImageData, sharpen: number, noiseReduction: number): ImageData {
  if (sharpen <= 0 && noiseReduction <= 0) return imageData;
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);
  const out = new Uint8ClampedArray(data);
  const noise = Math.min(1, Math.max(0, noiseReduction / 100));
  const sharp = Math.min(1, Math.max(0, sharpen / 100));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = src[i + c];
        const blur = (
          src[((y - 1) * width + x) * 4 + c] +
          src[((y + 1) * width + x) * 4 + c] +
          src[(y * width + x - 1) * 4 + c] +
          src[(y * width + x + 1) * 4 + c] +
          center * 2
        ) / 6;
        const denoised = center * (1 - noise * 0.55) + blur * noise * 0.55;
        const unsharp = denoised + (center - blur) * sharp * 1.9;
        out[i + c] = clamp255(unsharp);
      }
    }
  }

  return new ImageData(out, width, height);
}
