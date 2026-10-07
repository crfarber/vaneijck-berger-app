# Onderwerpenkaart

Beginpunt voor welke pagina's er horen en waar de bronnen staan. Klopt een pad niet meer, of is er
een domein bijgekomen, dan is dat zelf een bevinding: meld het en werk deze kaart bij.

## Overkoepelend

| Pagina                  | Onderwerp                                                  | Bronnen                                                                                                                 |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `overzicht.md`          | opstarten, container, providers, navigatie (auth vs app)   | `src/bootstrap/`, `src/app/_layout.tsx`, `src/app/(app)/_layout.tsx`, `docs/architecture.md`                            |
| `componenten.md`        | actuele routes, schermen en UI-componenten                 | `src/app/`, `src/bootstrap/`, `src/domeinen/`, `src/shared/ui/`                                                         |
| `applicatieflow.md`     | end-to-end gebruikersflow van appstart tot uitloggen       | `src/app/`, `src/bootstrap/`, `src/domeinen/`, `docs/functioneel/flows.md`, `docs/roadmap.md`                           |
| `ontwikkelstatus.md`    | gebouwd, gedeeltelijk en niet gebouwd of gevalideerd       | `src/`, `docs/architecture.md`, `docs/roadmap.md`, `docs/decisions/`, `docs/functioneel/open-vragen.md`                 |
| `klantacceptatie.md`    | handmatige acceptatiescenario's voor klant en product      | `docs/wiki/applicatieflow.md`, `docs/wiki/ontwikkelstatus.md`, `docs/roadmap.md`, `src/app/`                            |
| `stores.md`             | wat waar staat: TanStack Query, Zustand, opslag, tokens    | `src/shared/query/`, `*/store/`, `src/shared/platform/ports.ts`, ADR 0005, 0006                                         |
| `opslagsleutels.md`     | alle sleutels in KeyValueStore/SecretStore en wie ze wist  | `rg "KEY =\|_KEY" src`, `src/bootstrap/container.ts` (`onSignedOut`)                                                    |
| `statuscodes.md`        | opdracht-, dienst- en medewerkerstatussen en hun betekenis | `allocations/domain/status.ts`, `services/domain/status.ts`, `worker/domain/status.ts`, `docs/functioneel/statussen.md` |
| `toestemmingen.md`      | locatie, camera, push: wanneer gevraagd, wat bij weigeren  | `settings/`, `location/`, `photos/platform/`, `notifications/platform/`, ADR 0021                                       |
| `api-en-fouten.md`      | HttpClient, zod, retry, fouttypes, wanneer uitloggen       | `src/shared/api/`, `docs/functioneel/api-contract.md`, ADR 0004                                                         |
| `feedback.md`           | toast, bevestiging, bottom sheet, "duurt langer"           | `src/shared/feedback/`, `src/shared/ui/`, `allocations/domain/action-feedback.ts`, ADR 0024                             |
| `offline.md`            | outbox, wachtrij-label, fotowachtrij, querycache           | `outbox/`, `photos/service/`, `src/shared/query/query-cache-store.ts`, ADR 0022                                         |
| `i18n.md`               | talen, teksten, taalcode richting CRM                      | `src/shared/i18n/`, `settings/service/language-settings.ts`, `reference-data/domain/language-code.ts`                   |
| `logging-en-privacy.md` | logger, redact, support-export                             | `src/shared/logging/`, `support/`, ADR 0010                                                                             |
| `builds.md`             | varianten, env, prebuild, bundle-id's                      | `app.config.*`, `src/bootstrap/env.ts`, `.env.example`, ADR 0001, 0009                                                  |
| `testen.md`             | fakes, container-test, architectuurtest, drempels          | `src/test/`, `src/bootstrap/container.test.ts`, `src/architecture.test.ts`, `docs/conventions.md`                       |

## Per domein

| Pagina                    | Domein(en)                                                        | Extra bronnen                                         |
| ------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| `inloggen.md`             | `auth`                                                            | ADR 0008, 0012                                        |
| `onboarding.md`           | `onboarding`, `allocation-unit`                                   | ADR 0014                                              |
| `opdrachten.md`           | `allocations` (lijst, accepteren, afwijzen, afronden, overdragen) | ADR 0015, 0018                                        |
| `diensten.md`             | `services`, `allocations` (diensten, dienst weigeren, exit-flow)  | ADR 0016, 0018                                        |
| `pltr.md`                 | `services/domain/pltr.ts`, `allocations/screens/pltr-screen.tsx`  | ADR 0019                                              |
| `verwerkingsformulier.md` | `service-form` (schema, validatie, concepten, versturen)          | ADR 0023, `docs/functioneel/plan-serviceformulier.md` |
| `fotos.md`                | `photos`                                                          | ADR 0020                                              |
| `outbox.md`               | `outbox`                                                          | ADR 0022, 0024                                        |
| `pushmeldingen.md`        | `notifications`, `src/bootstrap/notification-actions.ts`          | ADR 0017                                              |
| `referentiedata.md`       | `reference-data`                                                  | ADR 0013                                              |
| `locatie.md`              | `location`                                                        | ADR 0016                                              |
| `beschikbaarheid.md`      | `worker`                                                          |                                                       |
| `instellingen.md`         | `settings`                                                        | ADR 0021                                              |
| `support.md`              | `support`                                                         | ADR 0022                                              |

## Altijd meenemen

- `docs/functioneel/bekende-fouten-oude-app.md`: regressies horen als bewering op de pagina.
- `docs/functioneel/open-vragen.md`: open vragen horen onder "Open vragen" op de pagina.
- `docs/legacy.md`: gedrag uit de oude app dat bewust niet terugkomt, noem je onder "Randgevallen".
