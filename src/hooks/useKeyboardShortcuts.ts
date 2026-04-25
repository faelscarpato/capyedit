import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export function useKeyboardShortcuts(onFit?: () => void) {
  const { dispatch } = useEditorStore();
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: 'undo' });
      }
      if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault();
        dispatch({ type: 'redo' });
      }
      if (key === 'b') dispatch({ type: 'toggle-before' });
      if (key === '0') onFit?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, onFit]);
}
