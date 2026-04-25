import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { renderToCanvas } from '../../core/pipeline/renderPipeline';
import { recommendedPreviewMaxDimension } from '../../core/performance/device';
import { computeHistogram } from '../../core/performance/histogram';
import type { Histogram } from '../../types/editor';

type Props = {
  onHistogram?: (histogram: Histogram | null) => void;
  registerFit?: (fit: () => void) => void;
};

type PointerState = {
  x: number;
  y: number;
  panX: number;
  panY: number;
};

export function ImageCanvas({ onHistogram, registerFit }: Props) {
  const { image, edit, showBefore, dispatch } = useEditorStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<PointerState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const debouncedEdit = useDebouncedValue(edit, 70);

  const drawViewport = useCallback(() => {
    const canvas = canvasRef.current;
    const rendered = renderedRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = wrapper.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, rect.width, rect.height);

    drawChecker(ctx, rect.width, rect.height);

    if (!rendered) {
      drawEmpty(ctx, rect.width, rect.height);
      return;
    }

    const baseScale = Math.min(rect.width / rendered.width, rect.height / rendered.height) * 0.92;
    const finalScale = baseScale * zoom;
    const w = rendered.width * finalScale;
    const h = rendered.height * finalScale;
    const x = rect.width / 2 - w / 2 + pan.x;
    const y = rect.height / 2 - h / 2 + pan.y;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(rendered, x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }, [pan.x, pan.y, zoom]);

  const fit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    window.requestAnimationFrame(drawViewport);
  }, [drawViewport]);

  useEffect(() => {
    registerFit?.(fit);
  }, [fit, registerFit]);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!image) {
        renderedRef.current = null;
        onHistogram?.(null);
        drawViewport();
        return;
      }
      dispatch({ type: 'set-rendering', value: true });
      try {
        const canvas = await renderToCanvas(image, debouncedEdit, {
          quality: 'preview',
          maxDimension: recommendedPreviewMaxDimension(),
          showBefore
        });
        if (cancelled) return;
        renderedRef.current = canvas;
        onHistogram?.(computeHistogram(canvas, 5));
        dispatch({ type: 'set-error', error: null });
        drawViewport();
      } catch (error) {
        if (!cancelled) dispatch({ type: 'set-error', error: error instanceof Error ? error.message : 'Erro ao renderizar preview.' });
      } finally {
        if (!cancelled) dispatch({ type: 'set-rendering', value: false });
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [image, debouncedEdit, showBefore, dispatch, onHistogram]);

  useEffect(() => {
    drawViewport();
    const resize = () => drawViewport();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawViewport]);

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    (event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId);
    pointerRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current) return;
    const next = {
      x: pointerRef.current.panX + event.clientX - pointerRef.current.x,
      y: pointerRef.current.panY + event.clientY - pointerRef.current.y
    };
    setPan(next);
  };
  const pointerUp = () => {
    pointerRef.current = null;
  };
  const wheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setZoom((current) => Math.max(0.15, Math.min(8, current * (event.deltaY > 0 ? 0.92 : 1.08))));
  };

  return (
    <div className="canvas-wrap" ref={wrapperRef}>
      <canvas
        ref={canvasRef}
        className="main-canvas"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onWheel={wheel}
        aria-label="Área de edição da imagem"
      />
      <div className="canvas-tools">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.15, z - 0.15))}>−</button>
        <button type="button" onClick={fit}>{Math.round(zoom * 100)}%</button>
        <button type="button" onClick={() => setZoom((z) => Math.min(8, z + 0.15))}>+</button>
      </div>
    </div>
  );
}

function drawChecker(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const size = 20;
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = (x / size + y / size) % 2 === 0 ? 'rgba(255,255,255,.018)' : 'rgba(255,255,255,.03)';
      ctx.fillRect(x, y, size, size);
    }
  }
}

function drawEmpty(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.font = '600 16px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Importe uma foto para começar', width / 2, height / 2 - 8);
  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.font = '400 13px system-ui';
  ctx.fillText('JPEG, PNG, WebP e AVIF quando suportado', width / 2, height / 2 + 18);
}
