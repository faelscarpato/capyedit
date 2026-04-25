import type { EditState } from '../../types/editor';

export type Preset = {
  name: string;
  description: string;
  patch: Partial<EditState>;
};

export const PRESETS: Preset[] = [
  { name: 'Clean Editorial', description: 'Contraste moderado, cor limpa.', patch: { exposure: 0.08, contrast: 12, highlights: -16, shadows: 12, whites: 8, blacks: 8, vibrance: 14, clarity: 8 } },
  { name: 'Warm Film', description: 'Temperatura quente, grão leve.', patch: { temperature: 16, tint: 4, contrast: 8, highlights: -10, shadows: 8, vibrance: 8, grain: 12, vignette: 10 } },
  { name: 'Moody Matte', description: 'Pretos erguidos e baixa saturação.', patch: { exposure: -0.08, contrast: -5, blacks: -18, shadows: 16, saturation: -12, dehaze: 8, vignette: 18 } },
  { name: 'Product Sharp', description: 'Detalhe limpo para produto.', patch: { exposure: 0.12, contrast: 10, whites: 14, blacks: 8, clarity: 10, sharpen: 32, noiseReduction: 8 } },
  { name: 'Night Recovery', description: 'Sombras abertas com ruído controlado.', patch: { exposure: 0.25, highlights: -35, shadows: 42, blacks: 4, noiseReduction: 32, sharpen: 10, vibrance: 8 } }
];
