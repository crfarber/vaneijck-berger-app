# 0016. Dienstenscherm en de 500 m-check

**Status:** gebouwd; het openen van een dienst zelf (de verwerkingsflow) ontbreekt bewust.

## Context

Slice 4 verplaatste "de 500 m-bevestiging" hierheen nadat bleek dat die bij het accepteren van een
**dienst** hoort (`useAcceptService`/`useLocationCheck`), niet bij het accepteren van een opdracht.
De regels zelf (`checkAcceptLocation`, `decideProximity`, met de drie bevestigingsredenen: geen
huidige locatie, doellocatie onbekend, te ver weg) stonden al klaar in `location`/`services` — ze
waren alleen nog nergens aan een apparaat gekoppeld, want er was nog geen enkele locatie-permissie
in de app. Dat hoort officieel bij slice 10 ("locatie en permissies", met permissieteksten en een
instellingenscherm).

In overleg gekozen: nu een kale versie bouwen (`expo-location`, de systeemvraag zonder eigen
uitlegscherm — exact wat de oude app ook deed) in plaats van dit uitstellen. Slice 10 voegt later de
nettere permissietekst, uitleg vooraf en een instellingenscherm toe; het onderliggende mechanisme
verandert dan niet.

## Besluit

- **`location` kreeg zijn eerste platformlaag**: `LocationReader` (poort, in `service/`, zoals
  `InternalAuth` bij `auth`) en `createExpoLocationReader` (`platform/rn/`, geëxporteerd via het
  nieuwe `location/ui.ts`). Vraagt bij eerste gebruik om toestemming; een weigering of geen fix wordt
  gewoon `{isValid: false}` — geen aparte foutafhandeling nodig, want `decideProximity` behandelt dat
  toch al als "locatie onbekend, vraag bevestiging".
- **`allocations` kreeg een tweede service** (naast `allocation-actions-service`):
  `service-actions-service.ts`, met `checkAcceptProximity` (de beslissing) en `acceptService` (de
  aanroep, `PUT /api/services/{id}/accept`). Bewust gescheiden van de beslissing: de hook toont de
  bevestiging (`Alert`) en roept bij bevestigen gewoon opnieuw `acceptService` aan — geen `Alert` in
  de servicelaag.
- **`ServicesScreen`** toont de diensten van een opdracht in twee secties (actief/wachtend), met
  dezelfde herindeling als de oude app: een afgeronde dienst blijft zichtbaar in "actief" (niet een
  aparte derde sectie, niet verborgen). `hydrateServices` (al klaar sinds een eerdere slice) haalt de
  volledige diensten op zodra het scherm opent, met de al bekende diensten uit de opdrachtenlijst als
  basis voor de samenvoeging.
- Een geaccepteerde opdracht is nu aantikbaar (`AllocationRow`) en opent dit scherm —
  `src/app/(app)/allocations/[id]/index.tsx`, de eerste geneste route in deze herbouw.

## Gevolgen

- **Het openen van een dienst** (de knop "Preview" en het aantikken van een actieve dienst) navigeert
  in de oude app naar `ProcessingService`/`ProcessingFinish` — dat herbouwt het team zelf
  (`docs/legacy.md`). Er is dus nog niets om naartoe te navigeren; dit scherm toont alleen status en
  accepteert.
- **RDW-verrijking van diensten** (merk, model, kleur van het voertuig) is niet meegenomen — de oude
  app haalt dat apart op (`enrichServiceWithRdwData`) en dat is nog niet geport. Het kaartje toont nu
  kenteken en chauffeursnaam zoals die al in de dienstdata zitten, zonder verrijking.
- De permissietekst in `app.config.ts` is hardcoded Nederlands: net als de splash screen wordt die
  niet via i18n vertaald (het is een systeemstring uit Info.plist, geen in-app tekst).
