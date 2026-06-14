/**
 * Exibe dicas de teclado de forma declarativa e centralizada.
 * Adicionar/remover atalhos aqui atualiza a UI automaticamente.
 */

type ShortcutHint = {
  keys: string;
  description: string;
};

const SHORTCUTS: ShortcutHint[] = [
  { keys: 'B',      description: 'Antes/depois' },
  { keys: 'Ctrl+Z', description: 'Desfazer' },
  { keys: 'Ctrl+Y', description: 'Refazer' },
  { keys: 'F',      description: 'Ajustar à tela' },
  { keys: 'Scroll', description: 'Zoom' },
  { keys: 'Arrastar', description: 'Pan' },
];

export function KeyboardShortcutsHint() {
  return (
    <ul className="stage-hints" aria-label="Atalhos de teclado" role="list">
      {SHORTCUTS.map(({ keys, description }) => (
        <li key={keys}>
          <kbd>{keys}</kbd>
          <span>{description}</span>
        </li>
      ))}
    </ul>
  );
}
