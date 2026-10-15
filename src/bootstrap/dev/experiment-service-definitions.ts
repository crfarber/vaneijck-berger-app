import achtergelatenVoertuig from '../../../docs/diensten/experiment/Achtergelaten_voertuig.json';
import afgifte from '../../../docs/diensten/experiment/Afgifte.json';
import assistance from '../../../docs/diensten/experiment/Assistance.json';
import belastingdienst from '../../../docs/diensten/experiment/Belastingdienst.json';
import berging from '../../../docs/diensten/experiment/Berging.json';
import directTransport from '../../../docs/diensten/experiment/Direct_transport.json';
import incidentManagement from '../../../docs/diensten/experiment/Incident_management.json';
import ontruiming from '../../../docs/diensten/experiment/Ontruiming.json';
import pechhulp from '../../../docs/diensten/experiment/Pechhulp.json';
import planbaarTransport from '../../../docs/diensten/experiment/Planbaar_Transport.json';
import planbaarTransportVdVen from '../../../docs/diensten/experiment/Planbaar_Transport_vd_Ven.json';
import politietakel from '../../../docs/diensten/experiment/Politietakel.json';
import traject from '../../../docs/diensten/experiment/Traject.json';
import verzekeringsdienstverlening from '../../../docs/diensten/experiment/Verzekeringsdienstverlening.json';
import wegsleepverordening from '../../../docs/diensten/experiment/Wegsleepverordening.json';
import zwareBerging from '../../../docs/diensten/experiment/Zware_berging.json';

/**
 * Service-form definitions from `docs/diensten/experiment`. Loaded only while Metro is running
 * (`__DEV__`); a release bundle never requires this module. A new JSON file in that folder must be
 * imported here — `experiment-service-definitions.test.ts` fails when the folder and this list differ.
 */
export const experimentServiceDefinitions: readonly unknown[] = [
  achtergelatenVoertuig,
  afgifte,
  assistance,
  belastingdienst,
  berging,
  directTransport,
  incidentManagement,
  ontruiming,
  pechhulp,
  planbaarTransport,
  planbaarTransportVdVen,
  politietakel,
  traject,
  verzekeringsdienstverlening,
  wegsleepverordening,
  zwareBerging,
];
