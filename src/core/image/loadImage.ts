import type { LoadedImage } from '../../types/editor';

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export function assertSupportedFile(file: File): void {
  if (!SUPPORTED_MIME_TYPES.has(file.type)) {
    throw new Error('Formato não suportado. Use JPEG, PNG, WebP ou AVIF quando o navegador aceitar AVIF.');
  }
}

export async function loadImageFile(file: File): Promise<LoadedImage> {
  assertSupportedFile(file);
  const maxRecommendedBytes = 32 * 1024 * 1024;
  if (file.size > maxRecommendedBytes) {
    console.warn('Imagem grande: o app vai criar preview otimizado para reduzir risco de travamento.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      width: bitmap.width,
      height: bitmap.height,
      megapixels: (bitmap.width * bitmap.height) / 1_000_000,
      objectUrl,
      bitmap,
      importedAt: Date.now()
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(error instanceof Error ? `Não foi possível abrir a imagem: ${error.message}` : 'Não foi possível abrir a imagem.');
  }
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function imageWarning(image: LoadedImage): string | null {
  if (image.megapixels > 28) return 'Imagem muito grande. Em celulares, use exportação com lado máximo menor para evitar estouro de memória.';
  if (image.megapixels > 14) return 'Imagem grande. O preview usa redução de resolução durante a edição.';
  return null;
}
