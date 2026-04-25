import { PRESETS } from './presets';
import { useEditorStore } from '../../store/editorStore';
import { cloneEdit } from '../../store/defaults';

export function LeftPanel() {
  const { edit, past, dispatch } = useEditorStore();
  const applyPreset = (presetIndex: number) => {
    const preset = PRESETS[presetIndex];
    const next = { ...cloneEdit(edit), ...preset.patch };
    dispatch({ type: 'set-edit', edit: next, label: `Preset ${preset.name}` });
  };
  return (
    <aside className="left-panel">
      <section className="panel-section">
        <div className="section-title">
          <span>Presets</span>
          <small>base pronta</small>
        </div>
        <div className="preset-list">
          {PRESETS.map((preset, index) => (
            <button key={preset.name} type="button" onClick={() => applyPreset(index)}>
              <strong>{preset.name}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel-section history-section">
        <div className="section-title">
          <span>Histórico</span>
          <small>{past.length} ações</small>
        </div>
        <ol className="history-list">
          {past.slice(-12).reverse().map((entry, idx) => (
            <li key={`${entry.at}-${idx}`}>{entry.label}</li>
          ))}
          {!past.length && <li>Nenhum ajuste ainda.</li>}
        </ol>
      </section>
      <section className="panel-section">
        <div className="section-title"><span>Temas prontos</span><small>roadmap</small></div>
        <p className="muted-copy">A arquitetura já salva presets em JSON. Sincronização e marketplace de presets entram na Fase 2.</p>
      </section>
    </aside>
  );
}
