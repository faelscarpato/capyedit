import type { EditState, ExportOptions, LoadedImage } from '../../types/editor';
import { renderToCanvas } from '../pipeline/renderPipeline';

/**
 * Renderiza a imagem com todas as edições aplicadas e retorna um Blob
 * pronto para download.
 *
 * NOTA: renderToCanvas agora retorna { canvas, pipeline } — extraímos
 * apenas o canvas antes de chamar toBlob.
 */
export async function exportEditedImage(
  image: LoadedImage,
  edit: EditState,
  options: ExportOptions
): Promise<Blob> {
  const { canvas } = await renderToCanvas(image, edit, {
    quality: 'final',
    maxDimension: options.maxEdge,
    useWorker: true,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao gerar blob — canvas pode estar vazio ou contaminado (tainted).'));
      },
      options.format,
      options.format === 'image/png' ? undefined : options.quality
    );
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

export function exportFileName(original: string, mime: string): string {
  const stem = original.replace(/\.[^.]+$/, '');
  const ext  = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `${stem}-capy.${ext}`;
}

/** Estimativa de tamanho do arquivo em KB (heurística rápida) */
export function estimateSizeKB(
  width: number,
  height: number,
  format: string,
  quality: number
): number {
  const px = width * height;
  if (format === 'image/png')  return Math.round(px * 3 / 1024);       // ~3 bytes/px sem compressão
  if (format === 'image/webp') return Math.round(px * 0.3 * quality / 1024);
  return Math.round(px * 0.5 * quality / 1024); // jpeg
}
