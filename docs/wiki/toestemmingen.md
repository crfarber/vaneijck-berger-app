# Toestemmingen

> Gecontroleerd op: `ba1383c` (2026-09-23)
> Bronnen: `src/domeinen/settings/`, `src/domeinen/location/`, `src/domeinen/photos/components/photo-camera.tsx`, `src/domeinen/notifications/`, `src/bootstrap/native.ts`
> Zie ook: [ADR 0016](../decisions/0016-diensten-en-locatie.md), [ADR 0017](../decisions/0017-push-notificaties.md), [ADR 0020](../decisions/0020-fotos.md), [ADR 0021](../decisions/0021-instellingen-en-toestemmingen.md), [flows](../functioneel/flows.md#7-instellingen-werkt)

## Waarvoor

De app gebruikt voorgrondlocatie voor de 500-metercontrole en fotolocatie, meldingen voor nieuwe
opdrachten en de camera voor dienstfoto's. Een weigering blokkeert de app niet volledig: de berger
krijgt waar mogelijk een bevestiging of kan de toestemming later via de systeeminstellingen
herstellen.

## Hoe het werkt

`PermissionsScreen` (via Instellingen → Toestemmingen) leest via `useDevicePermissions` de
OS-status van locatie, meldingen en camera opnieuw zodra het scherm focus krijgt. De pure functie
`nextPermissionStep` bepaalt daarna of niets nodig is, de systeemdialoog nog gevraagd kan worden,
of alleen de systeeminstellingen overblijven.

```mermaid
flowchart LR
    A[Scherm of runtime] --> B[Expo-permissie lezen]
    B --> C{nextPermissionStep}
    C -->|ready| D[Functie gebruiken]
    C -->|ask| E[Systeemdialoog]
    C -->|open-settings| F[Systeeminstellingen]
    E -->|geweigerd| G[Doorgaan zonder functie]
```

De concrete ingangen verschillen per functie:

| Functie | Scherm, hook of service                                                         | Platformflow                                                                                                                                                    |
| ------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locatie | `LocationStatusButton` en `ServiceActionsService` gebruiken `LocationReader`    | `createExpoLocationReader` vraagt alleen voorgrondlocatie zolang de status nog `undetermined` is en leest daarna een eenmalige positie met hoge nauwkeurigheid. |
| Camera  | `PhotosScreen` gebruikt `useCameraPermissions` wanneer de berger een foto maakt | Opnieuw vragen zolang dat mag; anders `Linking.openSettings()`.                                                                                                 |
| Push    | `PushRuntime.start()` vraagt toestemming na een aangemelde start                | `createExpoPushGateway` vraagt alert, badge en geluid en levert alleen bij toestemming een Expo-pushtoken aan de registratie-API.                               |
| Herstel | `PermissionsScreen` toont alle drie statussen                                   | `createExpoDevicePermissions` leest, vraagt en opent de systeeminstellingen via één poort.                                                                      |

## Beweringen

| ID      | Bewering                                                                                                                                                | Code                                                                                                | Test                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| PERM-01 | Als een toestemming al is verleend, biedt de app geen nieuwe toestemmingsactie aan.                                                                     | `src/domeinen/settings/domain/permission-step.ts`                                                   | `src/domeinen/settings/domain/permission-step.test.ts`    |
| PERM-02 | Als de systeemdialoog nog kan verschijnen, biedt de app aan de toestemming te vragen.                                                                   | `src/domeinen/settings/domain/permission-step.ts`                                                   | `src/domeinen/settings/domain/permission-step.test.ts`    |
| PERM-03 | Als de systeemdialoog niet meer kan verschijnen, verwijst de app naar de systeeminstellingen.                                                           | `src/domeinen/settings/domain/permission-step.ts`                                                   | `src/domeinen/settings/domain/permission-step.test.ts`    |
| PERM-04 | Als het toestemmingenscherm focus krijgt, leest het achtereenvolgens de actuele status van locatie, meldingen en camera.                                | `src/domeinen/settings/screens/permissions-screen.tsx`                                              | —                                                         |
| PERM-05 | Als voorgrondlocatie nog niet is gevraagd, vraagt de locatielezer die toestemming; bij weigering, een fout of geen fix levert hij geen geldige positie. | `src/domeinen/location/platform/rn/expo-location-reader.ts`                                         | —                                                         |
| PERM-06 | Als bij het accepteren van een dienst geen huidige positie beschikbaar is, vraagt de app of de berger toch wil doorgaan.                                | `src/domeinen/location/domain/proximity.ts`, `src/domeinen/allocations/hooks/use-accept-service.ts` | `src/domeinen/location/domain/proximity.test.ts`          |
| PERM-07 | Als locatie is toegestaan maar geen fix beschikbaar is, blijft de GPS-knop groen; zonder toestemming is hij rood.                                       | `src/domeinen/location/domain/gps-status.ts`                                                        | `src/domeinen/location/domain/gps-status.test.ts`         |
| PERM-08 | Als de camera nog gevraagd mag worden, vraagt het fotoscherm toestemming bij het maken van een foto; anders opent het de systeeminstellingen.           | `src/domeinen/photos/components/photo-camera.tsx`                                                   | —                                                         |
| PERM-09 | Als pushtoestemming wordt geweigerd, start de app verder en registreert hij geen pushtoken.                                                             | `src/domeinen/notifications/service/push-runtime.ts`                                                | `src/domeinen/notifications/service/push-runtime.test.ts` |
| PERM-10 | Als push is toegestaan maar geen bruikbaar token beschikbaar is, slaat de app backendregistratie over.                                                  | `src/domeinen/notifications/domain/registration.ts`                                                 | `src/domeinen/notifications/domain/registration.test.ts`  |

## Randgevallen en bewuste keuzes

- De app vraagt alleen voorgrondlocatie; er is geen continue tracking of achtergrondlocatie. De
  GPS-tegel kan bij de eerste focus van het opdrachtenoverzicht al de systeemdialoog veroorzaken,
  omdat hij meteen `LocationReader.getCurrent()` aanroept.
- De instellingenadapter en de runtime-adapters delen de OS-status, maar niet één centrale
  aanvraagfunctie: het fotoscherm gebruikt de Expo-camerahook en push gebruikt de pushgateway.
- Een geweigerde locatie wordt voor de 500-metercontrole hetzelfde behandeld als een ontbrekende
  GPS-fix. De drie bevestigingsredenen blijven daardoor: geen huidige positie, geen doelpositie en
  500 meter of verder weg.
- De systeemteksten voor permissies in `app.config.ts` zijn Nederlands en vallen buiten de in-app
  i18n-resources.
- Anders dan de oude navigatie is er geen apart locatie-uitlegscherm. Zie
  [bekende fouten en bewuste verschillen](../functioneel/bekende-fouten-oude-app.md) onder "Niet
  overgenomen, ter controle".
- Push is nog niet met echte EAS-credentials, een fysiek toestel en een backendbericht bewezen; zie
  [ADR 0017](../decisions/0017-push-notificaties.md#gevolgen).

## Open vragen

- [Open vraag 14](../functioneel/open-vragen.md): live positie naar
  `POST /api/incidents/{id}/registerlocation` is niet gebouwd.
- [Open vraag 21](../functioneel/open-vragen.md): de backend moet het Expo-pushtoken via de
  Expo-pushdienst gebruiken.
- [Open vraag 31](../functioneel/open-vragen.md): de huidige aanname is dat geen aparte
  locatie-disclosure-route nodig is.
