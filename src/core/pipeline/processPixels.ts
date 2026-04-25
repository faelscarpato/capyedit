import type { EditState } from '../../types/editor';
import { applyGlobalAdjustments, applyLocalAdjustments } from '../adjustments/adjustments';
import { applyDetailPass } from '../adjustments/convolution';
import { maskWeight } from '../masks/masks';

export type ProcessPayload = {
  imageData: ImageData;
  edit: EditState;
};

export function processPixels(imageData: ImageData, edit: EditState): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    const yn = height <= 1 ? 0 : y / (height - 1);
    for (let x = 0; x < width; x++) {
      const xn = width <= 1 ? 0 : x / (width - 1);
      const i = (y * width + x) * 4;
      let [r, g, b] = applyGlobalAdjustments(data[i], data[i + 1], data[i + 2], edit, xn, yn);

      for (const mask of edit.masks) {
        const w = maskWeight(mask, xn, yn);
        if (w > 0.001) {
          [r, g, b] = applyLocalAdjustments(r, g, b, mask.adjustments, w);
        }
      }

      output[i] = r;
      output[i + 1] = g;
      output[i + 2] = b;
      output[i + 3] = data[i + 3];
    }
  }

  const firstPass = new ImageData(output, width, height);
  return applyDetailPass(firstPass, edit.sharpen, edit.noiseReduction);
}
