import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { renderToCanvas } from '../../core/pipeline/renderPipeline';
import { recommendedPreviewMaxDimension } from '../../core/performance/device';
import { computeHistogram } from '../../core/performance/histogram';
import type { Histogram } from '../../types/editor';

type Pipeline = 'webgl' | 'worker' | 'cpu';

type Props = {
  onHistogram?:  (histogram: Histogram | null) => void;
  registerFit?:  (fit: () => void) => void;
  onPipeline?:   (pipeline: Pipeline | null) => void;
};

type PointerState = { x: number; y: number; panX: number; panY: number };

export function ImageCanvas({ onHistogram, registerFit, onPipeline }: Props) {
  const { image, edit, showBefore, dispatch } = useEditorStore();
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef  = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef  = useRef<PointerState | null>(null);
  const [zoom, setZoom]       = useState(1);
  const [pan,  setPan]        = useState({ x: 0, y: 0 });
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const debouncedEdit = useDebouncedValue(edit, 70);

  // ── desenho do viewport ───────────────────────────────────────────────
  const drawViewport = useCallback(() => {
    const canvas   = canvasRef.current;
    const rendered = renderedRef.current;
    const wrapper  = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const dpr  = Math.min(2, window.devicePixelRatio || 1);
    const rect = wrapper.getBoundingClientRect();
    canvas.width         = Math.max(1, Math.round(rect.width  * dpr));
    canvas.height        = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width   = `${rect.width}px`;
    canvas.style.height  = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!rendered) {
      drawEmpty(ctx, rect.width, rect.height);
      return;
    }

    const baseScale  = Math.min(rect.width / rendered.width, rect.height / rendered.height) * 0.92;
    const finalScale = baseScale * zoom;
    const w = rendered.width  * finalScale;
    const h = rendered.height * finalScale;
    const x = rect.width  / 2 - w / 2 + pan.x;
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

  useEffect(() => { registerFit?.(fit); }, [fit, registerFit]);

  // ── render pipeline ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!image) {
        renderedRef.current = null;
        onHistogram?.(null);
        onPipeline?.(null);
        setPipeline(null);
        drawViewport();
        return;
      }
      dispatch({ type: 'set-rendering', value: true });
      try {
        const result = await renderToCanvas(image, debouncedEdit, {
          quality: 'preview',
          maxDimension: recommendedPreviewMaxDimension(),
          showBefore,
        });
        if (cancelled) return;
        renderedRef.current = result.canvas;
        setPipeline(result.pipeline);
        onPipeline?.(result.pipeline);
        onHistogram?.(computeHistogram(result.canvas, 5));
        dispatch({ type: 'set-error', error: null });
        drawViewport();
      } catch (error) {
        if (!cancelled)
          dispatch({ type: 'set-error', error: error instanceof Error ? error.message : 'Erro ao renderizar preview.' });
      } finally {
        if (!cancelled) dispatch({ type: 'set-rendering', value: false });
      }
    }
    render();
    return () => { cancelled = true; };
  }, [image, debouncedEdit, showBefore, dispatch, onHistogram, onPipeline]);

  useEffect(() => {
    drawViewport();
    const resize = () => drawViewport();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawViewport]);

  // ── ponteiro + roda ───────────────────────────────────────────────────
  const pointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    pointerRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const pointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current) return;
    setPan({
      x: pointerRef.current.panX + e.clientX - pointerRef.current.x,
      y: pointerRef.current.panY + e.clientY - pointerRef.current.y,
    });
  };
  const pointerUp = () => { pointerRef.current = null; };
  const wheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom(z => Math.max(0.15, Math.min(8, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  };

  const zoomPct = Math.round(zoom * 100);

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

      {/* Indicador de pipeline ativo */}
      {pipeline && (
        <div className="pipeline-badge" title={`Renderizando via ${pipeline.toUpperCase()}`}>
          {pipeline === 'webgl' ? '⚡ GPU' : pipeline === 'worker' ? '🧵 Worker' : '🖥 CPU'}
        </div>
      )}

      {/* Controles de zoom com ARIA e estados disabled */}
      <div className="canvas-tools" role="group" aria-label="Controles de zoom">
        <button
          type="button"
          aria-label="Reduzir zoom"
          disabled={zoom <= 0.15}
          onClick={() => setZoom(z => Math.max(0.15, z - 0.15))}
        >−</button>
        <button
          type="button"
          aria-label={`Zoom atual: ${zoomPct}%. Clique para ajustar à tela`}
          onClick={fit}
        >{zoomPct}%</button>
        <button
          type="button"
          aria-label="Aumentar zoom"
          disabled={zoom >= 8}
          onClick={() => setZoom(z => Math.min(8, z + 0.15))}
        >+</button>
      </div>
    </div>
  );
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
