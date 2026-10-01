# 0010. Logging en monitoring

**Status:** logging uitgevoerd; monitoring open.

## Context

De oude app logde met `console.log` overal, inclusief telefoonnummers en het volledige push-bericht (`RAW remote message`). Foutmeldingen voor support kwamen via een eigen debugscherm en mails.

## Besluit

- Een `Logger` met categorie (`auth`, `http`, `sync`, `notifications`, ...) en niveau, een ringbuffer van 1000 regels en een optionele `sink` (in ontwikkeling naar de console). Alle data gaat door `redact`. Zie [architectuur](../architecture.md).
- `formatLogExport` maakt de tekst voor support (nieuwste eerst, filter op categorie en leeftijd). Het supportscherm (ADR 0022) gebruikt alleen dit. Het debugscherm in ontwikkeling blijft apart.
- `console.*` is verboden buiten `src/shared/platform/rn/` (lint en architectuurtest).

## Open

Crash- en foutmonitoring (Sentry of vergelijkbaar): niet gekozen. Vereist: geen persoonsgegevens (de `redact`-laag is de basis), source maps via EAS, en een `LogSink` die fouten doorstuurt zodat domeincode niets van de dienst weet.
