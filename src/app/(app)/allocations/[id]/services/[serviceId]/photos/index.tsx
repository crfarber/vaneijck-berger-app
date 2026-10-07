import { useLocalSearchParams } from 'expo-router';
import { useAllocations, useServices } from '@/domeinen/allocations/ui';
import { phaseNumbersFromDefinition, serviceFormPhaseForStatus } from '@/domeinen/service-form';
import { PhotoOverviewScreen } from '@/domeinen/photos/ui';
import { useServiceDefinition } from '@/domeinen/service-form/ui';

export default function ServicePhotosOverviewRoute() {
  const { id, serviceId, incidentId, statuscode } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    incidentId: string;
    statuscode: string;
  }>();
  const { sections } = useAllocations();
  const [active, pending] = sections;
  const allocation = [...active.data, ...pending.data].find((item) => item.dn_allocationid === id);
  const resolvedIncidentId = allocation?.incident.dn_incidentid ?? incidentId;
  const services = useServices(resolvedIncidentId, allocation?.services ?? null);
  const service = (services.data ?? allocation?.services ?? []).find(
    (item) => item.dn_serviceid === serviceId,
  );
  const { state } = useServiceDefinition(service?.dn_servicetypecode ?? undefined);
  const definition = state.status === 'ready' ? state.definition.definition : undefined;
  const phaseNumbers = phaseNumbersFromDefinition(definition);
  const serviceStatuscode = service?.statuscode ?? (Number(statuscode) || 0);
  const formPhase = serviceFormPhaseForStatus(serviceStatuscode, phaseNumbers);
  const firstPhase = phaseNumbers[0];

  return (
    <PhotoOverviewScreen
      allocationId={id}
      serviceId={serviceId}
      incidentId={resolvedIncidentId}
      serviceStatuscode={serviceStatuscode}
      phaseNumbers={phaseNumbers}
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
