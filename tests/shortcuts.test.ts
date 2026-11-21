import { describe, expect, it } from 'vitest';
import { WORKSPACES } from '@shared/domain';
import { workspaceFromShortcut } from '../src/lib/shortcuts';

const keyEvent = (patch: Partial<KeyboardEvent> = {}) => ({
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  code: '',
  key: '',
  ...patch,
});

describe('workspace shortcuts', () => {
  it('resolves Option+L on macOS where event.key is a symbol', () => {
    expect(workspaceFromShortcut(keyEvent({ altKey: true, code: 'KeyL', key: '¬' }))).toBe('universe');
  });

  it('resolves Alt+L on Windows/Linux where event.key is the letter', () => {
    expect(workspaceFromShortcut(keyEvent({ altKey: true, code: 'KeyL', key: 'l' }))).toBe('universe');
  });

  it('resolves Option+K on macOS where event.key is a symbol', () => {
    expect(workspaceFromShortcut(keyEvent({ altKey: true, code: 'KeyK', key: '˚' }))).toBe('narrative');
  });

  it('resolves workspace number shortcuts by physical digit key', () => {
    expect(workspaceFromShortcut(keyEvent({ altKey: true, code: 'Digit1', key: '¡' }))).toBe(WORKSPACES[0]?.id);
    expect(workspaceFromShortcut(keyEvent({ altKey: true, code: 'Digit0', key: 'º' }))).toBe(WORKSPACES[9]?.id);
  });

  it('ignores unrelated keys and unmodified presses', () => {
    expect(workspaceFromShortcut(keyEvent({ code: 'KeyL', key: 'l' }))).toBeNull();
    expect(workspaceFromShortcut(keyEvent({ altKey: true, code: 'KeyZ', key: 'Ω' }))).toBeNull();
  });

  it('does not hijack browser or OS shortcuts that combine Alt with Cmd/Ctrl', () => {
    expect(workspaceFromShortcut(keyEvent({ altKey: true, metaKey: true, code: 'KeyL', key: '¬' }))).toBeNull();
    expect(workspaceFromShortcut(keyEvent({ altKey: true, ctrlKey: true, code: 'KeyL', key: '¬' }))).toBeNull();
  });
});
