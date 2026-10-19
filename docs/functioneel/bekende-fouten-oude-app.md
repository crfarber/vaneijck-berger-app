# Bekende fouten van de oude app

Gevonden bij het overnemen van gedrag uit de oude app. Deze lijst bevat alleen fouten die nog een expliciet test- of verificatiepunt hebben. Opgeloste fouten zijn uit de actieve lijst verwijderd; bewuste gedragsverschillen staan onderaan.

## Status per 2026-10-17

- De 39 fouten met regressietests zijn gecontroleerd; 35 unieke testbestanden slaagden met 693 tests.
- De afwijking tussen `swagger.json` en de gegenereerde client (oude rij 22) geldt niet meer voor de nieuwe app: die gebruikt eigen API-adapters en genereert geen client uit die spec. Zie [ADR 0004](../decisions/0004-api-laag.md). De test- en acceptatieswagger zijn niet bevestigd.
- Oude fout 35 is in de formuliercode opgelost, maar heeft nog geen directe regressietest voor lege verplichte velden na verzenden en scrollen naar de eerste fout.

| #   | Wat er misging in de oude app                                                                                                                    | Nieuwe app                                                                         | Test                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 35  | De pilot toonde een foutmelding alleen bij een veld dat al was aangeraakt: na "Verzenden" met lege verplichte velden gebeurde er zichtbaar niets | na verzenden staan de fouten bij de velden en springt het formulier naar de eerste | — (geen directe test van deze validatie-/scrollflow; [huidige screen-test](../../src/domeinen/service-form/screens/service-form-screen.test.ts) dekt andere flows; [ADR 0003](../decisions/0003-vitest-in-node.md)) |

## Niet overgenomen, ter controle

- `getIncidentStatus` en de lijsten `INCIDENT_ACTIVE/PENDING/COMPLETED_STATUSCODES` (hun overlap maakt "wachtend" onbereikbaar voor 875920007). Als er iets op leunt, zoeken we de bedoeling bij de eigenaar.
- Het uitloggen wiste ook de taalkeuze. De nieuwe app bewaart alleen de taal; sync-datum en overige lokale data gaan weg (open vraag 12).
- De oude app had drie aparte disclosure-schermen (meldingen, locatie, camera) tijdens onboarding. De nieuwe app heeft één wizard na inloggen (`PermissionDisclosureScreen`) en daarnaast uitleg onder Instellingen → Toestemmingen (zie open vraag 31).
