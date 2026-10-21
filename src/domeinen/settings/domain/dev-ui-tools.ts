/**
 * Metro-only UI helpers (group-answer inspector, scenario export, definition reload).
 * Stored as `"true"` / `"false"`; anything else (including missing) means off.
 */
export function parseDevUiToolsEnabled(raw: string | null): boolean {
  return raw === 'true';
}

export function serializeDevUiToolsEnabled(enabled: boolean): string {
  return enabled ? 'true' : 'false';
}
