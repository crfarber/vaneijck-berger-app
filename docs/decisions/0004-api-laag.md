# 0004. API-laag: eigen HttpClient met zod, geen Orval (voorlopig)

**Status:** voorgesteld, **open vraag aan het team**.

## Context

De oude app gebruikt een met Orval gegenereerde client (41 operaties, 27 gebruikt) uit `swagger.json`. Bij het overnemen bleek:

- `swagger.json` loopt achter op wat de gegenereerde code aanroept (`PUT /api/allocations/{id}/accept|decline`, `GET /api/allocations/{id}/worker`, `PUT /api/services/{id}/accept|decline` staan niet in de spec). De client is dus niet reproduceerbaar uit de spec.
- De typen worden niet gebruikt: overal staat `as unknown as Allocation[]`. Orval geeft alleen typen tijdens het compileren en valideert niets tijdens het draaien.
- De CRM-entiteiten (`dn_*`) zijn in de praktijk losse objecten met tientallen velden, waarvan de app er een handvol gebruikt.

## Besluit

Een kleine eigen `HttpClient` (`src/shared/api/http-client.ts`) en per domein een `api/`-map met endpoints en **zod-schema's** (tolerante lezer, zie [conventies](../conventions.md)). Elke response wordt bij de grens gecontroleerd; een kapotte rij in een lijst wordt overgeslagen en gelogd.

## Gevolgen

- Contractwijzigingen vallen op waar ze binnenkomen, met een leesbare melding.
- Nieuwe endpoints kosten een paar regels handwerk in plaats van een generatorrun.
- De `HttpClient` is generator-onafhankelijk: er hoeft niets te veranderen als we later toch genereren.

## Alternatief en wat het vraagt

Orval in `zod`-modus met een custom mutator die `HttpClient.request` aanroept: schema's en typen worden dan gegenereerd, de mappers (`toAllocation`) blijven met de hand. Dit is alleen zinvol als de backend een **actuele OpenAPI-specificatie** publiceert die overeenkomt met wat de app aanroept. Vraag aan het team: publiceert de live backend die, en wordt hij bijgehouden? Zie [open vragen](../functioneel/open-vragen.md).

**Bevinding (21 september 2026):** de live productie-API publiceert `/swagger/v1/swagger.json` (OpenAPI 3.0.4, 100 operaties). Daarin staan `accept`, `decline` en `worker` wel; 12 operaties uit de oude `src/api/swagger.json` staan niet in de live spec. Of de spec ook voor test en acceptatie wordt bijgehouden, is niet gecontroleerd. Het besluit hierboven blijft staan totdat het team kiest.
