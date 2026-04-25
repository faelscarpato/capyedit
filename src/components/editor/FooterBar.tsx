import { humanFileSize, imageWarning } from '../../core/image/loadImage';
import { estimateImageMemoryMB } from '../../core/performance/device';
import { useEditorStore } from '../../store/editorStore';

export function FooterBar() {
  const { image, isRendering, error } = useEditorStore();
  const warning = image ? imageWarning(image) : null;
  return (
    <footer className="footerbar">
      <span>{image ? `${image.fileName} · ${image.width}×${image.height} · ${image.megapixels.toFixed(1)}MP · ${humanFileSize(image.fileSize)}` : 'Nenhuma imagem carregada'}</span>
      {image && <span>RAM estimada RGBA: {estimateImageMemoryMB(image.width, image.height).toFixed(1)} MB</span>}
      {isRendering && <span className="pulse-dot">Renderizando preview</span>}
      {warning && <span className="warning-text">{warning}</span>}
      {error && <span className="error-text">{error}</span>}
    </footer>
  );
}
