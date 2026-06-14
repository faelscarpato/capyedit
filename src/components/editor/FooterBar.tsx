import { humanFileSize, imageWarning } from '../../core/image/loadImage';
import { estimateImageMemoryMB } from '../../core/performance/device';
import { useEditorStore } from '../../store/editorStore';

export function FooterBar() {
  const { image, isRendering, error } = useEditorStore();
  const warning = image ? imageWarning(image) : null;

  return (
    <footer className="footerbar" role="status" aria-live="polite">
      <span>
        {image
          ? `${image.fileName} · ${image.width}×${image.height} · ${image.megapixels.toFixed(1)} MP · ${humanFileSize(image.fileSize)}`
          : 'Nenhuma imagem carregada'}
      </span>

      {image && (
        <span>RAM estimada RGBA: {estimateImageMemoryMB(image.width, image.height).toFixed(1)} MB</span>
      )}

      {isRendering && (
        <span className="pulse-dot" aria-label="Renderizando preview">
          <span className="pulse-dot__indicator" aria-hidden="true" />
          Renderizando…
        </span>
      )}

      {warning && <span className="warning-text" role="alert">{warning}</span>}
      {error   && <span className="error-text"   role="alert">{error}</span>}
    </footer>
  );
}
