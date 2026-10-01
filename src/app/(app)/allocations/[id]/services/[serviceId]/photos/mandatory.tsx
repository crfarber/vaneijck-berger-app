import { Redirect, useLocalSearchParams } from 'expo-router';

/** Old deep links to /mandatory land on the camera with the help popup. */
export default function MandatoryPhotoRoute() {
  const { id, serviceId, incidentId, statuscode, position, category } = useLocalSearchParams<{
    id: string;
    serviceId: string;
    incidentId: string;
    statuscode: string;
    position?: string;
    category?: string;
  }>();

  const resolvedPosition =
    typeof position === 'string'
      ? position
      : typeof category === 'string'
        ? JSON.stringify({ category })
        : JSON.stringify({ category: 'OVERVIEW' });

  return (
    <Redirect
      href={{
        pathname: '/allocations/[id]/services/[serviceId]/photos/camera',
        params: {
          id,
          serviceId,
          incidentId,
          statuscode,
          mode: 'mandatory',
          position: resolvedPosition,
          help: '1',
        },
      }}
    />
  );
}
