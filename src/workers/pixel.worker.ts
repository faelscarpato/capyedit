/// <reference lib="webworker" />
import { processPixels, type ProcessPayload } from '../core/pipeline/processPixels';

self.onmessage = (event: MessageEvent<ProcessPayload>) => {
  try {
    const result = processPixels(event.data.imageData, event.data.edit);
    self.postMessage({ ok: true, imageData: result }, [result.data.buffer]);
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Falha no worker' });
  }
};
