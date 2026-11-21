import { WORKSPACES, type WorkspaceId } from '@shared/domain';

/**
 * Resolve a workspace shortcut from the physical key, not `event.key`.
 * On macOS, holding Option changes `event.key` to a symbol (Option+L → "¬"),
 * so keyboard-layout-independent `event.code` is required.
 */
export function workspaceFromShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'code' | 'key'>,
): WorkspaceId | null {
  if (!event.altKey || event.ctrlKey || event.metaKey) return null;

  const code = event.code ?? '';
  const key = (event.key ?? '').toLowerCase();

  const digit = /^Digit([0-9])$/.exec(code)?.[1] ?? /^([0-9])$/.exec(key)?.[1];
  if (digit) {
    const index = digit === '0' ? 9 : Number(digit) - 1;
    return WORKSPACES[index]?.id ?? null;
  }

  if (code === 'KeyK' || key === 'k') return 'narrative';
  if (code === 'KeyL' || key === 'l') return 'universe';
  return null;
}
