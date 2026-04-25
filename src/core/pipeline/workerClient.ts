import type { EditState } from '../../types/editor';

export async function processImageDataInWorker(imageData: ImageData, edit: EditState): Promise<ImageData> {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Web Worker indisponível'));
  const worker = new Worker(new URL('../../workers/pixel.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<{ ok: boolean; imageData?: ImageData; error?: string }>) => {
      worker.terminate();
      if (event.data.ok && event.data.imageData) resolve(event.data.imageData);
      else reject(new Error(event.data.error ?? 'Falha ao processar imagem no worker'));
    };
    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error(error.message));
    };
    worker.postMessage({ imageData, edit }, [imageData.data.buffer]);
  });
}
