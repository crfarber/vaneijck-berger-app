# 0015. Opdrachtenlijst: accepteren, afwijzen en voertuigafgifte

**Status:** gebouwd; "Preview" ontbreekt bewust (zie "Gevolgen"). Voertuigafgifte openen is aangesloten.

## Context

Slice 3's roadmap-tekst noemde "de 500 m-bevestiging" als onderdeel van deze slice. Bij het
uitzoeken van `useAllocationActions.handleAcceptAllocation` (oude app) bleek dat niet te kloppen: het
accepteren van een **opdracht** doet geen locatiecontrole, alleen `forceUserReregister()` en dan
`PUT /api/allocations/{id}/accept`. De 500 m-check (`useLocationCheck`/`shouldProceedWithLocation`,
met de drie bevestigingen: geen locatie, doel onbekend, te ver weg) zit in `useAcceptService.tsx` —
het accepteren van een **dienst** binnen een incident. Die hoort bij slice 5. De roadmap-tekst is
gecorrigeerd; zie ook [target-location.ts](../../src/domeinen/services/domain/target-location.ts),
waar `checkAcceptLocation` daarvoor al klaarstaat.

Ook de eerdere roadmap-tekst "verversen bij terugkeer naar de voorgrond" bleek een verkeerde
aanname: de oude app ververst bij `useFocusEffect` (React Navigation: terugkomen op dit scherm
binnen de app), niet bij `AppState`/echt naar de voorgrond komen. Zo overgenomen.

## Besluit

`allocations` kreeg een service (`allocation-actions-service.ts`) die de HTTP-laag combineert met
twee andere domeinen — hetzelfde patroon als `allocation-unit-service` met `reference-data`:

- **Accepteren** controleert eerst `allocationUnitService.checkReregister(hasOpenAllocations)` —
  precies zoals de oude app vóór elke acceptatie opnieuw checkt, niet alleen bij het opstarten.
  `blocked` toont dezelfde "bel dispatch"-melding als de onboarding-gate; `required` toont een
  korte melding dat de eenheid opnieuw geregistreerd moet worden. Geen aparte "registreer vanaf
  hier"-navigatie zoals de oude app (met scherm-specifieke parameters): de onboarding-gate
  evalueert toch al bij elke render opnieuw uit dezelfde `allocations`-lijst.
- **Afwijzen** navigeert naar een eigen scherm met redenen — net als de oude app nooit een afwijzing
  zonder reden toestond. De redenen komen uit `dn_allocation_statuscode`, een generieke
  `reference-data`-entiteit (dezelfde soort bron als de vloot in [ADR 0014](0014-onboarding-en-eenheid.md)),
  gefilterd met een expliciet benoemde uitsluitlijst (`NOT_A_DECLINE_REASON`) in plaats van de oude
  app's hergebruik van `ALLOCATION_ACTIVE_STATUSCODES` — die lijst betekende daar twee dingen
  tegelijk (welke opdrachten als "actief" tonen, én welke statussen geen geldige afwijsreden zijn),
  wat toevallig bijna dezelfde getallen zijn maar conceptueel iets anders is. Afwijzen wordt
  geblokkeerd zolang een dienst op de opdracht actief in behandeling is (`hasActiveServices`,
  nieuw in `services/domain/status.ts` — smaller dan het bestaande `hasOpenServices`, dat ook
  wachtende diensten meetelt).
- **Afronden** ("klaar met opdracht") is geen apart endpoint: het is een afwijzing met vaste code
  875920014, precies zoals de oude app. Alleen zichtbaar wanneer de opdracht al af is
  (`isAllocationFinished`, al aanwezig sinds een eerdere slice).
- **Voertuigafgifte** is een eigen query (`GET /api/vehicle-releases/locations`, dan per locatie
  `/{id}/assignments`), verdraagzaam net als de rest: één locatie waarvan de toewijzingen niet
  laden verdwijnt uit de lijst, niet de hele sectie. `createAllocationSections` was hier al
  generiek genoeg voor (`vehicleReleases: readonly R[]`) — alleen het echte ophalen ontbrak nog.

### Bewust geen cross-domeinimport naar `onboarding`

`use-allocation-actions.ts` moest oorspronkelijk ook de onboarding-gate's query ongeldig maken na
een wijziging. Dat zou een importcyclus zijn gegeven: `onboarding` importeert nu al van
`allocations` (voor `useAllocations`), dus `allocations` teruglaten importeren van `onboarding` had
een cyclus gemaakt — `architecture.test.ts`/oxlint's `no-cycle` ving dit meteen op. Opgelost door
alleen `allocations.list()` ongeldig te maken: de gate herleidt `hasOpenAllocations` toch al bij
elke render uit diezelfde lijst-query, dus een aantalswijziging wordt vanzelf opgemerkt. Het enige
scenario dat dit niet dekt — de eenheid zelf verloopt terwijl het aantal opdrachten gelijk blijft —
herstelt zichzelf binnen de bestaande 30 s-staleTime van de gate, of bij de eerstvolgende focus.
Bewust niet zwaarder opgelost (geen prop door drie lagen heen) voor dit zeldzame geval.

## Gevolgen

- **"Preview"** (het read-only bekijken van diensten/PLTR vanuit de lijst) is niet gebouwd: het
  doelscherm bestaat pas in slice 5/7.
- **Een voertuigafgifte openen** navigeert direct naar het Afgifte-formulier
  (`/vehicle-releases/[locationId]/services/[serviceId]/form`) met `isReleaseItem` — zelfde
  gedrag als legacy `ReleaseCard` → `ProcessingService`. Submit zet `dn_vehicle_taken_code`,
  `dn_pickedupdate` en status `875920007`; exit is terminal en ververst de afgiftelijst.
- De kaart toont alleen de incidentinfo; Accepteren/Afwijzen/Afronden (en Doorsturen) zitten onder
  de kaart en komen tevoorschijn bij een swipe naar links. Zelfde acties als voorheen, opnieuw
  gebouwd op `ReanimatedSwipeable` en de app-`Button` — geen overname van de oude swipe-UI.
- Het onderscheid PLTR-kaart versus gewone kaart (`PLTRIncidentCard` versus `IncidentCard` in de
  oude app) is niet overgenomen in de kaart-vormgeving — dat wacht op slice 7, waar PLTR een eigen
  scherm krijgt.
