# API-contract

De backend is de Salvage-API (ASP.NET, CRM-gebaseerd). Dit overzicht komt uit de **gegenereerde client van de oude app** (`src/api/generated`), want die is de waarheid over wat de app aanroept: `swagger.json` in de oude repo loopt daarop achter (zie [ADR 0004](../decisions/0004-api-laag.md)). Omschrijvingen zijn afgeleid uit de paden en de oude code; controleer bij twijfel het gedrag op acceptatie.

## Conventies

- Basis-URL uit `EXPO_PUBLIC_API_BASE_URL`, zonder slash aan het eind.
- JSON, `Authorization: Bearer <token>` op alles behalve de inlog-aanroepen.
- Foutformaat van de API: **ProblemDetails** (`type`, `title`, `status`, `detail`, `traceId`); `detail` is voor mensen leesbaar en wordt in enkele gevallen gebruikt om een situatie te herkennen (zie SMS-login). `/connect/token` antwoordt met OAuth-fouten (`error`, `error_description`).
- Telefoonnummers gaan als `+31...` met `%2B` in de querystring.

## Inloggen

| Methode en pad                      | Doel                                                                                                                  | In de nieuwe app |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `GET /api/users/login?phoneNumber=` | vraagt een SMS-code aan (zonder token)                                                                                | ja               |
| `POST /connect/token`               | wisselt nummer en code voor tokens (`grant_type=password`), en vernieuwt (`grant_type=refresh_token`); formulier-body | ja               |

Herkende fouten bij het aanvragen van een code: HTTP 500 met "current code is not yet expired" (er is al een geldige code: ga door naar het codescherm) en HTTP 400 met "phonenumber does not exists or not an internal user" (nummer onbekend). Bij inloggen betekent `invalid_grant` een foute of verlopen code. `invalid_client` / `unauthorized_client` is een configuratiefout (verkeerde of ontbrekende `client_id`), geen foute code. De `client_id` voor externe gebruikers is verplicht in `EXPO_PUBLIC_EXTERNAL_CLIENT_ID` (in de oude app stond die in `openid.config.ts`). Scopes zoals de oude app ze stuurt: `openid` bij inloggen, `openid profile` bij verversen (bevestigen, zie [open vragen](open-vragen.md)).

Interne gebruikers loggen in met Azure AD via een browser-sheet; verversen gaat bij Azure AD zelf.

## Opdrachten en diensten

| Methode en pad                                  | Doel                                                                                                                                          | In de nieuwe app          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `GET /api/allocations`                          | de opdrachten van de berger (samenvatting)                                                                                                    | ja                        |
| `GET /api/allocations/{id}/worker`              | één opdracht verversen                                                                                                                        | ja                        |
| `PUT /api/allocations/{id}/accept` / `decline`  | opdracht accepteren, afwijzen of afronden (afronden = afwijzen met vaste code). Een tijdelijke fout gaat de outbox in                         | ja                        |
| `GET /api/allocations/by-incident-id/{id}`      | opdrachten bij een incident                                                                                                                   | nog niet nodig            |
| `GET /api/services/by-incident-id/{incidentId}` | alle diensten van een incident (volledig)                                                                                                     | ja (`hydrateServices`)    |
| `GET /api/services/{id}`                        | één dienst                                                                                                                                    | ja                        |
| `PUT /api/services/{id}`                        | dienst bijwerken: het ingevulde verwerkingsformulier (`buildServicePostBody`). De oude swagger noemt `POST` ([open vraag 26](open-vragen.md)) | ja (`service-form`)       |
| `PUT /api/services/{id}/accept`                 | dienst accepteren, met de 500 m-check. Een tijdelijke fout gaat de outbox in                                                                  | ja                        |
| `PUT /api/services/{id}/decline`                | dienst afwijzen (vergeefse rit of terug naar dispatch). Een tijdelijke fout gaat de outbox in                                                 | ja                        |
| `POST /api/services`                            | dienst toevoegen                                                                                                                              | 6 (verwerkingsflow, team) |
| `GET /api/services/incident/{incidentId}`       | diensten van een incident (lichte vorm)                                                                                                       | nog niet nodig            |

Een opdracht zit als rij met `dn_IncidentId` (het incident) waarin `dn_dn_incident_dn_service_IncidentId` de diensten bevat. De lijst is een samenvatting; de volledige diensten (met o.a. het typecode) komen uit `by-incident-id`, en ontbrekende typecodes uit `GET /api/services/{id}`.

## Incidenten, eenheid en medewerker

| Methode en pad                                                        | Doel                                                                                                                                                                                                                             | Slice                            |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `GET /api/incidents/worker`, `/{id}`, `/{id}/worker`                  | incident(en) van de medewerker                                                                                                                                                                                                   | 5                                |
| `POST /api/incidents/{id}`                                            | incident bijwerken                                                                                                                                                                                                               | 6 (verwerkingsflow, team)        |
| `POST /api/incidents/{id}/reassign/{colleagueId}`                     | overdragen aan een collega                                                                                                                                                                                                       | ja                               |
| `POST /api/incidents/{id}/registerlocation`                           | locatie registreren                                                                                                                                                                                                              | 10 (niet gebouwd, open vraag 14) |
| `GET /api/allocation-units`, `GET`/`PATCH /api/allocation-units/{id}` | eenheid (voertuig) van de berger. Geen eenheid: 404, of 2xx zonder body (tst)                                                                                                                                                    | 3                                |
| `POST /api/allocation-units/internalworker` / `externalworker`        | eenheid aanmelden. **400 `ACTIVE_INCIDENT`**: er staat al een aansturing/incident open; geen nieuwe eenheid. De app toont dan een alert om dispatch te bellen. Of alleen wachtende opdrachten dit ook veroorzaken: open vraag 32 | 3                                |
| `POST /api/allocation-units/{id}/cancel`                              | eenheid afmelden (vrijwillig uitloggen; `id` van `GET /api/allocation-units`)                                                                                                                                                    | ja                               |
| `GET /api/workers`                                                    | eigen medewerkerrecord — `dn_canforwardallocationcode` (mag overdragen?) en `dn_availabilitystatuscode` (header-pill)                                                                                                            | ja                               |
| `GET /api/workers/allocations`, `/incident/{id}`                      | opdrachten/incident via de medewerker in plaats van via `/api/allocations` zelf                                                                                                                                                  | nog niet nodig                   |
| `PUT /api/workers/availability`                                       | beschikbaarheid doorgeven (body: statuscode; 204)                                                                                                                                                                                | ja                               |
| `POST /api/workers/register`                                          | apparaat registreren voor push. Body `{ notificationtoken }` is het Expo-pushtoken; antwoord heeft geen body                                                                                                                     | ja                               |

## Overig

| Methode en pad                                                           | Doel                                  | Slice                                                       |
| ------------------------------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------- |
| `GET /api/client-sync/schema/{languagecode}`, `/{entity}/{languagecode}` | referentiedata en formulierdefinities | 2                                                           |
| `GET /api/vehicle-releases/locations`, `/{locationId}/assignments`       | voertuigafgifte                       | ja                                                          |
| `GET /api/check/rdw/registrationnumber/{n}`, `/registrationnumber/{n}`   | kenteken opzoeken (RDW)               | ja (slice 14)                                               |
| `POST /api/check/zipcode`                                                | postcode controleren                  | ja (endpoint klaar, scherm hoort bij het verwerkingsscherm) |
| `POST /api/binary/upload`                                                | foto's uploaden                       | ja (slice 8)                                                |
| `POST /api/signatures`                                                   | handtekening uploaden                 | ja (slice 16)                                               |

Nieuwe endpoints krijgen een `api/`-bestand in hun domein met een zod-schema, en een regel in de tabel hierboven.
