import type { CurvePointState, RGBChannel } from '../../types/editor';
import { useEditorStore } from '../../store/editorStore';
import { cloneEdit } from '../../store/defaults';
import { Slider } from './Slider';

type Props = {
  channel: RGBChannel;
  label: string;
};

export function CurveSliderGroup({ channel, label }: Props) {
  const { edit, dispatch } = useEditorStore();
  const curve = edit.curves[channel];
  const update = (patch: Partial<CurvePointState>, name: string) => {
    const next = cloneEdit(edit);
    next.curves[channel] = { ...next.curves[channel], ...patch };
    dispatch({ type: 'set-edit', edit: next, label: name });
  };
  return (
    <div className="curve-group">
      <h4>{label}</h4>
      <Slider label="Sombras" value={curve.shadows} min={-100} max={100} onChange={(v) => update({ shadows: v }, `${label} sombras`)} />
      <Slider label="Médios" value={curve.midtones} min={-100} max={100} onChange={(v) => update({ midtones: v }, `${label} médios`)} />
      <Slider label="Altas" value={curve.highlights} min={-100} max={100} onChange={(v) => update({ highlights: v }, `${label} altas`)} />
    </div>
  );
}
