export type RGBChannel = 'master' | 'red' | 'green' | 'blue';
export type HSLBand = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta';
export type MaskKind = 'linear' | 'radial' | 'brush';
export type ExportFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export type CurvePointState = {
  shadows: number;
  midtones: number;
  highlights: number;
};

export type CurveState = Record<RGBChannel, CurvePointState>;

export type HSLRange = {
  hue: number;
  saturation: number;
  luminance: number;
};

export type HSLState = Record<HSLBand, HSLRange>;

export type CropState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LocalAdjustmentState = {
  exposure: number;
  contrast: number;
  saturation: number;
  sharpen: number;
};

export type BrushPoint = {
  x: number;
  y: number;
  pressure: number;
};

export type MaskState = {
  id: string;
  name: string;
  kind: MaskKind;
  enabled: boolean;
  invert: boolean;
  x: number;
  y: number;
  x2: number;
  y2: number;
  radius: number;
  feather: number;
  opacity: number;
  brushSize: number;
  strokes: BrushPoint[][];
  adjustments: LocalAdjustmentState;
};

export type EditState = {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  clarity: number;
  dehaze: number;
  sharpen: number;
  noiseReduction: number;
  vignette: number;
  grain: number;
  curves: CurveState;
  hsl: HSLState;
  crop: CropState;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  masks: MaskState[];
};

export type LoadedImage = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  width: number;
  height: number;
  megapixels: number;
  objectUrl: string;
  bitmap: ImageBitmap;
  importedAt: number;
};

export type HistoryEntry = {
  label: string;
  at: number;
  edit: EditState;
};

export type ExportOptions = {
  format: ExportFormat;
  quality: number;
  maxEdge: number;
};

export type RenderQuality = 'preview' | 'final';

export type RenderOptions = {
  quality: RenderQuality;
  maxDimension?: number;
  useWorker?: boolean;
  showBefore?: boolean;
};

export type Histogram = {
  red: Uint32Array;
  green: Uint32Array;
  blue: Uint32Array;
  luma: Uint32Array;
};
