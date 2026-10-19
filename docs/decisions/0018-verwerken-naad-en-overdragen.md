# 0018. De naad naar verwerken, overdragen aan een collega, postcode controleren

**Status:** gebouwd; actieve diensten openen `ServiceFormScreen` (slices 12/18), afgeronde
diensten openen dezelfde schermimplementatie in finishmodus. De oude
`ProcessingService.js`/`ProcessingFinish.js` blijven alleen gedragsnaslag in `legacy/`.

## Context

Slice 6 heet in de roadmap "verwerken", met de toevoeging dat het team `ProcessingService` zelf
herbouwt. Bij het lezen van de oude code bleek die scheiding preciezer te liggen dan de roadmap-tekst
deed vermoeden:

- **`ProcessingServiceWrapper.tsx`/`ProcessingFinishedWrapper.tsx`** zijn dunne lagen om de
  eigenlijke formulieren heen: ze laden de dienst, roepen bij een submit/decline/finish
  `useProcessingExitFlow` aan, en verder niets. Die wrappers zijn wél geanalyseerd — het zijn de
  naad, niet het formulier. `resolveProcessingExit`/`getExitTarget` (`services`-domein) bestonden
  al sinds slice 0 als pure regels; er hing alleen nog geen navigatie aan.
- **"Overdragen aan een collega" hoort niet bij verwerken.** `ForwardAssignment` (met de
  `ForwardButton`) zit op de kaart van een **wachtende** opdracht in de opdrachtenlijst
  (`IncidentCard`/`PLTRIncidentCard`, `canForward`), niet ergens diep in een dienst. `canForward`
  komt van `GET /api/workers` (`dn_canforwardallocationcode`) — een endpoint dat in de roadmap al
  bij slice 3 stond genoemd, maar daar nooit gebouwd is (slice 3 ging over de eenheid, niet de
  medewerker zelf). Dat is hier alsnog gedaan, als het kleine nieuwe domein `worker`.
- **Postcode controleren** (`POST /api/check/zipcode`) wordt in de oude app alleen aangeroepen
  vanuit het (niet geanalyseerde) adresveld in `ProcessingService`. Zonder dat scherm is er nergens
  een plek voor in de UI; de regel is toegevoegd als kale API-functie, met een test, en wacht op een
  scherm zodra dat formulier er is. De oude hook (`useZipCode`) bouwde het verzoek trouwens fout op
  (`houseNumber` in plaats van `housenumber` — zie
  [bekende-fouten-oude-app.md](../functioneel/bekende-fouten-oude-app.md), regel 25).

## Besluit

- **`worker`** is een nieuw, kaal domein: `GET /api/workers` (forward-vlag én
  `dn_availabilitystatuscode` voor de header-pill), plus `PUT /api/workers/availability` om de
  status te wijzigen. Geen `dn_workertypecode` (intern/extern komt al uit de inlogmethode). De
  keuzelijst filtert op loginmethode: extern alleen beschikbaar/niet beschikbaar; intern alles
  behalve "bezig met opdracht(en)".
- **`allocations` kreeg een derde service** (naast `allocation-actions-service` en
  `service-actions-service`): `reassign-service.ts`, met `listColleagues` (`dn_collegues`,
  dezelfde generieke `reference-data`-sync als `dn_fleets`) en `reassign` (de aanroep). Het
  `AllocationReassignSheet` is een bottom sheet op de opdrachtkaart: een naam zoeken en
  aantikken, zonder aparte bevestiging — precies zoals `ForwardAssignment` dat ook deed.
- **`use-processing-exit.ts`** verbindt `resolveProcessingExit`/`getExitTarget` met echte
  navigatie (Expo Router) en een cache-invalidatie, in plaats van de Zustand-store die de oude
  `getExitNavigationTarget` binnenin zichzelf las. Vandaag heeft dat twee echte, geanalyseerde
  triggers, geen verzonnen derde:
  - **`blocked`**: een actieve dienst aantikken haalt hem eerst vers op (`updateServiceWithId`'s
    eigen gewoonte); mag hij niet meer verstuurd worden (iemand anders was sneller, of de status
    veranderde ondertussen), dan verlaat de app dat scherm meteen — exact het gedrag van
    `ProcessingServiceWrapper`'s eigen effect bij het openen.
  - **`finish`**: een dienst die al op HULPVERLENING_AFGEROND staat opent `ServiceFormScreen` in
    finishmodus. Die toont Start en Afleveren apart en read-only; de Finish-knop ruimt de fase-1-
    snapshot op en voert daarna dezelfde exitflow als `ProcessingFinishedWrapper` uit.
  - Alles daartussen (de meeste actieve diensten, nog in fase 1) opent sinds slice 12
    `ServiceFormScreen` via `useOpenService` — geen "nog gebouwd"-melding meer.

## Gevolgen

- **De finishweergave volgt de legacywerking, niet de legacycode.** `ServiceFormScreen` toont op
  één scherm de fase 1- en fase 2-gegevens via Start/Afleveren; Start gebruikt de volledige
  fase-1-snapshot wanneer die bestaat en anders de actuele dienstdata. Afleveren gebruikt altijd
  de actuele dienstdata. Finish verwijdert de
  snapshot en voert de wrapper-exit uit; de door `ProcessingFinish.js` gebouwde statuspayload wordt
  door de wrapper genegeerd en veroorzaakt geen extra CRM-mutatie.
- **De PLTR-variant van "incident" als bestemming** (`getExitTarget`'s `variant: 'pltr'`) deelt het
  pad `/allocations/[id]` met het gewone dienstenscherm. Sinds slice 7 kiest dat scherm het
  PLTR-scherm als het type planbaar transport is ([ADR 0019](0019-pltr.md)).
- **`POST /api/incidents/{id}`** (incident bijwerken) hoort net als `PUT/POST /api/services/*` bij
  de verwerkingsflow zelf en is niet gebouwd — zie [api-contract.md](../functioneel/api-contract.md).
