import { useCallback, useEffect, useRef, useState } from 'react';
import { isDutchLicensePlate, normalizeLicensePlate } from '@/domeinen/allocation-unit';
import type { LookupRow, RdwInfo } from '@/domeinen/rdw';
import {
  LEGACY_LICENSE_PLATE_MAPPING,
  type LicensePlateFieldMapping,
} from '../domain/license-plate-entry';
import { applyRdwVehicleAutofillWithMatch, clearRdwAutofillAnswers } from '../domain/rdw-autofill';
import type { ServiceFormAnswers } from '../domain/types';
import type { FetchRdwInfo } from './service-form-context';
import { useServiceFormService } from './service-form-context';

export type { FetchRdwInfo };

export type UseRdwVehicleRegistrationParams = {
  pleaseSelectLabel: string;
  fetchRdwInfo: FetchRdwInfo | undefined;
  fieldKeys: ReadonlySet<string>;
  /** Current answers (read via ref inside effects so plate races stay stable). */
  getAnswers: () => ServiceFormAnswers;
  updateAnswers: (answers: ServiceFormAnswers) => void;
  setFieldsRequired: (fieldKeys: string[], required: boolean) => void;
  /** Role → CRM key map; defaults to legacy Van Eijck field names. */
  mapping?: LicensePlateFieldMapping;
  /** Called after a successful or failed lookup with match details. */
  onLookupResult?: (result: {
    plate: string;
    info: RdwInfo | null;
    typeMatched: boolean;
    failed: boolean;
  }) => void;
};

/**
 * RDW lookup + autofill for the vehicle-registration group. Pure matching lives in `rdw` /
 * `rdw-autofill`; this hook only owns in-flight plate state and writes answer patches.
 */
export function useRdwVehicleRegistration({
  pleaseSelectLabel,
  fetchRdwInfo,
  fieldKeys,
  getAnswers,
  updateAnswers,
  setFieldsRequired,
  mapping = LEGACY_LICENSE_PLATE_MAPPING,
  onLookupResult,
}: UseRdwVehicleRegistrationParams) {
  const service = useServiceFormService();
  const [rdwInfo, setRdwInfo] = useState<RdwInfo | null>(null);
  const [rdwLookupFailed, setRdwLookupFailed] = useState(false);
  const lastSuccessfulPlateRef = useRef<string | null>(null);
  const inFlightPlateRef = useRef<string | null>(null);
  const getAnswersRef = useRef(getAnswers);
  const updateAnswersRef = useRef(updateAnswers);
  const fieldKeysRef = useRef(fieldKeys);
  const mappingRef = useRef(mapping);
  const onLookupResultRef = useRef(onLookupResult);
  useEffect(() => {
    getAnswersRef.current = getAnswers;
    updateAnswersRef.current = updateAnswers;
    fieldKeysRef.current = fieldKeys;
    mappingRef.current = mapping;
    onLookupResultRef.current = onLookupResult;
  }, [fieldKeys, getAnswers, mapping, onLookupResult, updateAnswers]);

  const plateAnswerKey = (): string => {
    const current = mappingRef.current;
    if (current.foundPlate && fieldKeysRef.current.has(current.foundPlate)) {
      return current.foundPlate;
    }
    if (fieldKeysRef.current.has('dn_vehicleregistrationno')) {
      return 'dn_vehicleregistrationno';
    }
    return 'dn_vehicleregistration';
  };

  const readCurrentPlate = (): string =>
    normalizeLicensePlate(String(getAnswersRef.current()[plateAnswerKey()]?.displayValue ?? ''));

  const autofillKeys = (): string[] => {
    const current = mappingRef.current;
    return [
      current.country ?? LEGACY_LICENSE_PLATE_MAPPING.country,
      current.brand ?? LEGACY_LICENSE_PLATE_MAPPING.brand,
      current.type ?? LEGACY_LICENSE_PLATE_MAPPING.type,
    ].filter((key) => fieldKeysRef.current.has(key));
  };

  const loadLookupTables = useCallback(async () => {
    const [countries, vehicleBrands, vehicleTypes] = await Promise.all([
      service.loadTable('dn_country'),
      service.loadTable('dn_vehiclebrands'),
      service.loadTable('dn_vehicletypes'),
    ]);
    return {
      countries: countries as LookupRow[],
      vehicleBrands: vehicleBrands as LookupRow[],
      vehicleTypes: vehicleTypes as LookupRow[],
    };
  }, [service]);

  const applyAutofill = useCallback(
    async (info: RdwInfo, overwriteRdwDerivedFields: boolean) => {
      const tables = await loadLookupTables();
      const result = applyRdwVehicleAutofillWithMatch({
        rdwInfo: info,
        answers: getAnswersRef.current(),
        fieldKeys: fieldKeysRef.current,
        countries: tables.countries,
        vehicleBrands: tables.vehicleBrands,
        vehicleTypes: tables.vehicleTypes,
        pleaseSelectLabel,
        overwriteRdwDerivedFields,
        mapping: mappingRef.current,
      });
      if (Object.keys(result.updates).length > 0) {
        updateAnswersRef.current(result.updates);
      }
      return result;
    },
    [loadLookupTables, pleaseSelectLabel],
  );

  const loadRdwForPlate = useCallback(
    (plate: string) => {
      if (!fetchRdwInfo) {
        return;
      }
      const requestedPlate = normalizeLicensePlate(plate);
      if (!requestedPlate || !isDutchLicensePlate(requestedPlate)) {
        return;
      }
      if (inFlightPlateRef.current === requestedPlate) {
        return;
      }

      setRdwLookupFailed(false);
      inFlightPlateRef.current = requestedPlate;

      void fetchRdwInfo(requestedPlate)
        .then(async (response) => {
          if (readCurrentPlate() !== requestedPlate) {
            return;
          }

          if (response) {
            const overwrite =
              lastSuccessfulPlateRef.current !== null &&
              lastSuccessfulPlateRef.current !== requestedPlate;
            lastSuccessfulPlateRef.current = requestedPlate;
            setRdwInfo(response);
            setRdwLookupFailed(false);
            const match = await applyAutofill(response, overwrite);
            onLookupResultRef.current?.({
              plate: requestedPlate,
              info: response,
              typeMatched: match.typeMatched,
              failed: false,
            });
            return;
          }

          setRdwInfo(null);
          setRdwLookupFailed(true);
          updateAnswersRef.current(
            clearRdwAutofillAnswers(fieldKeysRef.current, pleaseSelectLabel, mappingRef.current),
          );
          onLookupResultRef.current?.({
            plate: requestedPlate,
            info: null,
            typeMatched: false,
            failed: true,
          });
        })
        .catch(() => {
          if (readCurrentPlate() !== requestedPlate) {
            return;
          }
          setRdwInfo(null);
          setRdwLookupFailed(true);
          updateAnswersRef.current(
            clearRdwAutofillAnswers(fieldKeysRef.current, pleaseSelectLabel, mappingRef.current),
          );
          onLookupResultRef.current?.({
            plate: requestedPlate,
            info: null,
            typeMatched: false,
            failed: true,
          });
        })
        .finally(() => {
          if (inFlightPlateRef.current === requestedPlate) {
            inFlightPlateRef.current = null;
          }
        });
    },
    [applyAutofill, fetchRdwInfo, pleaseSelectLabel],
  );

  const handlePlateChange = useCallback(
    (value: string) => {
      const plateKey = plateAnswerKey();
      const typeKey = mappingRef.current.type ?? LEGACY_LICENSE_PLATE_MAPPING.type;
      const current = getAnswersRef.current()[plateKey] ?? { value: '', displayValue: '' };
      updateAnswersRef.current({
        [plateKey]: { ...current, value, displayValue: value },
      });

      const normalizedPlate = normalizeLicensePlate(value);
      const plateChanged =
        normalizedPlate.length > 0 &&
        lastSuccessfulPlateRef.current !== null &&
        normalizedPlate !== lastSuccessfulPlateRef.current;

      if (plateChanged || normalizedPlate.length < 6) {
        setRdwInfo(null);
        setRdwLookupFailed(false);
        if (plateChanged && fieldKeysRef.current.has(typeKey)) {
          updateAnswersRef.current({
            [typeKey]: { value: '', displayValue: pleaseSelectLabel },
          });
        }
      }

      if (isDutchLicensePlate(normalizedPlate)) {
        loadRdwForPlate(normalizedPlate);
      }
    },
    [loadRdwForPlate, pleaseSelectLabel],
  );

  useEffect(() => {
    if (!fetchRdwInfo) {
      return;
    }
    if (rdwInfo || rdwLookupFailed) {
      return;
    }
    const plate = readCurrentPlate();
    if (isDutchLicensePlate(plate)) {
      loadRdwForPlate(plate);
    }
  }, [fetchRdwInfo, loadRdwForPlate, rdwInfo, rdwLookupFailed]);

  useEffect(() => {
    const keys = autofillKeys();
    setFieldsRequired(keys, Boolean(fetchRdwInfo && rdwLookupFailed));
    return () => setFieldsRequired(keys, false);
  }, [fetchRdwInfo, fieldKeys, mapping, rdwLookupFailed, setFieldsRequired]);

  return {
    rdwInfo,
    rdwLookupFailed,
    handlePlateChange,
    loadRdwForPlate,
  };
}
