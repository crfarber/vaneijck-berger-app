/**
 * Matching RDW text against synced CRM lookup tables (country / brand / type). Pure and free of
 * form answers so callers outside the service form (e.g. optional card enrichment) can reuse it.
 */

export type LookupRow = {
  dn_name?: string;
  Text?: string;
  name?: string;
  dn_countryid?: string;
  dn_vehiclebrandid?: string;
  dn_vehicletypeid?: string;
  dn_iso2code?: string;
  _dn_vehiclebrandid_value?: string;
  Value?: string;
};

export type LookupMatch = { displayName: string; valueData: string };

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGuid(value?: string | null): boolean {
  return typeof value === 'string' && GUID_REGEX.test(value.trim());
}

export function normalizeForMatch(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function getLookupDisplayName(row: LookupRow): string | null {
  if (row.Text?.trim()) {
    return row.Text.trim();
  }
  if (row.dn_name?.trim() && !isGuid(row.dn_name)) {
    return row.dn_name.trim();
  }
  if (row.name?.trim() && !isGuid(row.name)) {
    return row.name.trim();
  }
  return null;
}

export function getLookupValueId(
  row: LookupRow,
  idKeys: ReadonlyArray<keyof LookupRow>,
): string | null {
  for (const key of idKeys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  if (row.Value?.trim()) {
    return row.Value.trim();
  }
  return null;
}

export function findNetherlandsCountry(countries: readonly LookupRow[]): LookupMatch | null {
  const match = countries.find((row) => {
    const isoCode = row.dn_iso2code?.toUpperCase();
    const displayName = getLookupDisplayName(row)?.toLowerCase();
    return isoCode === 'NL' || displayName === 'nederland';
  });
  if (!match) {
    return null;
  }
  const displayName = getLookupDisplayName(match);
  const valueData = getLookupValueId(match, ['dn_countryid', 'Value']);
  if (!displayName || !valueData) {
    return null;
  }
  return { displayName, valueData };
}

export function matchVehicleBrand(model: string, brands: readonly LookupRow[]): LookupMatch | null {
  const normalizedModel = normalizeForMatch(model);
  if (!normalizedModel) {
    return null;
  }

  const candidates = brands
    .map((row) => {
      const displayName = getLookupDisplayName(row);
      const valueData = getLookupValueId(row, ['dn_vehiclebrandid', 'Value']);
      if (!displayName || !valueData) {
        return null;
      }
      return {
        displayName,
        valueData,
        normalizedName: normalizeForMatch(displayName),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);

  const exact = candidates.filter((c) => c.normalizedName === normalizedModel);
  const exactMatch = exact[0];
  if (exact.length === 1 && exactMatch) {
    return { displayName: exactMatch.displayName, valueData: exactMatch.valueData };
  }

  const fuzzy = candidates.filter(
    (c) => c.normalizedName.includes(normalizedModel) || normalizedModel.includes(c.normalizedName),
  );
  const fuzzyMatch = fuzzy[0];
  if (fuzzy.length === 1 && fuzzyMatch) {
    return { displayName: fuzzyMatch.displayName, valueData: fuzzyMatch.valueData };
  }

  return null;
}

export function matchVehicleType(
  tradeName: string,
  model: string,
  types: readonly LookupRow[],
  brandId: string,
): LookupMatch | null {
  const normalizedTrade = normalizeForMatch(tradeName);
  if (!normalizedTrade) {
    return null;
  }

  const normalizedModel = normalizeForMatch(model);
  let strippedTrade = normalizedTrade;
  if (normalizedModel && normalizedTrade.startsWith(normalizedModel)) {
    strippedTrade = normalizedTrade.slice(normalizedModel.length).trim();
  }

  const filtered = types.filter((row) => {
    const rowBrandId =
      row._dn_vehiclebrandid_value || getLookupValueId(row, ['dn_vehiclebrandid', 'Value']);
    const displayName = getLookupDisplayName(row);
    const valueData = getLookupValueId(row, ['dn_vehicletypeid', 'Value']);
    return rowBrandId === brandId && Boolean(displayName) && Boolean(valueData);
  });

  const candidates = filtered.flatMap((row) => {
    const displayName = getLookupDisplayName(row);
    const valueData = getLookupValueId(row, ['dn_vehicletypeid', 'Value']);
    if (!displayName || !valueData) {
      return [];
    }
    return [
      {
        displayName,
        valueData,
        normalizedName: normalizeForMatch(displayName),
      },
    ];
  });

  const exactTrade = candidates.filter((c) => c.normalizedName === normalizedTrade);
  const exactTradeMatch = exactTrade[0];
  if (exactTrade.length === 1 && exactTradeMatch) {
    return {
      displayName: exactTradeMatch.displayName,
      valueData: exactTradeMatch.valueData,
    };
  }

  if (strippedTrade) {
    const exactStripped = candidates.filter((c) => c.normalizedName === strippedTrade);
    const exactStrippedMatch = exactStripped[0];
    if (exactStripped.length === 1 && exactStrippedMatch) {
      return {
        displayName: exactStrippedMatch.displayName,
        valueData: exactStrippedMatch.valueData,
      };
    }
  }

  const fuzzy = candidates.filter(
    (c) =>
      normalizedTrade.includes(c.normalizedName) ||
      c.normalizedName.includes(strippedTrade || normalizedTrade) ||
      (strippedTrade !== '' && strippedTrade.includes(c.normalizedName)),
  );
  const fuzzyMatch = fuzzy[0];
  if (fuzzy.length === 1 && fuzzyMatch) {
    return { displayName: fuzzyMatch.displayName, valueData: fuzzyMatch.valueData };
  }

  return null;
}
