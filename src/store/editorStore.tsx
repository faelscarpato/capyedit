import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { EditState, ExportOptions, HistoryEntry, LoadedImage, MaskKind, MaskState } from '../types/editor';
import { cloneEdit, createMask, DEFAULT_EDIT_STATE, DEFAULT_EXPORT_OPTIONS } from './defaults';

type EditorState = {
  image: LoadedImage | null;
  edit: EditState;
  past: HistoryEntry[];
  future: HistoryEntry[];
  activePanel: string;
  activeMaskId: string | null;
  showBefore: boolean;
  isRendering: boolean;
  error: string | null;
  exportOptions: ExportOptions;
};

type EditorAction =
  | { type: 'load-image'; image: LoadedImage }
  | { type: 'set-edit'; edit: EditState; label?: string }
  | { type: 'patch-edit'; patch: Partial<EditState>; label?: string }
  | { type: 'reset-edit' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'set-panel'; panel: string }
  | { type: 'toggle-before'; value?: boolean }
  | { type: 'set-rendering'; value: boolean }
  | { type: 'set-error'; error: string | null }
  | { type: 'set-export-options'; options: Partial<ExportOptions> }
  | { type: 'add-mask'; kind: MaskKind }
  | { type: 'update-mask'; maskId: string; mask: Partial<MaskState>; label?: string }
  | { type: 'delete-mask'; maskId: string }
  | { type: 'select-mask'; maskId: string | null };

const initialState: EditorState = {
  image: null,
  edit: cloneEdit(DEFAULT_EDIT_STATE),
  past: [],
  future: [],
  activePanel: 'light',
  activeMaskId: null,
  showBefore: false,
  isRendering: false,
  error: null,
  exportOptions: { ...DEFAULT_EXPORT_OPTIONS }
};

function pushHistory(state: EditorState, nextEdit: EditState, label = 'Ajuste'): EditorState {
  const last = state.past[state.past.length - 1];
  const currentSnapshot = JSON.stringify(state.edit);
  if (JSON.stringify(nextEdit) === currentSnapshot) return { ...state, edit: nextEdit };
  const shouldCollapse = last && Date.now() - last.at < 180 && last.label === label;
  const entry: HistoryEntry = { label, at: Date.now(), edit: cloneEdit(state.edit) };
  const past = shouldCollapse ? [...state.past.slice(0, -1), entry] : [...state.past, entry].slice(-80);
  return { ...state, edit: cloneEdit(nextEdit), past, future: [] };
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'load-image':
      if (state.image?.objectUrl) URL.revokeObjectURL(state.image.objectUrl);
      return { ...state, image: action.image, edit: cloneEdit(DEFAULT_EDIT_STATE), past: [], future: [], error: null };
    case 'set-edit':
      return pushHistory(state, action.edit, action.label);
    case 'patch-edit':
      return pushHistory(state, { ...state.edit, ...action.patch }, action.label);
    case 'reset-edit':
      return pushHistory(state, cloneEdit(DEFAULT_EDIT_STATE), 'Reset');
    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        edit: cloneEdit(previous.edit),
        past: state.past.slice(0, -1),
        future: [{ label: 'Redo', at: Date.now(), edit: cloneEdit(state.edit) }, ...state.future].slice(0, 80)
      };
    }
    case 'redo': {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        edit: cloneEdit(next.edit),
        past: [...state.past, { label: 'Undo', at: Date.now(), edit: cloneEdit(state.edit) }].slice(-80),
        future: state.future.slice(1)
      };
    }
    case 'set-panel':
      return { ...state, activePanel: action.panel };
    case 'toggle-before':
      return { ...state, showBefore: action.value ?? !state.showBefore };
    case 'set-rendering':
      return { ...state, isRendering: action.value };
    case 'set-error':
      return { ...state, error: action.error };
    case 'set-export-options':
      return { ...state, exportOptions: { ...state.exportOptions, ...action.options } };
    case 'add-mask': {
      const mask = createMask(action.kind);
      const edit = { ...state.edit, masks: [...state.edit.masks, mask] };
      return { ...pushHistory(state, edit, `Adicionar ${mask.name}`), activeMaskId: mask.id, activePanel: 'masks' };
    }
    case 'update-mask': {
      const edit = {
        ...state.edit,
        masks: state.edit.masks.map((mask) => (mask.id === action.maskId ? { ...mask, ...action.mask } : mask))
      };
      return pushHistory(state, edit, action.label ?? 'Máscara');
    }
    case 'delete-mask': {
      const edit = { ...state.edit, masks: state.edit.masks.filter((mask) => mask.id !== action.maskId) };
      return { ...pushHistory(state, edit, 'Remover máscara'), activeMaskId: null };
    }
    case 'select-mask':
      return { ...state, activeMaskId: action.maskId };
    default:
      return state;
  }
}

type EditorContextValue = EditorState & {
  dispatch: React.Dispatch<EditorAction>;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ ...state, dispatch }), [state]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorStore(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditorStore deve ser usado dentro de EditorProvider');
  return ctx;
}
