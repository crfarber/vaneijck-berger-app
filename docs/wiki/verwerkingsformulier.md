# Verwerkingsformulier

> Gecontroleerd op: ba1383c (2026-09-23)
> Bronnen: `src/domeinen/service-form/`, `src/bootstrap/container.ts`, `src/bootstrap/providers.tsx`, `src/app/(app)/allocations/[id]/services/[serviceId]/form.tsx`
> Zie ook: [ADR 0023](../decisions/0023-serviceform.md), [ADR 0024](../decisions/0024-feedback-en-dialogen.md), [flows](../functioneel/flows.md), [plan serviceformulier](../functioneel/plan-serviceformulier.md)

## Waarvoor

Het verwerkingsformulier laat de berger de gegevens van een actieve dienst aanvullen en controleren.
Het formulier komt uit gesynchroniseerde CRM-definities, past zich aan de fase en taal aan en bewaart
gewijzigde invoer als concept wanneer de berger het scherm verlaat.

## Hoe het werkt

De route zoekt eerst de opdracht en dienst. Daarna zoekt de service op inhoud naar een passende
`dataDefinition` in de gesynchroniseerde referentiedata. Het schema bepaalt de fase, secties,
zichtbaarheid, veldsoorten, keuzelijsten en validatie; bestaande CRM-waarden en een eventueel lokaal
concept vullen het formulier. Alleen zichtbare, bewerkbare en ingevulde waarden komen in de
verzendpayload.

```mermaid
flowchart LR
  A[Dienst openen] --> B[Definitie en concept laden]
  B --> C[Invullen en valideren]
  C --> D{Verplichte foto ontbreekt?}
  D -->|Ja| E[Foto toevoegen]
  D -->|Nee| F[PUT dienst]
  E --> D
  F --> G[Concept wissen en dienstflow vervolgen]
```

Een ongeldige verzending toont alle veldfouten en springt naar het eerste ongeldige veld. Een
verzendfout houdt het formulier open en biedt opnieuw proberen; formulierverzending gaat bewust niet
via de outbox. Preview toont dezelfde gegevens alleen-lezen en heeft geen concept- of verzendactie.

## Beweringen

| ID      | Bewering                                                                                                                       | Code                                                                                                              | Test                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| FORM-01 | Een formulierdefinitie wordt op `servicecode` in alle gesynchroniseerde entiteiten gezocht, niet onder een vaste entiteitnaam. | `src/domeinen/service-form/service/service-form-service.ts`                                                       | `src/domeinen/service-form/service/service-form-service.test.ts`                             |
| FORM-02 | Als een definitie ontbreekt, wist opnieuw proberen de syncvoortgang, synchroniseert alles en zoekt daarna opnieuw.             | `src/domeinen/service-form/service/service-form-service.ts`                                                       | `src/domeinen/service-form/service/service-form-service.test.ts`                             |
| FORM-03 | Status `HULPVERLENING_AKKOORD` kiest fase 2; iedere andere status kiest fase 1.                                                | `src/domeinen/service-form/domain/form-context.ts`                                                                | `src/domeinen/service-form/domain/form-context.test.ts`                                      |
| FORM-04 | Engelse formulieren gebruiken labelcode 1044 en alle andere talen labelcode 1043.                                              | `src/domeinen/service-form/domain/form-context.ts`                                                                | `src/domeinen/service-form/domain/form-context.test.ts`                                      |
| FORM-05 | Het scherm onderscheidt laden, opdracht of dienst niet gevonden, definitie ontbreekt, leesfout en gereed.                      | `src/domeinen/service-form/domain/load-state.ts`                                                                  | `src/domeinen/service-form/domain/load-state.test.ts`                                        |
| FORM-06 | Een definitie kiest de gevraagde fase en taal met een deterministische terugval als die variant ontbreekt.                     | `src/domeinen/service-form/domain/schema.ts`                                                                      | `src/domeinen/service-form/domain/schema.test.ts`                                            |
| FORM-07 | Een beschadigd veld wordt overgeslagen en als diagnostiek vastgelegd in plaats van het hele formulier te blokkeren.            | `src/domeinen/service-form/domain/schema.ts`                                                                      | `src/domeinen/service-form/domain/schema.test.ts`                                            |
| FORM-08 | Een onbekend veldtype krijgt een zichtbare niet-ondersteundtoestand in plaats van een gegokte invoer.                          | `src/domeinen/service-form/domain/field-kind.ts`                                                                  | `src/domeinen/service-form/domain/field-kind.test.ts`                                        |
| FORM-09 | Een komma in een decimaalveld wordt als punt opgeslagen.                                                                       | `src/domeinen/service-form/domain/field-kind.ts`                                                                  | `src/domeinen/service-form/domain/field-kind.test.ts`                                        |
| FORM-10 | Een afhankelijk veld is alleen zichtbaar als zijn voorwaarde én de volledige keten van bovenliggende voorwaarden klopt.        | `src/domeinen/service-form/domain/conditions.ts`                                                                  | `src/domeinen/service-form/domain/conditions.test.ts`                                        |
| FORM-11 | Alleen zichtbare velden worden gevalideerd; alleen-lezen velden worden niet verplicht gesteld.                                 | `src/domeinen/service-form/domain/validation.ts`                                                                  | `src/domeinen/service-form/domain/validation.test.ts`                                        |
| FORM-12 | Na een mislukte validatie opent het scherm zo nodig de sectie en scrollt het naar het eerste ongeldige veld.                   | `src/domeinen/service-form/screens/service-form-screen.tsx`                                                       | —                                                                                            |
| FORM-13 | Depotkeuzes worden op afstand gesorteerd wanneer het schema daarom vraagt en een bruikbare locatie beschikbaar is.             | `src/domeinen/service-form/domain/select-options.ts`                                                              | `src/domeinen/service-form/domain/select-options.test.ts`                                    |
| FORM-14 | Voertuigtypen blijven leeg totdat een merk is gekozen en worden daarna op dat merk gefilterd.                                  | `src/domeinen/service-form/domain/select-options.ts`                                                              | `src/domeinen/service-form/domain/select-options.test.ts`                                    |
| FORM-15 | Een gewijzigd formulier wordt bij verlaten per opdracht en dienst als concept bewaard en bij heropenen hersteld.               | `src/domeinen/service-form/screens/service-form-screen.tsx`                                                       | —                                                                                            |
| FORM-16 | Reset wist alleen het concept van de geopende opdracht en dienst en herstelt de CRM-beginwaarden.                              | `src/domeinen/service-form/service/draft-storage.ts`                                                              | `src/domeinen/service-form/service/draft-storage.test.ts`                                    |
| FORM-17 | Preview laadt geen concept, staat geen wijzigingen toe en toont geen verzendactie.                                             | `src/domeinen/service-form/screens/service-form-screen.tsx`                                                       | —                                                                                            |
| FORM-18 | Verzenden blijft geblokkeerd tot iedere verplichte positie een lokale of CRM-foto heeft; `failed` telt niet mee, `queued` wel. | `src/domeinen/service-form/screens/service-form-screen.tsx`, `src/domeinen/service-form/domain/photos-confirm.ts` | `src/domeinen/service-form/domain/photos-confirm.test.ts`                                    |
| FORM-19 | De verzendpayload sluit verborgen, alleen-lezen, lege en handtekeningvelden uit.                                               | `src/domeinen/service-form/domain/submission.ts`                                                                  | `src/domeinen/service-form/domain/submission.test.ts`                                        |
| FORM-20 | Fase 1 verzendt status `HULPVERLENING_AKKOORD` en fase 2 status `HULPVERLENING_AFGEROND`.                                      | `src/domeinen/service-form/domain/submission.ts`                                                                  | `src/domeinen/service-form/domain/submission.test.ts`                                        |
| FORM-21 | Het formulier wordt met `PUT /api/services/{id}` verstuurd.                                                                    | `src/domeinen/service-form/api/service-form-api.ts`                                                               | `src/domeinen/service-form/api/service-form-api.test.ts`                                     |
| FORM-22 | Als de dienststatus inmiddels geen formulierverzending meer toestaat, wordt niets verstuurd en verlaat het scherm de flow.     | `src/domeinen/service-form/service/service-form-service.ts`                                                       | `src/domeinen/service-form/service/service-form-service.test.ts`                             |
| FORM-23 | Een tijdelijke verzendfout houdt het formulier open en biedt een retryactie zonder de mutatie in de outbox te zetten.          | `src/domeinen/service-form/screens/service-form-screen.tsx`                                                       | —                                                                                            |
| FORM-24 | Na een geslaagde verzending wordt het concept gewist en gaat dezelfde verwerkings-exitflow verder.                             | `src/domeinen/service-form/screens/service-form-screen.tsx`                                                       | —                                                                                            |
| FORM-25 | Bij uitloggen worden alle formulierconcepten gewist.                                                                           | `src/bootstrap/container.ts`                                                                                      | `src/domeinen/service-form/service/draft-storage.test.ts`, `src/bootstrap/container.test.ts` |

## Randgevallen en bewuste keuzes

- Verborgen antwoorden blijven lokaal in de formuliersessie staan, maar tellen niet mee voor
  voortgang, validatie of verzending.
- Een datumveld is alleen informatief: zonder CRM-waarde kan een verplicht datumveld verzending
  blokkeren; de app verzint geen datumkiezer. Zie vraag 27 hieronder.
- Handtekeningen worden apart opgebouwd; handtekeningvelden komen niet als gewone antwoorden in de
  servicepayload.
- De dienstdefinitie bepaalt de verplichte posities per fase. In fase 2 vereist iedere extra
  laadfoto een afzonderlijke tegenfoto, ook bij gelijke posities. CRM-foto's worden alleen opgehaald
  als er lokaal geen foto's van die fase zijn; een netwerkfout zonder cache blokkeert verzenden.
- De oude optie 'toch versturen' bestaat niet meer. Zie
  [bekende fout 39](../functioneel/bekende-fouten-oude-app.md).
- Anders dan de oude pilot toont verzenden alle fouten en springt het naar de eerste fout. Zie
  [bekende fout 35](../functioneel/bekende-fouten-oude-app.md).

## Open vragen

- [Vraag 25](../functioneel/open-vragen.md): er is bewust geen vaste client-sync-entiteit voor
  formulierdefinities; de app zoekt op `dataDefinition` en `servicecode`.
- [Vraag 26](../functioneel/open-vragen.md): het formulier gebruikt `PUT /api/services/{id}`.
- [Vraag 27](../functioneel/open-vragen.md): datumvelden zijn alleen-lezen; een verplicht leeg
  datumveld blokkeert daardoor verzending.
- [Vraag 28](../functioneel/open-vragen.md): decimalen worden met een punt opgeslagen; of de backend
  alle waarden zo accepteert blijft een backendvraag.
