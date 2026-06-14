import { exportEditedImage, downloadBlob, exportFileName } from '../../core/export/exportImage';
import { useEditorStore } from '../../store/editorStore';
import { ImportDropzone } from './ImportDropzone';

type Pipeline = 'webgl' | 'worker' | 'cpu';

type Props = {
  onSaveProject:   () => void;
  activePipeline?: Pipeline | null;
};

const PIPELINE_LABEL: Record<Pipeline, string> = {
  webgl:  '⚡ GPU',
  worker: '🧵 Worker',
  cpu:    '🖥 CPU',
};

const PIPELINE_TITLE: Record<Pipeline, string> = {
  webgl:  'Renderização via WebGL2 (GPU)',
  worker: 'Renderização via Web Worker (thread separada)',
  cpu:    'Renderização via CPU (thread principal)',
};

export function TopBar({ onSaveProject, activePipeline }: Props) {
  const { image, edit, past, future, showBefore, exportOptions, isRendering, dispatch } = useEditorStore();
  const canExport = Boolean(image);

  const exportNow = async () => {
    if (!image) return;
    try {
      dispatch({ type: 'set-rendering', value: true });
      const blob = await exportEditedImage(image, edit, exportOptions);
      downloadBlob(blob, exportFileName(image.fileName, exportOptions.format));
    } catch (error) {
      dispatch({ type: 'set-error', error: error instanceof Error ? error.message : 'Falha ao exportar.' });
    } finally {
      dispatch({ type: 'set-rendering', value: false });
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">CR</span>
        <div>
          <strong>Capy Retouching</strong>
          <small>non destructive browser lab</small>
        </div>
      </div>

      <nav className="menu-strip" aria-label="Menu principal">
        <button>Arquivo</button>
        <button>Edição</button>
        <button>Visualizar</button>
        <button>Componentes</button>
        <button>Ajuda</button>
        <button>Sobre</button>
      </nav>

      <div className="top-actions">
        {/* Badge de pipeline — exibido apenas quando uma imagem está carregada */}
        {activePipeline && (
          <span
            className={`pipeline-badge pipeline-badge--${activePipeline}`}
            title={PIPELINE_TITLE[activePipeline]}
            aria-label={PIPELINE_TITLE[activePipeline]}
          >
            {PIPELINE_LABEL[activePipeline]}
          </span>
        )}

        <ImportDropzone />

        <button
          type="button"
          onClick={() => dispatch({ type: 'undo' })}
          disabled={!past.length}
          aria-label="Desfazer (Ctrl+Z)"
        >Undo</button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'redo' })}
          disabled={!future.length}
          aria-label="Refazer (Ctrl+Y)"
        >Redo</button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'toggle-before' })}
          disabled={!image}
          className={showBefore ? 'is-active' : ''}
          aria-pressed={showBefore}
          aria-label="Alternar antes/depois (B)"
        >Antes</button>

        <button
          type="button"
          onClick={onSaveProject}
          disabled={!image}
          aria-label="Salvar projeto como JSON"
        >Salvar JSON</button>

        <button
          className="export-button"
          type="button"
          disabled={!canExport || isRendering}
          onClick={() => void exportNow()}
          aria-label="Exportar imagem"
        >
          {isRendering ? 'Processando…' : 'Exportar'}
        </button>
      </div>
    </header>
  );
}
