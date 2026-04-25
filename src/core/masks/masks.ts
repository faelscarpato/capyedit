import type { MaskState } from '../../types/editor';
import { clamp } from '../color/colorMath';

export function maskWeight(mask: MaskState, x: number, y: number): number {
  if (!mask.enabled) return 0;
  let weight = 0;
  if (mask.kind === 'linear') weight = linearWeight(mask, x, y);
  if (mask.kind === 'radial') weight = radialWeight(mask, x, y);
  if (mask.kind === 'brush') weight = brushWeight(mask, x, y);
  weight = mask.invert ? 1 - weight : weight;
  return clamp(weight * mask.opacity, 0, 1);
}

function linearWeight(mask: MaskState, x: number, y: number): number {
  const ax = mask.x;
  const ay = mask.y;
  const bx = mask.x2;
  const by = mask.y2;
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = Math.max(0.00001, vx * vx + vy * vy);
  const t = ((x - ax) * vx + (y - ay) * vy) / lenSq;
  const feather = Math.max(0.02, mask.feather);
  return clamp((t + feather) / (1 + feather));
}

function radialWeight(mask: MaskState, x: number, y: number): number {
  const dx = x - mask.x;
  const dy = y - mask.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const inner = mask.radius * (1 - mask.feather);
  const outer = Math.max(inner + 0.001, mask.radius);
  return 1 - smoothstep(inner, outer, dist);
}

function brushWeight(mask: MaskState, x: number, y: number): number {
  let maxWeight = 0;
  const radius = Math.max(0.005, mask.brushSize);
  for (const stroke of mask.strokes) {
    for (const point of stroke) {
      const dx = x - point.x;
      const dy = y - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const local = (1 - smoothstep(radius * (1 - mask.feather), radius, dist)) * point.pressure;
      if (local > maxWeight) maxWeight = local;
    }
  }
  return maxWeight;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
