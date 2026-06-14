import { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { exportEditedImage, downloadBlob, exportFileName, estimateSizeKB } from '../../core/export/exportImage';
import { computeRenderSize } from '../../core/pipeline/renderPipeline';
import { Slider } from '../sliders/Slider';

const FORMAT_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

const FORMAT_ICONS: Record<string, string> = {
  'image/jpeg': '🖼',
  'image/png': '🔷',
  'image/webp': '⚡',
};

type ExportStatus = 'idle' | 'exporting' | 'done' | 'error';

export function ExportPanel() {
  const { image, edit, exportOptions, dispatch } = useEditorStore();
  const [status, setStatus]   = useState<ExportStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastSize, setLastSize] = useState<number | null>(null);

  const setFormat = (format: typeof exportOptions.format) =>
    dispatch({ type: 'set-export-options', options: { format } });

  const setQuality = useCallback(
    (quality: number) => dispatch({ type: 'set-export-options', options: { quality } }),
    [dispatch]
  );

  const setMaxEdge = useCallback(
    (maxEdge: number) => dispatch({ type: 'set-export-options', options: { maxEdge } }),
    [dispatch]
  );

  const previewSize = image
    ? computeRenderSize(image, edit, exportOptions.maxEdge)
    : null;

  const estKB = previewSize
    ? estimateSizeKB(previewSize.width, previewSize.height, exportOptions.format, exportOptions.quality)
    : null;

  const handleExport = async () => {
    if (!image) return;
    setStatus('exporting');
    setErrorMsg('');
    try {
      const blob = await exportEditedImage(image, edit, exportOptions);
      setLastSize(Math.round(blob.size / 1024));
      const name = exportFileName(image.name, exportOptions.format);
      downloadBlob(blob, name);
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  return (
    <section className="panel-section export-panel">
      {/* Header */}
      <div className="section-title">
        <span>Exportar</span>
        {previewSize && (
          <small>{previewSize.width} × {previewSize.height} px</small>
        )}
      </div>

      {/* Seletor de formato */}
      <div className="export-format-grid">
        {(['image/jpeg', 'image/png', 'image/webp'] as const).map((fmt) => (
          <button
            key={fmt}
            type="button"
            className={exportOptions.format === fmt ? 'export-format-btn is-active' : 'export-format-btn'}
            onClick={() => setFormat(fmt)}
            aria-pressed={exportOptions.format === fmt}
          >
            <span className="export-format-icon">{FORMAT_ICONS[fmt]}</span>
            <span className="export-format-label">{FORMAT_LABELS[fmt]}</span>
          </button>
        ))}
      </div>

      {/* Qualidade — só para JPEG e WebP */}
      {exportOptions.format !== 'image/png' && (
        <Slider
          label="Qualidade"
          value={exportOptions.quality}
          min={0.4}
          max={1}
          step={0.01}
          unit="%"
          onChange={setQuality}
        />
      )}

      {/* Lado máximo */}
      <Slider
        label="Lado máximo"
        value={exportOptions.maxEdge}
        min={512}
        max={8192}
        step={128}
        unit="px"
        onChange={setMaxEdge}
      />

      {/* Estimativa de tamanho */}
      {estKB !== null && (
        <p className="export-size-hint">
          Estimativa: ~{estKB >= 1024 ? `${(estKB / 1024).toFixed(1)} MB` : `${estKB} KB`}
          {lastSize !== null && status === 'done' && (
            <span className="export-size-real"> · real: {lastSize >= 1024 ? `${(lastSize / 1024).toFixed(1)} MB` : `${lastSize} KB`}</span>
          )}
        </p>
      )}

      {/* Mensagem de erro */}
      {status === 'error' && (
        <p className="export-error" role="alert">{errorMsg}</p>
      )}

      {/* Botão principal */}
      <button
        type="button"
        className={`export-btn ${status === 'exporting' ? 'is-loading' : ''} ${status === 'done' ? 'is-done' : ''}`}
        onClick={handleExport}
        disabled={!image || status === 'exporting'}
        aria-label={`Exportar imagem como ${FORMAT_LABELS[exportOptions.format]}`}
      >
        {status === 'exporting' && <span className="export-btn-spinner" aria-hidden="true" />}
        {status === 'done'      ? '✓ Salvo!' :
         status === 'exporting' ? 'Exportando…' :
         `↓ Exportar ${FORMAT_LABELS[exportOptions.format]}`}
      </button>

      {!image && (
        <p className="muted-copy" style={{ textAlign: 'center', marginTop: 8 }}>
          Importe uma imagem para habilitar a exportação.
        </p>
      )}
    </section>
  );
}
