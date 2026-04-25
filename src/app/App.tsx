import { EditorProvider } from '../store/editorStore';
import { EditorShell } from '../components/editor/EditorShell';
import '../app/styles.css';

export default function App() {
  return (
    <EditorProvider>
      <EditorShell />
    </EditorProvider>
  );
}
