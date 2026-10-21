import { useLocalSearchParams } from 'expo-router';
import { useProcessingService } from '@/domeinen/allocations/ui';
import { phaseNumbersFromDefinition, serviceFormPhaseForStatus } from '@/domeinen/service-form';
import { PhotoOverviewScreen } from '@/domeinen/photos/ui';
import { useServiceDefinition } from '@/domeinen/service-form/ui';

export default function ServicePhotosOverviewRoute() {
  const { id, serviceId, incidentId, statuscode, locationId } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    incidentId: string;
    statuscode: string;
    locationId?: string;
  }>();
  const processing = useProcessingService({
    allocationId: id,
    serviceId,
    locationId,
  });
  const resolvedIncidentId =
    processing.incidentId !== '' ? processing.incidentId : (incidentId ?? '');
  const { state } = useServiceDefinition(processing.service?.dn_servicetypecode ?? undefined);
  const definition = state.status === 'ready' ? state.definition.definition : undefined;
  const phaseNumbers = phaseNumbersFromDefinition(definition);
  const serviceStatuscode = processing.service?.statuscode ?? (Number(statuscode) || 0);
  const formPhase = serviceFormPhaseForStatus(serviceStatuscode, phaseNumbers);
  const firstPhase = phaseNumbers[0];

  return (
    <PhotoOverviewScreen
      allocationId={processing.scopeId}
      serviceId={serviceId}
      incidentId={resolvedIncidentId}
      serviceStatuscode={serviceStatuscode}
      phaseNumbers={phaseNumbers}
      locationId={locationId}
      mandatoryNames={
        definition?.find((entry) => entry.phase === formPhase)?.photosMandatory ?? null
      }
      loadMandatoryNames={
        firstPhase === undefined
          ? null
          : (definition?.find((entry) => entry.phase === firstPhase)?.photosMandatory ?? null)
      }
    />
  );
}
