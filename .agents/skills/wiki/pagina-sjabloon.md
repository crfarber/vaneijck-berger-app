# Paginasjabloon

Bestandsnaam: `docs/wiki/<onderwerp>.md`, kleine letters met streepjes (bijvoorbeeld
`outbox.md`, `statuscodes.md`). Het ID-voorvoegsel van beweringen is kort en in hoofdletters
(`OUTBOX`, `STATUS`, `PERM`) en verandert nooit meer.

```markdown
# <Onderwerp>

> Gecontroleerd op: `<korte commit>` (<JJJJ-MM-DD>)
> Bronnen: `src/domeinen/<domein>/`, `src/bootstrap/container.ts`
> Zie ook: [ADR 00NN](../decisions/00NN-....md), [flows](../functioneel/flows.md#...)

## Waarvoor

Twee à drie zinnen: welk probleem dit onderdeel oplost voor de berger of het team.

## Hoe het werkt

Korte uitleg in gewone taal, eventueel met een mermaid-diagram. Geen code overnemen.

## Beweringen

| ID        | Bewering                                                               | Code                        | Test                            |
| --------- | ---------------------------------------------------------------------- | --------------------------- | ------------------------------- |
| OUTBOX-01 | Een tijdelijke fout (netwerk, 5xx) zet de mutatie in de wachtrij.      | `service/outbox-service.ts` | `outbox-service.test.ts`        |
| OUTBOX-02 | Een harde 4xx markeert alleen dat item als mislukt; de rest gaat door. | `domain/delivery.ts`        | `delivery.test.ts`              |
| OUTBOX-03 | Bij uitloggen wordt de wachtrij leeggemaakt.                           | `bootstrap/container.ts`    | `container.test.ts` (uitloggen) |

## Randgevallen en bewuste keuzes

- Wat bewust anders is dan de oude app, met link naar
  `docs/functioneel/bekende-fouten-oude-app.md` (rijnummer).

## Open vragen

- Link naar de rijen in `docs/functioneel/open-vragen.md` die hier spelen.
```

## Regels voor beweringen

- **Eén gedrag per regel**, zo geformuleerd dat iemand het kan testen: "als X, dan Y".
- **Gedrag, geen implementatie.** "Een tijdelijke fout logt de gebruiker niet uit", niet "de
  functie `isRetryable` retourneert true".
- **Code-kolom:** het bestand waar het gedrag beslist wordt (pad relatief aan het domein mag).
- **Test-kolom:** het testbestand, of `—` als er geen is. Een lege test is een bevinding.
- **Een bewering met een open vraag** krijgt `(open vraag NN)` achter de tekst.
- **Verwijderd gedrag:** schrap de rij niet stil. Zet `~~doorgehaald~~` met de datum, en haal het
  bij de volgende controle weg.
- Tabellen die zelf de specificatie zijn (statuscodes met betekenis, opslagsleutels, toestemmingen
  per scherm) mogen volledig op de pagina staan. Vermeld dan het bronbestand waartegen ze
  gecontroleerd worden.

## README.md (index)

```markdown
# Wiki berger-app

Hoe de app werkt, per onderwerp. Elke pagina bevat beweringen die tegen de code gecontroleerd
worden met `/wiki` of "wiki". Architectuur en regels: [architecture.md](../architecture.md),
[conventions.md](../conventions.md).

| Pagina              | Waarover                           | Gecontroleerd |
| ------------------- | ---------------------------------- | ------------- |
| [Outbox](outbox.md) | mutaties die wachten op verbinding | `abc1234`     |
```
