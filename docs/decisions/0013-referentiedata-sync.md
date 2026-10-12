# 0013. Synchronisatie van referentiedata

**Status:** gebouwd, nog niet tegen de echte backend geverifieerd (geen sync-scherm; zie "Gevolgen").

## Context

De oude app (`useSchemaSync.ts`) haalt bij het opstarten een lijst entiteiten op die gewijzigd zijn
sinds een bewaarde datum (`GET /api/client-sync/schema/{taalcode}`, header `SINCEDATE`), en dan per
entiteit de data (`GET /api/client-sync/{entiteit}/{taalcode}`). Zonder `SINCEDATE` komt alles terug.

De oude code slaat de nieuwe datum al op **voordat** de entiteiten daadwerkelijk zijn opgehaald. Als
het ophalen van een entiteit dan mislukt of de app afbreekt, is die entiteit blijvend gemist: een
latere sync vraagt met de al-opgeschoven datum, en de server meldt niets meer gewijzigd voor iets dat
nooit is aangekomen. Zie [bekende-fouten-oude-app.md](../functioneel/bekende-fouten-oude-app.md#23).

## Besluit

Eén opgeslagen "pending"-batch (`referenceData.pending`, één JSON-waarde: de datum die na afloop
vastgelegd wordt, plus de nog openstaande entiteiten) naast de vastgelegde datum
(`referenceData.since`). Regels:

- Een nieuwe batch start alleen als er geen pending batch is: dan wordt de serverlijst opgevraagd.
- Per entiteit: bij succes verdwijnt hij uit de pending-lijst (direct opgeslagen) en komt zijn data
  onder een eigen sleutel te staan; bij een fout blijft hij in de pending-lijst en houdt zijn oude
  data (indien aanwezig) stand.
- `since` wordt pas vastgelegd zodra de pending-lijst leeg is — mogelijk over meerdere `sync()`-aanroepen heen.
- Is er al een pending batch (een vorige poging is onderbroken of deels mislukt), dan gaat de
  eerstvolgende `sync()` daar direct mee verder: geen nieuwe serverlijst, geen dubbel werk voor wat al
  lukte.

Dit haalt de bug uit de oude app weg en voldoet aan "onderbreken en hervatten geeft dezelfde data" —
zie de tests in `service/reference-data-service.test.ts`.

## Gevolgen

- Nieuwe device-poort nodig voor "veel gewone data": zie [ADR 0006](0006-opslag.md).
- **Taalcode (open vraag 6):** de oude app stuurde altijd 1043 (nl-NL). Voor een Engelse gebruiker is
  1033 (en-US) de aanname in `domain/language-code.ts` — onbevestigd bij het backend-team.
- **Geen scherm in deze slice.** De oude `SynchronizeScreen` combineert sync met de hele
  onboarding-navigatie (taalkeuze, toestemmingsschermen, doorsturen naar `DriverChoice` /
  eenheidkeuze). Die beslissingen horen bij slice 3 (onboarding); deze slice levert alleen het
  werkende mechanisme. De container start een sync op de achtergrond zodra een sessie er is
  (inloggen of app-herstart), en logt voortgang en fouten (`logger`, categorie `sync`) — er is nog
  geen voortgangsbalk. Bij uitloggen wist `clearAll()` since, pending, entities en entity-data
  (open vraag 12); de volgende login start een volle sync.
- Nog niet tegen de echte backend getest: de build- en architectuurverificatie zijn wel gedaan, maar
  er is geen sessie met een account dat referentiedata teruggeeft gebruikt in deze sessie.
- **Lijst van entiteiten (slice 12).** Na elke geslaagde entiteit staat de naam in
  `referenceData.entities`; `listEntities()` geeft die lijst. Het verwerkingsformulier zoekt daarin
  op inhoud naar `dataDefinition` ([ADR 0023](0023-serviceform.md),
  [besluit 25](../functioneel/open-vragen.md)) — geen vaste entiteitnaam, zodat nieuwe sync-namen
  zonder app-update werken. Een installatie met een sync-datum maar zonder die lijst vraagt één keer
  alles opnieuw op, zodat de lijst compleet is. `reset()` (alleen voor een bewuste volledige
  hersync, niet bij uitloggen) laat de lijst staan: de entiteiten zelf blijven ook staan.
  `abortPending()` wist alleen de pending batch en houdt `since` vast.
