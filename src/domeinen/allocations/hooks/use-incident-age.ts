import { useEffect, useState } from 'react';
import { formatIncidentAge } from '../domain/incident-card';

/** Re-renders an informational incident age once a minute, never once a second. */
export function useIncidentAge(createdOn: string | undefined): string | undefined {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!createdOn || !Number.isFinite(Date.parse(createdOn))) {
      return undefined;
    }
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [createdOn]);

  return createdOn ? formatIncidentAge(createdOn, now) : undefined;
}
