import type { EditState, ExportOptions, LoadedImage } from '../../types/editor';
import { renderToCanvas } from '../pipeline/renderPipeline';

export async function exportEditedImage(image: LoadedImage, edit: EditState, options: ExportOptions): Promise<Blob> {
  const canvas = await renderToCanvas(image, edit, {
    quality: 'final',
    maxDimension: options.maxEdge,
    useWorker: true
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao exportar imagem.'));
      },
      options.format,
      options.format === 'image/png' ? undefined : options.quality
    );
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

export function exportFileName(original: string, mime: string): string {
  const stem = original.replace(/\.[^.]+$/, '');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `${stem}-capy-retouched.${ext}`;
}
