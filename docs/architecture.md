# Architectuur

## Uitgangspunten

1. **Regels zijn puur.** Wat de app "weet" over statussen, fases, locaties en werktijden staat in `domain/` als gewone functies zonder React Native en zonder I/O.
2. **De buitenwereld zit achter poorten.** Tijd (`Clock`, `Sleep`), opslag (`KeyValueStore`, `SecretStore`), timers (`Scheduler`), tril (`Haptics`) en netwerk (`fetch`) komen binnen als argument. Op het apparaat is dat Expo, in tests een fake.
3. **De API-grens valideert.** Elke response gaat door zod. Wat de app nodig heeft is verplicht, de rest blijft ongemoeid.
4. **Eén eigenaar per soort data.** Server-data: TanStack Query. Client-state: Zustand. Tokens: alleen de `TokenProvider`.
5. **Eén plek waar alles aan elkaar hangt:** `src/bootstrap/container.ts`. Geen singletons, geen globals.

## Lagen en afhankelijkheden

```text
 screens ──► components, hooks ──► store ──► api, service ──► domain
   (React Native)                              (puur TypeScript)
```

Een pijl betekent "mag importeren". Naar rechts is lager. Tussen domeinen kan alleen via `index.ts` (puur) en `ui.ts` (React Native), en zonder kringen. `src/shared/` kent geen domeinen; `src/app/` en `src/bootstrap/` staan boven de domeinen. Alles hierboven staat als test in `src/architecture.test.ts`; die test is zelf getest door bewust een overtreding aan te maken en te zien dat hij faalt.

## Domeinen op dit moment

| Domein            | Inhoud                                                                                                                                                                                                                                                                                                                                        | Status                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `auth`            | sessie, refresh-beleid, `TokenProvider`, `SessionLifecycle`, SMS- en Azure AD-login, sessiestore, loginscherm                                                                                                                                                                                                                                 | klaar op iOS                                                                                              |
| `allocations`     | statussen en secties, afgerond-regel, samenvoegen van dienstdata, zod-schema's, API, `hydrateServices`, accepteren/afwijzen/afronden, afwijsredenen uit referentiedata, voertuigafgifte-lijst, dienstenscherm met 500 m-check, PLTR-scherm (laden/afleveren), overdragen aan een collega, exit-navigatie (`use-processing-exit`), lijstscherm | opdrachten + diensten + PLTR-scherm klaar; finishroute aangesloten op `service-form`                      |
| `services`        | 20 dienststatussen, verzendregel, open werk, actieve diensten, fases, vroeg afronden, `resolveProcessingExit`, `getExitTarget`, doellocatie, PLTR-fases en -kaarten                                                                                                                                                                           | regels klaar, aangesloten op het PLTR-scherm                                                              |
| `allocation-unit` | kenteken (14 patronen), werktijden en einddatum, voorkeur voor einddatum, beschikbaarheid, opnieuw-registreren-regel, vloot (`dn_fleets`) filteren/zoeken, registratieschermen (extern + intern), eindtijd bijwerken (`extend-shift`)                                                                                                         | extern en intern (handmatig) klaar, QR niet                                                               |
| `notifications`   | payload lezen, type bepalen, effecten plannen, ontdubbelen, handler, registratie, ontvangst (voorgrond, achtergrond, koude start)                                                                                                                                                                                                             | gebouwd, nog niet op een toestel                                                                          |
| `location`        | afstand, coördinaten, 500 m-controle, `LocationReader` (`expo-location`)                                                                                                                                                                                                                                                                      | regels + locatielezer klaar; uitleg op het instellingenscherm                                             |
| `settings`        | taalkeuze (NL/EN, bewaard); toestemming voor locatie, meldingen en camera; systeeminstellingen als de dialoog niet terugkomt; uitloggen cancelleert de eenheid                                                                                                                                                                                | scherm klaar; live positie niet                                                                           |
| `reference-data`  | client-sync (hervatbare batch), taalcode, API, opslag per entiteit, lijst van gesynchroniseerde entiteiten                                                                                                                                                                                                                                    | mechanisme klaar, geen scherm                                                                             |
| `onboarding`      | volgende stap na inloggen: opdrachtenlijst of eenheid registreren (extern of intern)                                                                                                                                                                                                                                                          | klaar voor externe en interne bergers                                                                     |
| `photos`          | fotolijst, exemplaar/`isExtra`, multipart-upload, wachtrij, camera-scherm                                                                                                                                                                                                                                                                     | scherm + wachtrij klaar                                                                                   |
| `places`          | Google Places HTTP, `StructuredAddress`, zoek-UI (`PlaceSearchControl`)                                                                                                                                                                                                                                                                       | herbruikbaar via `places/ui.ts`; CRM-adapter in service-form                                              |
| `rdw`             | RDW-lookup op kenteken, land/merk/type-matching                                                                                                                                                                                                                                                                                               | API + matching klaar; UI in service-form                                                                  |
| `signatures`      | multipart-upload (`POST /api/signatures`), JPEG-bytes helpers                                                                                                                                                                                                                                                                                 | API klaar; UI in `service-form` (native pad)                                                              |
| `outbox`          | bevestigde mutaties in volgorde: tijdelijke fout blijft aan het hoofd, harde 4xx markeert dat item en gaat verder; `subscribe` voor pending-badges                                                                                                                                                                                            | afronden, afwijzen, accepteren (opdracht en dienst); dienst weigeren                                      |
| `support`         | log van de laatste dag, al geredigeerd, delen via het systeem                                                                                                                                                                                                                                                                                 | scherm klaar; monitoring niet                                                                             |
| `worker`          | eigen medewerkerrecord (`GET /api/workers`), mag-overdragen-regel, beschikbaarheidspil + `PUT /api/workers/availability`                                                                                                                                                                                                                      | header-pill + keuzescherm klaar                                                                           |
| `service-form`    | het verwerkingsformulier: schema zoeken in de referentiedata (in `__DEV__` en de internal-build uit `docs/diensten/experiment`), normalisatie, waarden, zichtbaarheid, validatie, selectors, select-opties, versturen (`PUT /api/services/{id}`), concept-opslag, Zustand-store per formulier, scherm, dienst weigeren, foto-bevestiging      | scherm met basis- en selectvelden; feedback/toasts via [ADR 0024](decisions/0024-feedback-en-dialogen.md) |

## Opstarten

```text
app/_layout.tsx
  └─ createNativeContainer()       leest .env (falen met duidelijke melding), bouwt container
       └─ container.start()        SessionLifecycle.start(), TokenProvider.restore()
            └─ sessionStore.status: unknown → signed-in | signed-out
  └─ <Navigator>                   splash tot status bekend is
       └─ Stack.Protected          (app) als signed-in, (auth) als signed-out
```

Uitloggen, of een sessie die niet te redden is, wijzigt alleen de sessiestatus; de navigatie volgt vanzelf. Bij een verlopen sessie toont het loginscherm waarom (`signedOutReason`).

## Een verzoek met token

```text
hook (useQuery) ─► api.list() ─► HttpClient.requestJson
                                   ├─ TokenProvider.getAccessToken()   ververst zo nodig, één keer tegelijk
                                   ├─ fetch met Bearer, time-out over verbinding én body
                                   ├─ 401? ─► TokenProvider.refreshNow() ─► één keer opnieuw
                                   └─ zod-schema ─► data | ResponseParseError
```

### Wat de `TokenProvider` garandeert

- **Eén refresh tegelijk**, hoeveel verzoeken er ook een token willen (single flight).
- **Tijdelijk is niet definitief.** Geen netwerk of een serverfout laat de sessie staan; drie pogingen met 2 s en 4 s pauze, daarna `TokenRefreshError`. Een token dat bijna maar nog niet verlopen is, wordt gewoon gebruikt (na één poging, met 30 s rust erna). Alleen een weigering van de server (`invalid_grant`, 401/403) beëindigt de sessie.
- **Uitloggen wint.** Een refresh die klaar komt nadat de gebruiker uitlogde (of als iemand anders inlogde) wordt weggegooid en herstelt de sessie niet.
- **Opslag in volgorde.** Schrijfacties gaan via een wachtrij, dus een late `save` kan een `clear` niet ongedaan maken.
- **Eén Session-object** op één sleutel, in stukken van 1800 tekens verdeeld vanwege de limiet van de beveiligde opslag.

`SessionLifecycle` ververst op de achtergrond vijf minuten voor het verlopen, nooit vaker dan elke 30 s, en herhaalt mislukte pogingen na 5 s, 15 s, 60 s en daarna elke 5 min. Bij terugkeer naar de voorgrond ververst hij meteen als dat nodig is.

## Fouten

Verwachte uitkomsten zijn een `Result` (verkeerde SMS-code, onbekend nummer, geannuleerd inloggen). Onverwachte zijn excepties met een vaste taxonomie in `src/shared/api/errors.ts`; `isRetryable` beslist over opnieuw proberen. TanStack Query probeert alleen tijdelijke fouten opnieuw (maximaal 3 pogingen, 1 s, 2 s, 4 s) en mutaties nooit.

## Logging en privacy

`Logger` houdt een ringbuffer van 1000 regels met categorie en niveau. Alles gaat door `redact`: sleutels met token, wachtwoord, code of geheim worden `[redacted]`, telefoon en e-mail gemaskeerd, lange teksten en diepe objecten afgekapt. Body's van verzoeken en antwoorden worden niet gelogd. `container.test.ts` bewaakt dat tokens, codes en telefoonnummers niet in het log belanden. Het exporteren voor support gebruikt `formatLogExport`.

## Testen

| Soort                | Waar                                 | Hoe                                            |
| -------------------- | ------------------------------------ | ---------------------------------------------- |
| Unit                 | `domain`, `api`, `service`, `shared` | Vitest in Node, fakes voor de poorten          |
| Integratie (skelet)  | `src/bootstrap/container.test.ts`    | echte onderdelen, nep-apparaat, nep-backend    |
| Architectuur         | `src/architecture.test.ts`           | leest de imports en controleert de laagregels  |
| Bundel               | CI-job `bundle`                      | `expo export`: vangt kapotte imports en routes |
| Component (gepland)  | `screens/`, `components/`            | React Native Testing Library, zie roadmap      |
| End-to-end (gepland) | complete flows op simulator          | Maestro, zie roadmap                           |

## Wat er nog niet is

Zie de [roadmap](roadmap.md). De verwerkingsformulieren, inclusief de read-only finishweergave, staan in `service-form`; de legacybestanden zijn alleen gedragsnaslag. Belangrijkste resterende onderdelen zijn monitoring en release. Offline-wachtrij en supportlog zijn er (ADR 0022); die wachtrij dekt de mutaties die de app nu zelf verstuurt.
