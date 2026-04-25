import type { EditState } from '../../types/editor';
import { useEditorStore } from '../../store/editorStore';
import { cloneEdit } from '../../store/defaults';

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange?: (value: number) => void;
  editKey?: keyof EditState;
};

export function Slider({ label, value, min, max, step = 1, unit = '', onChange, editKey }: SliderProps) {
  const { edit, dispatch } = useEditorStore();
  const handleChange = (next: number) => {
    if (onChange) onChange(next);
    if (editKey) {
      const nextEdit = cloneEdit(edit);
      (nextEdit[editKey] as number) = next;
      dispatch({ type: 'set-edit', edit: nextEdit, label });
    }
  };

  return (
    <label className="slider-row">
      <span className="slider-meta">
        <span>{label}</span>
        <output>{Number.isInteger(value) ? value : value.toFixed(2)}{unit}</output>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => handleChange(Number(event.currentTarget.value))}
        aria-label={label}
      />
    </label>
  );
}
