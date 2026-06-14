import type { EditState, LoadedImage, RenderOptions } from '../../types/editor';
import { processPixels } from './processPixels';
import { processImageDataInWorker } from './workerClient';
import { isWebGL2Supported, processPixelsWebGL } from './webglPipeline';

/**
 * Limiar em megapixels acima do qual o WebGL é preferido ao CPU/Worker.
 * Abaixo disso o overhead de texImage2D + readPixels não compensa.
 */
const WEBGL_MP_THRESHOLD = 1.0; // 1 MP = ~1024×1024

function normalizeRotation(rotation: number): number {
  const r = ((rotation % 360) + 360) % 360;
  return [0, 90, 180, 270].includes(r) ? r : Math.round(r / 90) * 90;
}

export function computeRenderSize(
  image: LoadedImage,
  edit: EditState,
  maxDimension?: number
): { width: number; height: number } {
  const cropW = Math.max(1, Math.round(image.width  * edit.crop.width));
  const cropH = Math.max(1, Math.round(image.height * edit.crop.height));
  const rot   = normalizeRotation(edit.rotation);
  const rawW  = rot === 90 || rot === 270 ? cropH : cropW;
  const rawH  = rot === 90 || rot === 270 ? cropW : cropH;
  const max   = maxDimension && maxDimension > 0 ? maxDimension : Math.max(rawW, rawH);
  const scale = Math.min(1, max / Math.max(rawW, rawH));
  return { width: Math.max(1, Math.round(rawW * scale)), height: Math.max(1, Math.round(rawH * scale)) };
}

/**
 * Seleciona o pipeline de processamento mais adequado.
 *
 * Ordem de prioridade:
 *  1. WebGL2  — quando disponível e imagem >= WEBGL_MP_THRESHOLD MP
 *  2. Worker  — quando solicitado (options.useWorker)
 *  3. CPU     — fallback sempre disponível
 */
async function processImageData(
  imageData: ImageData,
  edit: EditState,
  options: RenderOptions
): Promise<{ data: ImageData; pipeline: 'webgl' | 'worker' | 'cpu' }> {
  const megapixels = (imageData.width * imageData.height) / 1_000_000;

  if (isWebGL2Supported() && megapixels >= WEBGL_MP_THRESHOLD) {
    try {
      return { data: processPixelsWebGL(imageData, edit), pipeline: 'webgl' };
    } catch (err) {
      console.warn('[CapyEdit] WebGL falhou, usando fallback CPU:', err);
    }
  }

  if (options.useWorker) {
    try {
      return { data: await processImageDataInWorker(imageData, edit), pipeline: 'worker' };
    } catch {
      // fallthrough para CPU
    }
  }

  return { data: processPixels(imageData, edit), pipeline: 'cpu' };
}

export async function renderToCanvas(
  image: LoadedImage,
  edit: EditState,
  options: RenderOptions
): Promise<{ canvas: HTMLCanvasElement; pipeline: 'webgl' | 'worker' | 'cpu' }> {
  const maxDimension = options.maxDimension ?? (options.quality === 'preview' ? 1600 : undefined);
  const size   = computeRenderSize(image, edit, maxDimension);
  const canvas = document.createElement('canvas');
  canvas.width  = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponível neste navegador.');

  drawSourceToCanvas(ctx, image, edit, size.width, size.height);
  if (options.showBefore) return { canvas, pipeline: 'cpu' };

  const imageData = ctx.getImageData(0, 0, size.width, size.height);
  const { data: processed, pipeline } = await processImageData(imageData, edit, options);
  ctx.putImageData(processed, 0, 0);
  return { canvas, pipeline };
}

function drawSourceToCanvas(
  ctx: CanvasRenderingContext2D,
  image: LoadedImage,
  edit: EditState,
  width: number,
  height: number
): void {
  const rot = normalizeRotation(edit.rotation);
  const sx  = Math.round(edit.crop.x      * image.width);
  const sy  = Math.round(edit.crop.y      * image.height);
  const sw  = Math.max(1, Math.round(edit.crop.width  * image.width));
  const sh  = Math.max(1, Math.round(edit.crop.height * image.height));

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled  = true;
  ctx.imageSmoothingQuality  = 'high';
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(edit.flipX ? -1 : 1, edit.flipY ? -1 : 1);

  const drawW = rot === 90 || rot === 270 ? height : width;
  const drawH = rot === 90 || rot === 270 ? width  : height;
  ctx.drawImage(image.bitmap, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}
