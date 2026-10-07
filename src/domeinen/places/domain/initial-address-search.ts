export function initialAddressSearchQuery(visible: boolean, query: string): string | null {
  const trimmed = query.trim();
  return visible && trimmed.length >= 2 ? trimmed : null;
}
