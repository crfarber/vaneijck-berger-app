import {
  parseConcatenatedAddress,
  toCoordinate,
  type Coordinate,
  type ParsedAddress,
} from '@/domeinen/location';
import { SERVICE_STATUS } from './status';
import { getServiceParty, getServiceVehicle, type VehicleSummary } from './service-summary';

/**
 * What the PLTR screen shows and which step comes next. Ported from `PLTRScreen`,
 * `PLTRServiceCard` and `getServiceAction`. The processing forms themselves stay with the team;
 * `finish` is the existing closing-screen seam.
 *
 * Two old mistakes are not copied:
 * - The footer compared `label === null`, but a missing action is `null` itself, so `label` was
 *   `undefined` and the button fell through to "next step". No action means no button.
 *   HULPVERLENING_AFGEROND opens the closing screen instead of that fallback.
 * - `MapModal` hid Apple Maps on iOS (`Platform.OS !== 'ios'`). The three links are always offered.
 */

export const PLTR_PHASE = {
  load: 'load',
  delivery: 'delivery',
} as const;

export type PltrPhase = (typeof PLTR_PHASE)[keyof typeof PLTR_PHASE];

export const PLTR_ACTION = {
  accept: 'accept',
  startLoad: 'start-load',
  startDelivery: 'start-delivery',
  finish: 'finish',
  completed: 'completed',
} as const;

export type PltrAction = (typeof PLTR_ACTION)[keyof typeof PLTR_ACTION];

/** A CRM record. Only the fields this module reads are accessed; the rest stays untouched. */
export type PltrRecord = { readonly [field: string]: unknown };

export type PltrCard = {
  phase: PltrPhase;
  name?: string;
  streetLine?: string;
  localityLine?: string;
  country?: string;
  /** Incident creation time, when parseable — same value the old PLTR card showed top-right. */
  createdOn?: string;
  coordinate: Coordinate | null;
  phone?: string;
  /** Checkmark: the load is done once delivery has started; both are done once the service is finished. */
  complete: boolean;
  showNavigate: boolean;
  showCall: boolean;
};

export type PltrVehicle = VehicleSummary;

export type ExternalMapLinks = {
  apple: string;
  google: string;
  waze: string;
};

const PHASES: readonly PltrPhase[] = [PLTR_PHASE.load, PLTR_PHASE.delivery];

const LOADED = SERVICE_STATUS.HULPVERLENING_AKKOORD;
const FINISHED = SERVICE_STATUS.HULPVERLENING_AFGEROND;

/**
 * The one button under the phase cards. `null` hides it: a status this screen has no step for
 * (vergeefse rit, nacontrole, …) must not grow a generic "next" button.
 */
export function pltrPrimaryAction(statuscode: number | undefined): PltrAction | null {
  switch (statuscode) {
    case SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP:
      return PLTR_ACTION.accept;
    case SERVICE_STATUS.NOG_AANSTUREN:
    case SERVICE_STATUS.IN_UITVOERING:
      return PLTR_ACTION.startLoad;
    case SERVICE_STATUS.HULPVERLENING_AKKOORD:
      return PLTR_ACTION.startDelivery;
    case SERVICE_STATUS.HULPVERLENING_AFGEROND:
      return PLTR_ACTION.finish;
    case SERVICE_STATUS.LAATSTE_BERICHT:
      return PLTR_ACTION.completed;
    default:
      return null;
  }
}

/**
 * Load and delivery cards, in that order. A phase is shown only when its address string parses
 * (`dn_total_servicestartlocation` / `dn_total_servicedeliverylocation`, then the concatenated
 * location). The lines prefer the structured location fields and fall back to that parsed address:
 * the old card computed the parse and then rendered only the structured fields, so a concat-only
 * address showed an empty card.
 */
export function buildPltrCards(input: {
  service: PltrRecord | null | undefined;
  incident: PltrRecord | null | undefined;
}): PltrCard[] {
  const { service, incident } = input;
  const status = statusOf(service);
  const createdOn = presentCreatedOn(incident);
  const cards: PltrCard[] = [];

  for (const phase of PHASES) {
    const parsed = parsePhaseAddress(service, incident, phase);
    if (!parsed) {
      continue;
    }
    const structured = structuredLocation(service, phase);
    const coordinate = structured.coordinate;
    const phone = structured.phone;
    cards.push({
      phase,
      name: structured.name ?? parsed.name,
      streetLine: structured.streetLine ?? parsed.streetLine,
      localityLine: structured.localityLine ?? parsed.localityLine,
      country: structured.country ?? parsed.country,
      ...(createdOn ? { createdOn } : {}),
      coordinate,
      phone,
      complete: phaseComplete(status, phase),
      showNavigate: offerNavigate(status, phase) && coordinate !== null,
      showCall: offerCall(status, phase) && phone !== undefined,
    });
  }

  return cards;
}

/** Licence plate, and brand plus trade name when both are present. No RDW lookup. */
export const pltrVehicle = getServiceVehicle;

/**
 * "Client / insurer" from the formatted lookup labels. The raw lookup id is a GUID and is ignored.
 */
export const pltrPartyLabel = getServiceParty;

/** Apple Maps, Google Maps and Waze. Always all three; the platform does not drop one. */
export function externalMapLinks(coordinate: Coordinate): ExternalMapLinks {
  const { latitude, longitude } = coordinate;
  return {
    apple: `http://maps.apple.com/?ll=${latitude},${longitude}`,
    google: `http://maps.google.com/maps?q=${latitude},${longitude}`,
    waze: `https://waze.com/ul?ll=${latitude},${longitude}&z=10&navigate=yes`,
  };
}

function statusOf(service: PltrRecord | null | undefined): number | undefined {
  const status = service?.statuscode;
  return typeof status === 'number' ? status : undefined;
}

/**
 * Delivery navigation shows only while the service is in the delivery phase. The old card also
 * ORed a `hasBeenLoaded` flag, but that flag was computed from the card's own phase, so it was
 * never true on the delivery card. The visible rule is the one below.
 */
function offerNavigate(status: number | undefined, phase: PltrPhase): boolean {
  if (phase === PLTR_PHASE.load) {
    return status !== LOADED && status !== FINISHED;
  }
  return status === LOADED;
}

/** A call is offered on the phase that is current: delivery while delivering, otherwise the load. */
function offerCall(status: number | undefined, phase: PltrPhase): boolean {
  if (phase === PLTR_PHASE.delivery) {
    return status === LOADED;
  }
  return status !== LOADED;
}

function phaseComplete(status: number | undefined, phase: PltrPhase): boolean {
  if (status === FINISHED) {
    return true;
  }
  return phase === PLTR_PHASE.load && status === LOADED;
}

function parsePhaseAddress(
  service: PltrRecord | null | undefined,
  incident: PltrRecord | null | undefined,
  phase: PltrPhase,
): (ParsedAddress & { name?: string }) | undefined {
  const raw =
    phase === PLTR_PHASE.load
      ? (readText(service, 'dn_total_servicestartlocation') ??
        readText(service, 'dn_concatlocation') ??
        readText(incident, 'dn_concatlocation'))
      : (readText(service, 'dn_total_servicedeliverylocation') ??
        readText(service, 'dn_concatlocation') ??
        readText(incident, 'dn_concatlocation'));
  const parsed = parseConcatenatedAddress(raw);
  if (!parsed) {
    return undefined;
  }
  const name =
    phase === PLTR_PHASE.load
      ? (readText(service, 'dn_loadinglocationname') ?? readText(incident, 'dn_name'))
      : readText(service, 'dn_deliveryname');
  return { ...parsed, name };
}

type StructuredLocation = {
  name?: string;
  streetLine?: string;
  localityLine?: string;
  country?: string;
  coordinate: Coordinate | null;
  phone?: string;
};

function structuredLocation(
  service: PltrRecord | null | undefined,
  phase: PltrPhase,
): StructuredLocation {
  if (phase === PLTR_PHASE.load) {
    return {
      name: readText(service, 'dn_loadinglocationname'),
      streetLine: joinParts([
        readText(service, 'dn_loadinglocationstreet'),
        readText(service, 'dn_loadinglocationhouseno'),
      ]),
      localityLine: locality(
        readText(service, 'dn_loadinglocationpostalcode'),
        readText(service, 'dn_loadinglocationcity'),
      ),
      country: readFormatted(service, '_dn_loadinglocationcountryid_value'),
      coordinate: readCoordinate(
        service,
        'dn_loadinglocationlatitude',
        'dn_loadinglocationlongitude',
      ),
      phone: readText(service, 'dn_loadinglocationphoneno'),
    };
  }
  return {
    name: readText(service, 'dn_deliveryname'),
    streetLine: joinParts([
      readText(service, 'dn_deliverystreet'),
      readText(service, 'dn_deliveryhouseno'),
    ]),
    localityLine: locality(
      readText(service, 'dn_deliverypostalcode'),
      readText(service, 'dn_deliverycity'),
    ),
    country: readFormatted(service, '_dn_deliverycountryid_value'),
    coordinate: readCoordinate(service, 'dn_deliverylatitude', 'dn_deliverylongitude'),
    phone: readText(service, 'dn_deliverylocationphoneno'),
  };
}

function readCoordinate(
  service: PltrRecord | null | undefined,
  latitudeKey: string,
  longitudeKey: string,
): Coordinate | null {
  if (!service) {
    return null;
  }
  return toCoordinate(decimal(service[latitudeKey]), decimal(service[longitudeKey]));
}

/** Same gate as the incident card: only a parseable ISO string reaches the UI. */
function presentCreatedOn(incident: PltrRecord | null | undefined): string | undefined {
  const value = incident?.createdon;
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : undefined;
}

/** CRM sometimes sends "52,37" instead of "52.37". */
function decimal(value: unknown): unknown {
  return typeof value === 'string' ? value.replace(/,/g, '.') : value;
}

function locality(postalCode: string | undefined, city: string | undefined): string | undefined {
  if (postalCode && city) {
    return `${postalCode}, ${city}`;
  }
  return postalCode ?? city;
}

function joinParts(parts: readonly (string | undefined)[]): string | undefined {
  const present = parts.filter((part): part is string => part !== undefined && part !== '');
  return present.length > 0 ? present.join(' ') : undefined;
}

function readText(source: PltrRecord | null | undefined, key: string): string | undefined {
  if (!source) {
    return undefined;
  }
  return asText(source[key]) ?? readFormatted(source, key);
}

function readFormatted(source: PltrRecord | null | undefined, key: string): string | undefined {
  if (!source) {
    return undefined;
  }
  return asText(source[`${key}@OData.Community.Display.V1.FormattedValue`]);
}

function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
