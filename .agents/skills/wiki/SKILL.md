---
name: wiki
description: Beheert de projectwiki in docs/wiki/ en gebruikt die als specificatie om de code te controleren. Schrijft en werkt pagina's per onderwerp bij (toestemmingen, stores, statuscodes, outbox, ...), zoekt wat nog niet beschreven is, en toetst of een feature echt werkt zoals de wiki zegt. Gebruik bij /wiki of "wiki", of als de gebruiker vraagt om documentatie te maken, bij te werken, te controleren of code tegen de documentatie te toetsen.
---

# Wiki: documentatie als specificatie

De wiki staat in `docs/wiki/`, één pagina per onderwerp, in het Nederlands. Elke pagina bevat
**beweringen**: korte, toetsbare zinnen over hoe de app werkt. Die beweringen zijn de specificatie.
Controleren betekent: per bewering nagaan of de code (en een test) het waarmaakt.

Lees eerst `CLAUDE.md`, `docs/conventions.md` en `docs/architecture.md` als je dat in dit gesprek
nog niet hebt gedaan.

## Welke opdracht?

Lees wat de gebruiker achter `/wiki` of bij "wiki" typt en kies één modus. Is het niet duidelijk,
vraag het aan de gebruiker (één gerichte keuzevraag).

| De gebruiker zegt                                 | Modus                                          |
| ------------------------------------------------- | ---------------------------------------------- |
| `/wiki`, "controleer", "check het project"        | **Controleren**: alle pagina's tegen de code   |
| "controleer outbox", "klopt dienst weigeren?"     | **Feature toetsen**: één onderwerp of feature  |
| "werk bij", "update", "schrijf pagina X"          | **Bijwerken**: pagina's schrijven of aanpassen |
| "wat mist er", "gaten", "wat is niet beschreven?" | **Ontbrekend**: code zonder pagina of bewering |

Bestaat `docs/wiki/` nog niet, begin dan met **Bijwerken** voor `README.md` (de index) en vraag
welke onderwerpen eerst moeten.

## Harde regels

- **Nooit gokken.** Kun je uit code, tests en `docs/` niet opmaken hoe iets bedoeld is, stel dan een
  gerichte vraag. Weet de gebruiker het ook niet, zet het dan in
  `docs/functioneel/open-vragen.md` met de aanname, zoals `CLAUDE.md` voorschrijft.
- **Verzin geen statuscodes, API-velden of CRM-gedrag.** Neem ze over uit de code
  (`status.ts`, `api/schemas.ts`) of uit `docs/functioneel/`.
- **Controleren wijzigt geen code.** In de modi Controleren, Feature toetsen en Ontbrekend lever je
  een rapport. Code aanpassen doe je alleen als de gebruiker daar daarna om vraagt, en dan volgens
  `CLAUDE.md` (test eerst).
- **Een afwijking beslis je niet zelf.** Als code en wiki verschillen, weet je niet welke van de
  twee fout is. Vraag het (zie "Bij een afwijking").
- **Verwijzen, niet kopiëren.** Een ADR of `docs/functioneel/`-bestand dat het al uitlegt, link je.
  Lange lijsten (alle statuscodes, alle opslagsleutels) link je naar het bronbestand, tenzij de
  lijst zelf de specificatie is.
- Niet committen tenzij gevraagd.

## Modus: Controleren

1. Lees `docs/wiki/README.md` en de lijst met pagina's.
2. **Bepaal wat veranderd is.** Elke pagina heeft bovenaan `Gecontroleerd op: <commit>`. Draai
   per pagina `git diff --stat <commit>..HEAD -- <bronnen van die pagina>`. Pagina's zonder
   wijziging in hun bronnen markeer je als "ongewijzigd sinds <commit>" en sla je over, tenzij de
   gebruiker om een volledige controle vraagt.
3. **Toets de overige pagina's.** Bij meer dan drie pagina's: onderzoek parallel per pagina (of
   groep kleine pagina's) als je omgeving dat ondersteunt; anders sequentieel. Opdracht per pagina:

   > Lees `docs/wiki/<pagina>.md`. Controleer elke bewering tegen de code en tests in
   > `<bronnen>`. Geef per bewering-ID: status (klopt / wijkt af / geen test / niet te
   > controleren), bewijs met `bestand:regel`, en bij "wijkt af" wat de code wél doet.
   > Wijzig niets. Ga niet raden: kun je het niet vaststellen, zeg dat.

   Verzamel onduidelijkheden en vraag die zelf aan de gebruiker.

4. **Zoek ook in de andere richting.** Kijk per pagina of de bronnen gedrag bevatten dat geen
   bewering heeft (nieuwe `kind`, nieuwe status, nieuwe foutafhandeling). Dat wordt "niet
   beschreven".
5. Rapporteer (zie "Rapport") en behandel de afwijkingen (zie "Bij een afwijking").
6. Werk `Gecontroleerd op` alleen bij voor pagina's waarvan elke bewering "klopt" of bewust
   geaccepteerd is.

## Modus: Feature toetsen

Zoals Controleren, maar voor één pagina of één feature en altijd grondig (geen diff-overslag):

1. Zoek de pagina en de beweringen die over de feature gaan. Is er geen pagina, zeg dat en bied
   aan hem eerst te schrijven.
2. Volg voor elke bewering het pad door de code: scherm → hook → service → api/outbox. Noteer
   `bestand:regel`.
3. Zoek de test die de bewering vastlegt (`*.test.ts`, `src/bootstrap/container.test.ts`). Draai
   die tests: `pnpm exec vitest run <bestanden>`.
4. Rapporteer per bewering. Een bewering zonder test is "geen test", ook als de code klopt.

## Modus: Bijwerken

1. Kies de pagina's uit [onderwerpen.md](onderwerpen.md). Staat het onderwerp er niet in, stel een
   naam en bronnen voor en vraag of dat klopt.
2. Lees eerst de bronnen: de ADR's en `docs/functioneel/` die bij het onderwerp horen, dan de code
   en de tests. Bij twijfel over bedoeld gedrag: vragen, niet invullen.
3. Schrijf de pagina volgens [pagina-sjabloon.md](pagina-sjabloon.md). Elke bewering moet je
   kunnen aanwijzen in de code; vermeld het bestand. Beschrijf gedrag, niet de implementatie.
4. Werk `docs/wiki/README.md` bij (index met één regel per pagina).
5. Zet `Gecontroleerd op` op de huidige commit (`git rev-parse --short HEAD`) en de datum.
6. Controleer de pagina direct zelf (modus Feature toetsen, alleen de nieuwe beweringen).
7. `pnpm exec prettier --write docs/wiki` en dan `pnpm run format:check`.

## Modus: Ontbrekend

1. Loop `src/domeinen/*/` en `src/shared/*/` langs en vergelijk met [onderwerpen.md](onderwerpen.md)
   en de bestaande pagina's.
2. Meld:
   - domeinen of onderwerpen zonder pagina;
   - pagina's waarvan een bronbestand niet meer bestaat;
   - beweringen zonder test;
   - openstaande vragen in `docs/functioneel/open-vragen.md` die een pagina raken.
3. Stel een volgorde voor en vraag welke je moet schrijven.

## Bij een afwijking

Stel per afwijking (of per groep gelijksoortige) één gerichte vraag:

- **Code is fout, wiki klopt.** Bied aan eerst een falende test te schrijven en daarna de code te
  herstellen. Doe dat pas na akkoord.
- **Wiki is verouderd, code klopt.** Pas de bewering aan en vermeld wat er veranderde.
- **Weet ik niet.** Zet het in `docs/functioneel/open-vragen.md` met de huidige werking als
  aanname, en markeer de bewering op de pagina met `(open vraag NN)`.

Geef bij de vraag de bewering, wat de code doet (`bestand:regel`) en je inschatting.

## Rapport

Begin met de uitkomst in één zin ("12 van 14 pagina's kloppen, 3 afwijkingen, 5 beweringen zonder
test"). Daarna:

```markdown
### <pagina> — <n> afwijkingen

| Bewering  | Status    | Bewijs                   | Toelichting                        |
| --------- | --------- | ------------------------ | ---------------------------------- |
| OUTBOX-03 | wijkt af  | `outbox-repository.ts:7` | schema kent `decline-service` niet |
| OUTBOX-05 | geen test | `outbox-service.ts:40`   |                                    |
```

Laat pagina's die volledig kloppen weg uit de tabellen en noem ze in één regel. Sluit af met de
vragen die je nog hebt en wat je hebt aangepast.
