import { useEffect, useRef } from 'react';
import type { Histogram } from '../../types/editor';

type Props = {
  histogram: Histogram | null;
};

export function HistogramCanvas({ histogram }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || 260;
    const height = canvas.clientHeight || 96;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    ctx.fillRect(0, 0, width, height);
    if (!histogram) {
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.font = '12px system-ui';
      ctx.fillText('Histograma aparece após importar', 12, height / 2);
      return;
    }
    const max = Math.max(...Array.from(histogram.luma), 1);
    drawChannel(ctx, histogram.red, max, width, height, 'rgba(255,96,108,.55)');
    drawChannel(ctx, histogram.green, max, width, height, 'rgba(98,228,183,.55)');
    drawChannel(ctx, histogram.blue, max, width, height, 'rgba(90,154,255,.55)');
    drawChannel(ctx, histogram.luma, max, width, height, 'rgba(255,255,255,.72)');
  }, [histogram]);
  return <canvas ref={ref} className="histogram" aria-label="Histograma RGB" />;
}

function drawChannel(ctx: CanvasRenderingContext2D, values: Uint32Array, max: number, width: number, height: number, color: string) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * width;
    const y = height - (values[i] / max) * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
