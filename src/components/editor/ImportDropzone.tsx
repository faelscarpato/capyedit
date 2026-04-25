import { useRef, useState } from 'react';
import { loadImageFile } from '../../core/image/loadImage';
import { useEditorStore } from '../../store/editorStore';

export function ImportDropzone() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { image, dispatch } = useEditorStore();
  const [dragging, setDragging] = useState(false);

  const importFile = async (file: File) => {
    try {
      dispatch({ type: 'set-error', error: null });
      const loaded = await loadImageFile(file);
      dispatch({ type: 'load-image', image: loaded });
    } catch (error) {
      dispatch({ type: 'set-error', error: error instanceof Error ? error.message : 'Falha ao importar imagem.' });
    }
  };

  return (
    <div
      className={`dropzone ${dragging ? 'is-dragging' : ''} ${image ? 'has-image' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void importFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importFile(file);
        }}
      />
      <button className="primary-action" type="button" onClick={() => inputRef.current?.click()}>
        Importar foto
      </button>
      {!image && <p>Arraste uma imagem local ou toque para selecionar.</p>}
    </div>
  );
}
