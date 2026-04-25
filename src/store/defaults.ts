import type { CurvePointState, CurveState, EditState, ExportOptions, HSLBand, HSLRange, HSLState, MaskKind, MaskState } from '../types/editor';

export const DEFAULT_CURVE_POINT: CurvePointState = {
  shadows: 0,
  midtones: 0,
  highlights: 0
};

export const DEFAULT_CURVES: CurveState = {
  master: { ...DEFAULT_CURVE_POINT },
  red: { ...DEFAULT_CURVE_POINT },
  green: { ...DEFAULT_CURVE_POINT },
  blue: { ...DEFAULT_CURVE_POINT }
};

const defaultHslRange = (): HSLRange => ({ hue: 0, saturation: 0, luminance: 0 });

export const HSL_BANDS: HSLBand[] = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];

export const DEFAULT_HSL: HSLState = HSL_BANDS.reduce((acc, band) => {
  acc[band] = defaultHslRange();
  return acc;
}, {} as HSLState);

export const DEFAULT_EDIT_STATE: EditState = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  clarity: 0,
  dehaze: 0,
  sharpen: 0,
  noiseReduction: 0,
  vignette: 0,
  grain: 0,
  curves: DEFAULT_CURVES,
  hsl: DEFAULT_HSL,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  rotation: 0,
  flipX: false,
  flipY: false,
  masks: []
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'image/jpeg',
  quality: 0.92,
  maxEdge: 4096
};

export function cloneEdit(edit: EditState): EditState {
  return JSON.parse(JSON.stringify(edit)) as EditState;
}

export function createMask(kind: MaskKind): MaskState {
  const id = crypto.randomUUID?.() ?? String(Date.now() + Math.random());
  const base = {
    id,
    kind,
    enabled: true,
    invert: false,
    x: 0.5,
    y: 0.5,
    x2: kind === 'linear' ? 0.5 : 0.75,
    y2: kind === 'linear' ? 0.05 : 0.75,
    radius: kind === 'radial' ? 0.36 : 0.22,
    feather: 0.45,
    opacity: 1,
    brushSize: 0.06,
    strokes: [],
    adjustments: {
      exposure: kind === 'linear' ? 0.25 : 0.15,
      contrast: 6,
      saturation: 0,
      sharpen: 0
    }
  };

  return {
    ...base,
    name: kind === 'linear' ? 'Gradiente linear' : kind === 'radial' ? 'Máscara radial' : 'Pincel local'
  };
}
