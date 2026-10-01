# Van Eijck Berger App

De herbouw van de berger-app (Salvage) van Van Eijck: een app voor bergers die opdrachten (allocations) krijgen met incidenten en één of meer diensten die uitgevoerd moeten worden. Dezelfde werking als de oude app, met een architectuur die robuust, testbaar en onderhoudbaar is.

> **Status:** slice 0 is klaar: de kern (HTTP-client, inloggen en sessiebeheer, statusregels, notificatieverwerking, locatiecheck, werktijden, kentekens) en een werkend skelet (inloggen met SMS, opdrachtenlijst). De rest volgt per slice, zie [docs/roadmap.md](docs/roadmap.md).

## Snel starten

Vereisten: Node ≥ 22.13, pnpm 11 (`corepack enable`), Xcode en/of Android Studio.

```bash
pnpm install
cp .env.example .env.local     # vul EXPO_PUBLIC_API_BASE_URL en EXPO_PUBLIC_EXTERNAL_CLIENT_ID in
pnpm ios                       # of: pnpm android (bouwt de native app en start Metro)
pnpm start                     # daarna alleen Metro starten (dev client)
```

Zonder geldige configuratie stopt de app bij het opstarten met een duidelijke melding welke variabele ontbreekt.

## Scripts

| Script                          | Doet                                                          |
| ------------------------------- | ------------------------------------------------------------- |
| `pnpm run check`                | formatteren controleren, lint (oxlint) en typecheck           |
| `pnpm test`                     | alle unit- en integratietests (Vitest, in Node, < 2 seconden) |
| `pnpm test:coverage`            | tests met coverage-drempels (90% regels, 85% branches)        |
| `pnpm run ci`                   | `check` + `test:coverage`: wat CI en `pre-push` draaien       |
| `pnpm format` / `pnpm lint:fix` | automatisch herstellen                                        |
| `pnpm prebuild`                 | native projecten opnieuw genereren (`ios/` en `android/`)     |
| `pnpm run doctor`               | Expo-configuratie controleren                                 |

Een wijziging is **klaar** als `pnpm run ci` slaagt en de app bundelt (`pnpm exec expo export --platform android`, draait ook in CI).

## Opbouw

```text
src/
  app/            Expo Router: dunne routes, alleen koppelen (geen logica)
  bootstrap/      composition root: bouwt alle onderdelen en koppelt ze (container.ts)
  domeinen/       één map per domein, zie hieronder
  shared/         herbruikbare basis: HTTP-client, logger, config, i18n, poorten, UI-primitieven
  test/           fakes voor tests (klok, opslag, HTTP-antwoorden)
docs/             conventies, architectuur, beslissingen, roadmap, functionele beschrijving
```

Elk domein (`src/domeinen/<naam>/`) heeft dezelfde lagen:

| Laag                              | Bevat                                                    | Mag React Native gebruiken |
| --------------------------------- | -------------------------------------------------------- | -------------------------- |
| `domain/`                         | pure regels en types                                     | nee                        |
| `api/`                            | endpoints en zod-schema's                                | nee                        |
| `service/`                        | use-cases met geïnjecteerde poorten (opslag, klok, HTTP) | nee                        |
| `store/`                          | Zustand, alleen client-state                             | nee (vanilla)              |
| `hooks/` `components/` `screens/` | React Native                                             | ja                         |

`index.ts` is de publieke, pure ingang van een domein; `ui.ts` de React Native-ingang. Andere domeinen en routes importeren alleen via die twee bestanden. Deze regels worden afgedwongen door [src/architecture.test.ts](src/architecture.test.ts).

## Documentatie

- [docs/conventions.md](docs/conventions.md): hoe we hier code schrijven
- [docs/architecture.md](docs/architecture.md): lagen, datastromen, sessiebeheer
- [docs/decisions/](docs/decisions/): waarom we voor deze aanpak kozen
- [docs/roadmap.md](docs/roadmap.md): volgende slices met acceptatiecriteria
- [docs/functioneel/](docs/functioneel/): statussen, API-contract, bekende fouten van de oude app, open vragen
- [docs/legacy.md](docs/legacy.md): hoe je de oude app raadpleegt
- [CLAUDE.md](CLAUDE.md): werkafspraken voor AI-assistenten
