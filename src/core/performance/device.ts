export function recommendedPreviewMaxDimension(): number {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (memory <= 2 || coarse) return 1280;
  if (memory <= 4) return 1600;
  return 2048;
}

export function estimateImageMemoryMB(width: number, height: number): number {
  return (width * height * 4) / 1024 / 1024;
}
