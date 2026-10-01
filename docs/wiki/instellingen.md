# Instellingen

> Gecontroleerd op: `ba1383c` (2026-09-23)
> Bronnen: `src/domeinen/settings/`, `src/app/(app)/settings.tsx`, `src/app/(app)/permissions.tsx`, `src/app/(app)/_layout.tsx`, `src/bootstrap/providers.tsx`
> Zie ook: [ADR 0021](../decisions/0021-instellingen-en-toestemmingen.md), [toestemmingen](toestemmingen.md), [i18n](i18n.md), [support](support.md), [flows](../functioneel/flows.md#7-instellingen-werkt)

## Waarvoor

Het instellingenscherm is de centrale plek waar de berger zijn gegevens ziet (en ververst), de
app-taal kiest, naar toestemmingen, synchronisatiestatus en support gaat, en uitlogt. In een
developmentbuild staat hier ook de ingang naar het debugscherm.

## Hoe het werkt

De standaard app-header toont een tandwiel via `SettingsHeaderButton`. De dunne Expo Router-route
geeft daarna `SettingsScreen` door; `SettingsProvider` levert de taalservice, de
`DevicePermissions`-poort en overige afhankelijkheden uit de container.

```mermaid
flowchart LR
    A[Tandwiel in app-header] --> B[/settings]
    B --> C[SettingsScreen]
    C --> D[Workerbalk verversen]
    C --> E[/language]
    C --> F[/permissions]
    C --> G[Syncstatus]
    C --> H[Support]
    C --> I[Debug, alleen development]
    C --> J[Uitloggen]
    E --> K[LanguageScreen]
    F --> L[PermissionsScreen]
```

De pagina toont bovenaan de werkerbalk, daarna een menu onder "Algemeen", en onderin het
versienummer. Uitloggen zit in de footer.

## Beweringen

| ID      | Bewering                                                                                                                                                                                                                               | Code                                                                                                                                                                      | Test                                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SET-01  | Als de berger op het tandwiel in de app-header tikt, opent de route `/settings`.                                                                                                                                                       | `src/domeinen/settings/screens/settings-screen.tsx`, `src/app/(app)/_layout.tsx`                                                                                          | —                                                                                            |
| SET-02  | Als de instellingenroute wordt geopend, rendert de dunne route alleen `SettingsScreen`.                                                                                                                                                | `src/app/(app)/settings.tsx`                                                                                                                                              | —                                                                                            |
| SET-03  | Als het scherm wordt getoond, staan werkerbalk, menu (taal, toestemmingen, sync, support), versie en uitloggen in deze functionele volgorde.                                                                                           | `src/domeinen/settings/screens/settings-screen.tsx`                                                                                                                       | —                                                                                            |
| SET-04  | Als de berger op toestemmingen tikt, opent de route `/permissions`.                                                                                                                                                                    | `src/domeinen/settings/screens/settings-screen.tsx`, `src/app/(app)/permissions.tsx`                                                                                      | —                                                                                            |
| SET-04a | Als de berger op taal tikt, opent de route `/language` waar de taaltoggle staat.                                                                                                                                                       | `src/domeinen/settings/screens/settings-screen.tsx`, `src/app/(app)/language.tsx`                                                                                         | —                                                                                            |
| SET-04b | Als de berger de werkerbalk tikt, haalt de app het workerrecord opnieuw op.                                                                                                                                                            | `src/domeinen/settings/screens/settings-screen.tsx`, `src/domeinen/settings/components/settings-worker-bar.tsx`                                                           | —                                                                                            |
| SET-05  | Als de berger een andere taal kiest, past de taalservice die direct toe en bewaart de keuze.                                                                                                                                           | `src/domeinen/settings/screens/language-screen.tsx`, `src/domeinen/settings/service/language-settings.ts`                                                                 | `src/domeinen/settings/service/language-settings.test.ts`, `src/bootstrap/container.test.ts` |
| SET-06  | Als de berger op support tikt, opent de route `/support`.                                                                                                                                                                              | `src/domeinen/settings/screens/settings-screen.tsx`                                                                                                                       | —                                                                                            |
| SET-07  | Als de app een developmentbuild is, toont instellingen een debugknop; in een productiebuild niet.                                                                                                                                      | `src/domeinen/settings/screens/settings-screen.tsx`                                                                                                                       | —                                                                                            |
| SET-08  | Als de berger op uitloggen tikt terwijl er een actieve opdracht is, blijft de sessie staan en toont het scherm een melding; zonder actieve opdracht cancelleert de guard eerst de eenheid en roept daarna `AuthService.signOut()` aan. | `src/domeinen/settings/service/sign-out-guard.ts`, `src/domeinen/settings/screens/settings-screen.tsx`, `src/domeinen/allocation-unit/service/allocation-unit-service.ts` | `src/domeinen/settings/service/sign-out-guard.test.ts`, `src/bootstrap/container.test.ts`    |
| SET-08a | Als cancel van de eenheid mislukt (of de eenheid geen `id` heeft), blijft de sessie staan en toont het scherm een aparte melding.                                                                                                      | `src/domeinen/settings/service/sign-out-guard.ts`, `src/domeinen/settings/screens/settings-screen.tsx`                                                                    | `src/domeinen/settings/service/sign-out-guard.test.ts`, `src/bootstrap/container.test.ts`    |
| SET-09  | Als een opgeslagen taalkeuze niet kan worden gelezen, blijft het instellingenscherm bruikbaar in de al gekozen telefoontaal.                                                                                                           | `src/domeinen/settings/service/language-settings.ts`                                                                                                                      | `src/domeinen/settings/service/language-settings.test.ts`                                    |

## Randgevallen en bewuste keuzes

- Toestemmingen staan bewust op een eigen scherm, zodat het instellingenoverzicht een kort menu blijft.
- Uitloggen is geblokkeerd bij actief werk. Zonder actief werk wordt de eenheid eerst afgemeld
  (`POST /api/allocation-units/{id}/cancel` met veld `id`); mislukt dat, dan blijft de sessie staan.

## Open vragen

- [Open vraag 12](../functioneel/open-vragen.md): wat uitloggen wist (taal en syncdatum blijven).
