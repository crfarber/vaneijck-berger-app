import { useCallback, useEffect, useRef, useState } from 'react';
import { isDutchLicensePlate, normalizeLicensePlate } from '@/domeinen/allocation-unit';
import type { LookupRow, RdwInfo } from '@/domeinen/rdw';
import {
  applyRdwVehicleAutofill,
  clearRdwAutofillAnswers,
  RDW_AUTOFILL_FIELD_NAMES,
} from '../domain/rdw-autofill';
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
}: UseRdwVehicleRegistrationParams) {
  const service = useServiceFormService();
  const [rdwInfo, setRdwInfo] = useState<RdwInfo | null>(null);
  const [rdwLookupFailed, setRdwLookupFailed] = useState(false);
  const lastSuccessfulPlateRef = useRef<string | null>(null);
  const inFlightPlateRef = useRef<string | null>(null);
  const getAnswersRef = useRef(getAnswers);
  const updateAnswersRef = useRef(updateAnswers);
  const fieldKeysRef = useRef(fieldKeys);
  useEffect(() => {
    getAnswersRef.current = getAnswers;
    updateAnswersRef.current = updateAnswers;
    fieldKeysRef.current = fieldKeys;
  }, [fieldKeys, getAnswers, updateAnswers]);

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
      const updates = applyRdwVehicleAutofill({
        rdwInfo: info,
        answers: getAnswersRef.current(),
        fieldKeys: fieldKeysRef.current,
        countries: tables.countries,
        vehicleBrands: tables.vehicleBrands,
        vehicleTypes: tables.vehicleTypes,
        pleaseSelectLabel,
        overwriteRdwDerivedFields,
      });
      if (Object.keys(updates).length > 0) {
        updateAnswersRef.current(updates);
      }
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
          const currentPlate = normalizeLicensePlate(
            String(
              getAnswersRef.current().dn_vehicleregistrationno?.displayValue ??
                getAnswersRef.current().dn_vehicleregistration?.displayValue ??
                '',
            ),
          );
          if (currentPlate !== requestedPlate) {
            return;
          }

          if (response) {
            const overwrite =
              lastSuccessfulPlateRef.current !== null &&
              lastSuccessfulPlateRef.current !== requestedPlate;
            lastSuccessfulPlateRef.current = requestedPlate;
            setRdwInfo(response);
            setRdwLookupFailed(false);
            await applyAutofill(response, overwrite);
            return;
          }

          setRdwInfo(null);
          setRdwLookupFailed(true);
          updateAnswersRef.current(
            clearRdwAutofillAnswers(fieldKeysRef.current, pleaseSelectLabel),
          );
        })
        .catch(() => {
          const currentPlate = normalizeLicensePlate(
            String(
              getAnswersRef.current().dn_vehicleregistrationno?.displayValue ??
                getAnswersRef.current().dn_vehicleregistration?.displayValue ??
                '',
            ),
          );
          if (currentPlate !== requestedPlate) {
            return;
          }
          setRdwInfo(null);
          setRdwLookupFailed(true);
          updateAnswersRef.current(
            clearRdwAutofillAnswers(fieldKeysRef.current, pleaseSelectLabel),
          );
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
      const plateKey = fieldKeysRef.current.has('dn_vehicleregistrationno')
        ? 'dn_vehicleregistrationno'
        : 'dn_vehicleregistration';
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
        if (plateChanged && fieldKeysRef.current.has('_dn_vehicletypeid_value')) {
          updateAnswersRef.current({
            _dn_vehicletypeid_value: { value: '', displayValue: pleaseSelectLabel },
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
    const plate = normalizeLicensePlate(
      String(
        getAnswersRef.current().dn_vehicleregistrationno?.displayValue ??
          getAnswersRef.current().dn_vehicleregistration?.displayValue ??
          '',
      ),
    );
    if (isDutchLicensePlate(plate)) {
      loadRdwForPlate(plate);
    }
  }, [fetchRdwInfo, loadRdwForPlate, rdwInfo, rdwLookupFailed]);

  useEffect(() => {
    const keys = RDW_AUTOFILL_FIELD_NAMES.filter((key) => fieldKeys.has(key));
    setFieldsRequired(keys, Boolean(fetchRdwInfo && rdwLookupFailed));
    return () => setFieldsRequired(keys, false);
  }, [fetchRdwInfo, fieldKeys, rdwLookupFailed, setFieldsRequired]);

  return {
    rdwInfo,
    rdwLookupFailed,
    handlePlateChange,
  };
}
