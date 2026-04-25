import type { HSLBand, MaskKind, MaskState } from '../../types/editor';
import { useEditorStore } from '../../store/editorStore';
import { HSL_BANDS, cloneEdit } from '../../store/defaults';
import { Slider } from '../sliders/Slider';
import { CurveSliderGroup } from '../sliders/CurveSlider';

const TABS = [
  { id: 'light', label: 'Luz' },
  { id: 'color', label: 'Cor' },
  { id: 'detail', label: 'Detalhe' },
  { id: 'effects', label: 'Efeitos' },
  { id: 'crop', label: 'Crop' },
  { id: 'masks', label: 'Máscaras' },
  { id: 'export', label: 'Export' }
];

export function RightPanel() {
  const { activePanel, dispatch } = useEditorStore();
  return (
    <aside className="right-panel">
      <div className="tabs" role="tablist" aria-label="Painéis de ajuste">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" className={activePanel === tab.id ? 'is-active' : ''} onClick={() => dispatch({ type: 'set-panel', panel: tab.id })}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="panel-scroll">
        {activePanel === 'light' && <LightPanel />}
        {activePanel === 'color' && <ColorPanel />}
        {activePanel === 'detail' && <DetailPanel />}
        {activePanel === 'effects' && <EffectsPanel />}
        {activePanel === 'crop' && <CropPanel />}
        {activePanel === 'masks' && <MasksPanel />}
        {activePanel === 'export' && <ExportPanel />}
      </div>
    </aside>
  );
}

function LightPanel() {
  const { edit, dispatch } = useEditorStore();
  return (
    <section className="panel-section">
      <div className="section-title"><span>Luz</span><button onClick={() => dispatch({ type: 'reset-edit' })}>Reset</button></div>
      <Slider label="Exposição" value={edit.exposure} min={-3} max={3} step={0.01} editKey="exposure" />
      <Slider label="Contraste" value={edit.contrast} min={-100} max={100} editKey="contrast" />
      <Slider label="Realces" value={edit.highlights} min={-100} max={100} editKey="highlights" />
      <Slider label="Sombras" value={edit.shadows} min={-100} max={100} editKey="shadows" />
      <Slider label="Brancos" value={edit.whites} min={-100} max={100} editKey="whites" />
      <Slider label="Pretos" value={edit.blacks} min={-100} max={100} editKey="blacks" />
      <div className="subpanel-title">Curvas RGB</div>
      <CurveSliderGroup channel="master" label="Master" />
      <CurveSliderGroup channel="red" label="Vermelho" />
      <CurveSliderGroup channel="green" label="Verde" />
      <CurveSliderGroup channel="blue" label="Azul" />
    </section>
  );
}

function ColorPanel() {
  const { edit, dispatch } = useEditorStore();
  const updateHsl = (band: HSLBand, key: 'hue' | 'saturation' | 'luminance', value: number) => {
    const next = cloneEdit(edit);
    next.hsl[band][key] = value;
    dispatch({ type: 'set-edit', edit: next, label: `HSL ${band}` });
  };
  return (
    <section className="panel-section">
      <div className="section-title"><span>Cor</span><small>WB + HSL</small></div>
      <Slider label="Temperatura" value={edit.temperature} min={-100} max={100} editKey="temperature" />
      <Slider label="Matiz" value={edit.tint} min={-100} max={100} editKey="tint" />
      <Slider label="Vibrance" value={edit.vibrance} min={-100} max={100} editKey="vibrance" />
      <Slider label="Saturação" value={edit.saturation} min={-100} max={100} editKey="saturation" />
      <div className="subpanel-title">HSL por cor</div>
      <div className="hsl-grid">
        {HSL_BANDS.map((band) => (
          <details key={band}>
            <summary>{band}</summary>
            <Slider label="Hue" value={edit.hsl[band].hue} min={-180} max={180} onChange={(v) => updateHsl(band, 'hue', v)} />
            <Slider label="Sat" value={edit.hsl[band].saturation} min={-100} max={100} onChange={(v) => updateHsl(band, 'saturation', v)} />
            <Slider label="Lum" value={edit.hsl[band].luminance} min={-100} max={100} onChange={(v) => updateHsl(band, 'luminance', v)} />
          </details>
        ))}
      </div>
    </section>
  );
}

function DetailPanel() {
  const { edit } = useEditorStore();
  return (
    <section className="panel-section">
      <div className="section-title"><span>Detalhe</span><small>convolução 3×3</small></div>
      <Slider label="Claridade" value={edit.clarity} min={-100} max={100} editKey="clarity" />
      <Slider label="Nitidez" value={edit.sharpen} min={0} max={100} editKey="sharpen" />
      <Slider label="Redução de ruído" value={edit.noiseReduction} min={0} max={100} editKey="noiseReduction" />
    </section>
  );
}

function EffectsPanel() {
  const { edit } = useEditorStore();
  return (
    <section className="panel-section">
      <div className="section-title"><span>Efeitos</span><small>finalização</small></div>
      <Slider label="Dehaze" value={edit.dehaze} min={-100} max={100} editKey="dehaze" />
      <Slider label="Vinheta" value={edit.vignette} min={-100} max={100} editKey="vignette" />
      <Slider label="Grão" value={edit.grain} min={0} max={100} editKey="grain" />
    </section>
  );
}

function CropPanel() {
  const { edit, dispatch } = useEditorStore();
  const setCrop = (patch: Partial<typeof edit.crop>) => {
    const next = cloneEdit(edit);
    next.crop = { ...next.crop, ...patch };
    next.crop.x = Math.min(0.98, Math.max(0, next.crop.x));
    next.crop.y = Math.min(0.98, Math.max(0, next.crop.y));
    next.crop.width = Math.min(1 - next.crop.x, Math.max(0.05, next.crop.width));
    next.crop.height = Math.min(1 - next.crop.y, Math.max(0.05, next.crop.height));
    dispatch({ type: 'set-edit', edit: next, label: 'Crop' });
  };
  const rotate = (delta: number) => dispatch({ type: 'patch-edit', patch: { rotation: (edit.rotation + delta + 360) % 360 }, label: 'Rotação' });
  return (
    <section className="panel-section">
      <div className="section-title"><span>Crop e geometria</span><small>normalizado</small></div>
      <Slider label="X" value={edit.crop.x} min={0} max={0.95} step={0.01} onChange={(v) => setCrop({ x: v })} />
      <Slider label="Y" value={edit.crop.y} min={0} max={0.95} step={0.01} onChange={(v) => setCrop({ y: v })} />
      <Slider label="Largura" value={edit.crop.width} min={0.05} max={1} step={0.01} onChange={(v) => setCrop({ width: v })} />
      <Slider label="Altura" value={edit.crop.height} min={0.05} max={1} step={0.01} onChange={(v) => setCrop({ height: v })} />
      <div className="button-grid">
        <button onClick={() => rotate(-90)}>Girar −90°</button>
        <button onClick={() => rotate(90)}>Girar +90°</button>
        <button onClick={() => dispatch({ type: 'patch-edit', patch: { flipX: !edit.flipX }, label: 'Espelhar H' })}>Espelhar H</button>
        <button onClick={() => dispatch({ type: 'patch-edit', patch: { flipY: !edit.flipY }, label: 'Espelhar V' })}>Espelhar V</button>
      </div>
    </section>
  );
}

function MasksPanel() {
  const { edit, activeMaskId, dispatch } = useEditorStore();
  const active = edit.masks.find((mask) => mask.id === activeMaskId) ?? edit.masks[0];
  const add = (kind: MaskKind) => dispatch({ type: 'add-mask', kind });
  return (
    <section className="panel-section">
      <div className="section-title"><span>Máscaras locais</span><small>{edit.masks.length}</small></div>
      <div className="button-grid">
        <button onClick={() => add('linear')}>+ Linear</button>
        <button onClick={() => add('radial')}>+ Radial</button>
        <button onClick={() => add('brush')}>+ Pincel</button>
      </div>
      <div className="mask-list">
        {edit.masks.map((mask) => (
          <button key={mask.id} className={active?.id === mask.id ? 'is-active' : ''} onClick={() => dispatch({ type: 'select-mask', maskId: mask.id })}>{mask.name}</button>
        ))}
      </div>
      {active ? <MaskEditor mask={active} /> : <p className="muted-copy">Crie uma máscara para aplicar ajustes locais.</p>}
    </section>
  );
}

function MaskEditor({ mask }: { mask: MaskState }) {
  const { dispatch } = useEditorStore();
  const update = (patch: Partial<MaskState>) => dispatch({ type: 'update-mask', maskId: mask.id, mask: patch });
  const updateAdjustment = (key: keyof MaskState['adjustments'], value: number) => update({ adjustments: { ...mask.adjustments, [key]: value } });
  return (
    <div className="mask-editor">
      <div className="button-grid">
        <button className={mask.enabled ? 'is-active' : ''} onClick={() => update({ enabled: !mask.enabled })}>Ativa</button>
        <button className={mask.invert ? 'is-active' : ''} onClick={() => update({ invert: !mask.invert })}>Inverter</button>
        <button onClick={() => dispatch({ type: 'delete-mask', maskId: mask.id })}>Remover</button>
      </div>
      <Slider label="X" value={mask.x} min={0} max={1} step={0.01} onChange={(v) => update({ x: v })} />
      <Slider label="Y" value={mask.y} min={0} max={1} step={0.01} onChange={(v) => update({ y: v })} />
      {mask.kind === 'linear' && <Slider label="Direção" value={mask.y2} min={0} max={1} step={0.01} onChange={(v) => update({ y2: v })} />}
      {mask.kind !== 'linear' && <Slider label="Raio" value={mask.radius} min={0.02} max={1} step={0.01} onChange={(v) => update({ radius: v })} />}
      <Slider label="Feather" value={mask.feather} min={0.02} max={1} step={0.01} onChange={(v) => update({ feather: v })} />
      <Slider label="Opacidade" value={mask.opacity} min={0} max={1} step={0.01} onChange={(v) => update({ opacity: v })} />
      <div className="subpanel-title">Ajustes locais</div>
      <Slider label="Exposição" value={mask.adjustments.exposure} min={-2} max={2} step={0.01} onChange={(v) => updateAdjustment('exposure', v)} />
      <Slider label="Contraste" value={mask.adjustments.contrast} min={-100} max={100} onChange={(v) => updateAdjustment('contrast', v)} />
      <Slider label="Saturação" value={mask.adjustments.saturation} min={-100} max={100} onChange={(v) => updateAdjustment('saturation', v)} />
      <Slider label="Nitidez local" value={mask.adjustments.sharpen} min={0} max={100} onChange={(v) => updateAdjustment('sharpen', v)} />
    </div>
  );
}

function ExportPanel() {
  const { exportOptions, dispatch } = useEditorStore();
  return (
    <section className="panel-section">
      <div className="section-title"><span>Exportação</span><small>alta qualidade</small></div>
      <label className="field-label">Formato
        <select value={exportOptions.format} onChange={(e) => dispatch({ type: 'set-export-options', options: { format: e.currentTarget.value as typeof exportOptions.format } })}>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WebP</option>
        </select>
      </label>
      <Slider label="Qualidade" value={exportOptions.quality} min={0.4} max={1} step={0.01} onChange={(v) => dispatch({ type: 'set-export-options', options: { quality: v } })} />
      <Slider label="Lado máximo" value={exportOptions.maxEdge} min={1024} max={8192} step={128} unit="px" onChange={(v) => dispatch({ type: 'set-export-options', options: { maxEdge: v } })} />
      <p className="muted-copy">PNG ignora qualidade. JPEG/WebP usam compressão no canvas do navegador.</p>
    </section>
  );
}
