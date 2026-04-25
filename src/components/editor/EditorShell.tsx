import { useCallback, useState } from 'react';
import type { Histogram } from '../../types/editor';
import { useEditorStore } from '../../store/editorStore';
import { saveProject } from '../../core/storage/indexedDb';
import { TopBar } from './TopBar';
import { FooterBar } from './FooterBar';
import { LeftPanel } from '../panels/LeftPanel';
import { RightPanel } from '../panels/RightPanel';
import { ImageCanvas } from '../canvas/ImageCanvas';
import { HistogramCanvas } from '../canvas/HistogramCanvas';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export function EditorShell() {
  const { image, edit, dispatch } = useEditorStore();
  const [histogram, setHistogram] = useState<Histogram | null>(null);
  const [fitHandler, setFitHandler] = useState<(() => void) | undefined>();
  useKeyboardShortcuts(fitHandler);

  const registerFit = useCallback((fit: () => void) => {
    setFitHandler(() => fit);
  }, []);

  const saveProjectJson = async () => {
    if (!image) return;
    const project = {
      id: image.id,
      name: image.fileName,
      edit,
      updatedAt: Date.now()
    };
    try {
      await saveProject(project);
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.fileName.replace(/\.[^.]+$/, '')}.capy-retouching.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      dispatch({ type: 'set-error', error: error instanceof Error ? error.message : 'Falha ao salvar projeto.' });
    }
  };

  return (
    <div className="editor-shell">
      <TopBar onSaveProject={() => void saveProjectJson()} />
      <main className="workspace">
        <LeftPanel />
        <section className="stage">
          <div className="stage-head">
            <HistogramCanvas histogram={histogram} />
            <div className="stage-hints">
              <span>B: antes/depois</span>
              <span>Ctrl+Z/Y: histórico</span>
              <span>Scroll: zoom · arrastar: pan</span>
            </div>
          </div>
          <ImageCanvas onHistogram={setHistogram} registerFit={registerFit} />
        </section>
        <RightPanel />
      </main>
      <FooterBar />
    </div>
  );
}
