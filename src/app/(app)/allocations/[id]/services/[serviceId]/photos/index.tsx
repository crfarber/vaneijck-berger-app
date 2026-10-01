import { useLocalSearchParams } from 'expo-router';
import { useAllocations, useServices } from '@/domeinen/allocations/ui';
import { photoPhaseFromServiceStatus } from '@/domeinen/photos';
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
  const serviceStatuscode = service?.statuscode ?? (Number(statuscode) || 0);
  const phase = photoPhaseFromServiceStatus(serviceStatuscode) === 'delivery' ? 2 : 1;

  return (
    <PhotoOverviewScreen
      allocationId={id}
      serviceId={serviceId}
      incidentId={resolvedIncidentId}
      serviceStatuscode={serviceStatuscode}
      mandatoryNames={definition?.find((entry) => entry.phase === phase)?.photosMandatory ?? null}
      loadMandatoryNames={definition?.find((entry) => entry.phase === 1)?.photosMandatory ?? null}
    />
  );
}
