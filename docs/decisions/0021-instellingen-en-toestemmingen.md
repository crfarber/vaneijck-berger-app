# 0021. Instellingen en toestemmingen

**Status:** gebouwd. Live positie naar de backend niet (open vraag 14). Eenheid afmelden zit in vrijwillig uitloggen (`id` op `AllocationUnitInfo`).

## Context

De 500 m-check (ADR 0016) en push (ADR 0017) vroegen al om toestemming, met de kale systeemdialoog.
De cameratoelichting staat in `Info.plist`. Wat ontbrak: uitleg in de app, en een plek waar de
berger een geweigerde toestemming kan herstellen. Op iOS komt die dialoog na een weigering niet
terug.

## Besluit

- Nieuw domein `settings`. `nextPermissionStep` kiest `ready`, `ask` of `open-settings`. Een
  geweigerde toestemming met `canAskAgain: false` opent de systeeminstellingen en vraagt niet
  opnieuw.
- Scherm via het tandwiel in de header: locatie, meldingen en camera, elk met uitleg en de status.
  Onderin: support, in ontwikkeling ook debug, en uitloggen. De poort `DevicePermissions` leest en
  vraagt; de implementatie zit in `platform/rn/`.
- De 500 m-check verandert niet. Geen positie, geen permissie en geen doel blijven dezelfde drie
  bevestigingen. Een weigering is voor die check nog steeds "geen huidige locatie".
- Het fotoscherm gebruikt dezelfde stap: kan de dialoog niet meer, dan de systeeminstellingen.
- Geen live positie (`POST /api/incidents/{id}/registerlocation`). Dat wacht op open vraag 14.
- Eenheid afmelden gebeurt bij vrijwillig uitloggen via `POST /api/allocation-units/{id}/cancel`
  (veld `id`); mislukt cancel, dan blijft de sessie staan.
- Bovenaan het scherm staat de taal: een toggle met NL en EN. Een tik wisselt de hele app direct.
  Zonder keuze volgt de app de telefoontaal; een keuze staat in de gewone opslag
  (`settings.language`) en wordt bij de start teruggezet, nog tijdens het splashscherm. Uitloggen
  laat de keuze staan, het is een apparaatvoorkeur (open vraag 12). De oude app had hiervoor een
  apart taalscherm met vlaggen; de keuze is hetzelfde, alleen compacter. De taalcode voor
  `client-sync` verandert niet mee (open vraag 6).

## Gevolgen

- De systeemteksten in `app.config.ts` blijven hardcoded Nederlands (Info.plist, geen i18n).
- Terugkomen op het scherm leest de status opnieuw, ook na een bezoek aan de systeeminstellingen.
- Na inloggen toont de app een eenmalige disclosure-wizard (meldingen → locatie → camera) via
  `/permission-disclosure` vóór de onboarding-gate. OS-dialogen lopen via `DevicePermissions`;
  `PushGateway.permission()` leest alleen. Uitleg en herstel blijven ook onder Instellingen →
  Toestemmingen (open vraag 31).
