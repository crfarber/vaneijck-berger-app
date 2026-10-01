# Werkafspraken voor AI-assistenten

Dit is de herbouw van de Van Eijck berger-app. Lees eerst [docs/conventions.md](docs/conventions.md) en [docs/architecture.md](docs/architecture.md). Praat en schrijf documentatie in het Nederlands; code, commentaar en identifiers zijn Engels.

## Voordat je code schrijft

1. Zoek eerst of het gedrag al bestaat in de oude app (zie [docs/legacy.md](docs/legacy.md)). Neem het **gedrag** over, niet de code. Schrijf de test eerst, met de oude fouten uit [docs/functioneel/bekende-fouten-oude-app.md](docs/functioneel/bekende-fouten-oude-app.md) als regressietest.
2. Past het in een bestaand domein onder `src/domeinen/`? Zo niet, maak een nieuw domein met dezelfde lagen.
3. Onzekerheid over gedrag van de backend of het CRM: zet het in [docs/functioneel/open-vragen.md](docs/functioneel/open-vragen.md) met de aanname die je maakt. Verzin nooit statuscodes of API-velden.

## Harde regels (de architectuurtest dwingt de meeste af)

- `domain/`, `api/` en `service/` importeren nooit `react`, `react-native` of `expo-*`. Alles wat de buitenwereld raakt (opslag, klok, tijd, netwerk) komt binnen als **poort**, zie `src/shared/platform/ports.ts`.
- Tussen domeinen alleen via `index.ts` (puur) of `ui.ts` (React Native). Nooit `@/domeinen/x/domain/...` vanuit een ander domein.
- Nieuwe onderdelen worden **alleen** in `src/bootstrap/container.ts` aan elkaar gekoppeld. Geen singletons, geen globals, geen `getState()` in domeinlogica.
- Elke API-response gaat door een zod-schema (`requestJson`). Alleen wat de app nodig heeft is verplicht; overige CRM-velden blijven onaangeroerd (`looseObject`).
- Server-state staat in TanStack Query, client-state in Zustand. **Tokens staan nergens behalve in de `TokenProvider`** en de beveiligde opslag erachter.
- Verwachte fouten (validatie, inlogfouten) zijn een `Result`; onverwachte zijn excepties uit `src/shared/api/errors.ts`. Een tijdelijke fout (`isRetryable`) logt de gebruiker nooit uit.
- Geen `enum` (gebruik een `const` object plus union type), geen `any`, geen `!`, geen `console.*` (gebruik de logger). Logdata loopt altijd door `redact`.
- Zichtbare tekst hoort in `src/shared/i18n/resources.ts` (nl én en). Geen hardcoded tekst in schermen.
- `Date.now()`, `new Date()` en `setTimeout` alleen achter de poorten `Clock`, `Sleep` en `Scheduler`, zodat tests de tijd sturen.
- Geen `Array.prototype.toSorted/toReversed` in app-code (Hermes); kopieer en sorteer.

## Testen

- Elke regel in `domain/`, `api/` en `service/` heeft een test; de drempel is 90% (85% branches). Testnamen beschrijven gedrag, niet implementatie.
- Gebruik de fakes uit `src/test/fakes.ts` (klok, opslag, `deferred`, `createFakeScheduler`) in plaats van mocks van modules. Test race conditions met `deferred()`.
- `src/bootstrap/container.test.ts` is het loopskelet: echte onderdelen, nep-apparaat en nep-backend. Een nieuwe end-to-end route voeg je daar toe.
- Draai `pnpm run ci` voordat je klaar meldt. Bij wijzigingen in routes of imports ook `pnpm exec expo export --platform android` met `EXPO_PUBLIC_API_BASE_URL` gezet.

## Niet doen

- Geen bestanden uit `../vaneijck-salvageapp-analyse` kopiëren of importeren.
- Niet committen of pushen zonder dat de gebruiker erom vraagt.
- Geen echte waarden of secrets in `.env.example`, code of tests.
