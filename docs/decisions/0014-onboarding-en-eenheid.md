# 0014. Onboarding en eenheidsregistratie

**Status:** gebouwd voor externe en interne bergers; QR-scannen als sneltoets volgt later (zie "Gevolgen").

## Context

De oude app had twee aparte mechanismen: een eenmalige vlag `HasSeenOnboarding` die na de eerste
registratie nooit meer gecontroleerd wordt, en een los aanroepbare `useForceUserReregister` die
elders (bijvoorbeeld bij "kies ander voertuig") controleert of de huidige eenheid nog geldig is.
Beide bepalen uiteindelijk hetzelfde: heeft deze berger een bruikbare, nog geldige eenheid?

## Besluit

Eén poort in plaats van twee: `useOnboardingGate` draait bij elke start van het beveiligde deel van
de app (niet alleen de allereerste keer) en beslist met `decideReregister`
([`domain/reregister.ts`](../../src/domeinen/allocation-unit/domain/reregister.ts), letterlijk
overgenomen van `useForceUserReregister`, inclusief de asymmetrie dat een verlopen dienst met actieve
opdrachten niets hoeft te doen terwijl een ontbrekende eenheid of ontbrekend voertuig in dat geval
wél "blocked" is — dat is het gedrag van de oude app, niet een keuze van mij) of de eenheid nog
geldig is. Geen aparte `HasSeenOnboarding`-vlag meer nodig: een verlopen eenheid stuurt vanzelf
terug naar hetzelfde registratiescherm, elke keer dat de app opstart.

`allocation-unit` kreeg een registratiescherm (kenteken, vier beschikbaarheidsschakelaars, eindtijd)
dat `POST /api/allocation-units/externalworker` gebruikt bij een nieuwe eenheid en
`PATCH /api/allocation-units` bij een bestaande — dezelfde keuze als de oude app's
`submitAllocationUnit`. "Kenteken opzoeken (RDW)" uit de eerdere roadmap-tekst bleek niet te kloppen:
RDW-verrijking bestaat in de oude app wel, maar voor voertuigen bij een _dienst_, niet voor de
eigen eenheid — de roadmap-tekst is aangepast.

### Correctie: intern is geen cameravraagstuk, het is een datavraagstuk

De eerste versie van dit besluit zette de hele interne flow (`SelectTransport`,
`ScanQRTransport`, `SelecteerTruck`/`Trailer`) op één hoop als "vraagt cameratoegang". Bij het
uitzoeken bleek dat maar voor de helft te kloppen: de oude app biedt interne bergers zowel "Scan QR
Code" als "Voer handmatig een kenteken in" aan, en de QR-scan zelf (`views/ScanQRTransport.tsx`)
doet niets anders dan de gescande tekst opzoeken in dezelfde vlootlijst die het handmatige zoekscherm
ook gebruikt — de camera is puur een sneltoets om niet te hoeven typen. Die vlootlijst (`dn_fleets`)
komt bovendien niet uit een aparte "vloot-API": het is gewoon één van de generieke `client-sync`-
entiteiten uit [ADR 0013](0013-referentiedata-sync.md), al klaar via `reference-data.getEntity()`.

Dus: **handmatig kiezen uit de vloot hoefde niet op camera te wachten** en is nu gebouwd
(`allocation-unit/domain/fleet.ts`, `components/fleet-picker-sheet.tsx`,
`screens/register-internal-unit-screen.tsx`). Alleen de QR-sneltoets zelf blijft wachten op
cameratoegang (roadmap slice 8/10).

Bij het bouwen hiervan bleek `checkReregister` een echte fout in de herbouw zelf te hebben (geen
oude-app-fout, dus geen rij in [bekende-fouten-oude-app.md](../functioneel/bekende-fouten-oude-app.md)):
de mapping naar `hasVehicle` keek alleen naar `alternateVehicleRegistrationNumber` (het externe veld),
dus elke interne eenheid — hoe geldig ook — werd behandeld als "geen voertuig". Gefixt door ook
`vehicleId` te controleren; `decideReregister` zelf was al goed (die kent alleen een abstracte
`hasVehicle`, zie de review-testcase in `allocation-unit-service.test.ts`).

## Gevolgen

- **Externe en interne bergers werken nu, allebei handmatig.** Interne bergers kiezen een trekker
  (verplicht) en optioneel een aanhanger uit de vloot; daarna dezelfde beschikbaarheids- en
  eindtijdstap als extern. Alleen de QR-sneltoets ontbreekt nog (cameratoegang, roadmap slice 8/10).
- **"Vorig voertuig onthouden"** (de sneltoetskaart in de oude `SelectTransport` en het automatisch
  invullen in `getSavedVehicleIfAvailable`) is bewust niet overgenomen: een nicetohave, geen kernfunctie.
  Elke keer opnieuw kiezen uit de vloot is de huidige situatie.
- **"Afmelden" (`POST /api/allocation-units/{id}/cancel`) gebeurt bij vrijwillig uitloggen.** Het
  id-veld is `id` op `AllocationUnitInfo` (zelfde als de oude app). `SignOutGuard` cancelleert de
  eenheid vóór de sessie te wissen; mislukt cancel, dan blijft de berger ingelogd. Er is geen aparte
  afmeldknop in instellingen. Uitloggen is ook geblokkeerd zolang er een actieve opdracht is.
- **Geen geldige eenheid, wel een opdracht op je naam:** de poort toont een melding
  ("Doorgaan" / "Dispatch bellen") en laat de berger de opdracht afronden. Mislukt registreren
  met `ACTIVE_INCIDENT`, dan zet `reportOpenWork` een sessievlag zodat je niet terugvalt in het
  registratiescherm (`decideOnboarding`).
- De toestemmingsschermen (notificaties, locatie, camera) uit de oude `SynchronizeScreen` zijn niet
  overgenomen: die horen bij de permissie-slices (9 en 10), niet bij dit mechanisme.
- Taalcode, RDW-verrijking voor diensten en het instellingenscherm blijven open voor latere slices.
