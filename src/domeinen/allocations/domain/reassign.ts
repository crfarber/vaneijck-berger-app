import type { Colleague } from './types';

/** Client-side name search, ported from `ForwardAssignment`'s own filter: case-insensitive,
 * matches anywhere in the name. An empty search returns everyone. */
export function filterColleagues(colleagues: readonly Colleague[], search: string): Colleague[] {
  const query = search.trim().toLowerCase();
  if (query === '') {
    return [...colleagues];
  }
  return colleagues.filter((colleague) => colleague.name.toLowerCase().includes(query));
}
