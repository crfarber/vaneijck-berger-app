# Wiki berger-app

> Gecontroleerd op: ba1383c (2026-09-23)
> Bijgewerkt op: `ba1383c` (2026-09-30; Homebase en fotoproces)
> Bronnen: `docs/wiki/`, `.agents/skills/wiki/onderwerpen.md`, `.agents/skills/wiki/pagina-sjabloon.md`, `docs/architecture.md`, `docs/conventions.md`
> Zie ook: [architectuur](../architecture.md), [conventies](../conventions.md), [roadmap](../roadmap.md)

## Waarvoor

Deze wiki beschrijft hoe de app nu werkt. Iedere onderwerp pagina bevat toetsbare beweringen met
een codepad en een testpad of `—`, zodat documentatie, code en testdekking naast elkaar kunnen
worden gecontroleerd.

## Hoe het werkt

### Leesroute nieuwe developer

1. Begin bij [Overzicht](overzicht.md) en lees daarna
   [architectuur](../architecture.md) en [conventies](../conventions.md).
2. Volg de [Applicatieflow](applicatieflow.md) en gebruik
   [Componenten en routes](componenten.md) als codekaart.
3. Lees [Stores](stores.md), [API en fouten](api-en-fouten.md),
   [Statuscodes](statuscodes.md) en [Testen](testen.md) voor de technische grenzen.
4. Open daarna de onderwerpwiki van het domein waaraan je werkt.
5. Controleer [Ontwikkelstatus](ontwikkelstatus.md) voor ontbrekende tests en echte
   toestel- of backendvalidatie.

### Leesroute product owner of klant

1. Begin bij [Applicatieflow](applicatieflow.md) voor de volledige gebruikersreis.
2. Lees [Ontwikkelstatus](ontwikkelstatus.md) voor het onderscheid tussen gebouwd,
   gedeeltelijk en niet gebouwd of niet gevalideerd.
3. Gebruik [Klantacceptatie](klantacceptatie.md) voor de handmatige hoofdscenario's.
4. Open daarna de onderwerpwiki van de te beoordelen functie en controleer de gekoppelde
   [open vragen](../functioneel/open-vragen.md).

### Alle pagina's

| Pagina                                          | Waarover                                                    | Gecontroleerd |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------- |
| [Wiki-index](README.md)                         | leesroutes, paginaoverzicht en uitleg van claimstatussen    | `ba1383c`     |
| [API en fouten](api-en-fouten.md)               | HTTP-client, fouttypen, retry en sessieverloop              | `ba1383c`     |
| [Applicatieflow](applicatieflow.md)             | end-to-end gebruikersreis van appstart tot uitloggen        | `ba1383c`     |
| [Beschikbaarheid](beschikbaarheid.md)           | medewerkerstatus, opties en wijzigen                        | `ba1383c`     |
| [Builds](builds.md)                             | varianten, runtimeconfiguratie en buildprofielen            | `ba1383c`     |
| [Componenten en routes](componenten.md)         | alle actuele routes, schermen en UI-componenten             | `ba1383c`     |
| [Diensten](diensten.md)                         | diensten laden, accepteren, weigeren en afronden            | `ba1383c`     |
| [Feedback en dialogen](feedback.md)             | toasts, procesoverlay, bevestigingen en sheets              | `ba1383c`     |
| [Foto's](fotos.md)                              | schermstroom, fotofasen, lokale opslag en uploadwachtrij    | `ba1383c`     |
| [Internationalisatie](i18n.md)                  | Nederlands, Engels en taal richting CRM                     | `ba1383c`     |
| [Inloggen](inloggen.md)                         | externe en interne login, sessie en tokenverversing         | `ba1383c`     |
| [Instellingen](instellingen.md)                 | taal, toestemmingen, support, debug en uitloggen            | `ba1383c`     |
| [Klantacceptatie](klantacceptatie.md)           | deelbare handmatige acceptatiescenario's                    | `ba1383c`     |
| [Locatie](locatie.md)                           | GPS, afstandscontrole, doelkeuze en kaartlinks              | `ba1383c`     |
| [Logging en privacy](logging-en-privacy.md)     | logging, redactie en privacygrenzen                         | `ba1383c`     |
| [Offline werken](offline.md)                    | bewaarde querydata, mutaties en fotowachtrij                | `ba1383c`     |
| [Onboarding en eenheid](onboarding.md)          | gate, voertuig, uitvoerlocatie, beschikbaarheid en eindtijd | `ba1383c`     |
| [Ontwikkelstatus](ontwikkelstatus.md)           | gebouwd, gedeeltelijk en ontbrekende validatie              | `ba1383c`     |
| [Opdrachten](opdrachten.md)                     | lijst, accepteren, afwijzen, afronden en overdragen         | `ba1383c`     |
| [Opslagsleutels](opslagsleutels.md)             | duurzame sleutels en wat uitloggen wist                     | `ba1383c`     |
| [Outbox](outbox.md)                             | duurzame mutatiewachtrij en aflevervolgorde                 | `ba1383c`     |
| [Overzicht](overzicht.md)                       | appstart, container, providers en navigatie                 | `ba1383c`     |
| [PLTR](pltr.md)                                 | planbaar transport, fasen en acties                         | `ba1383c`     |
| [Pushmeldingen](pushmeldingen.md)               | registratie, parsing, effecten en historie                  | `ba1383c`     |
| [Referentiedata](referentiedata.md)             | synchronisatie, opslag en formulierdefinities               | `ba1383c`     |
| [Statuscodes](statuscodes.md)                   | opdracht-, dienst- en beschikbaarheidsstatussen             | `ba1383c`     |
| [Stores](stores.md)                             | Query, Zustand, opslag en tokenbezit                        | `ba1383c`     |
| [Support](support.md)                           | geredigeerd log bekijken en delen                           | `ba1383c`     |
| [Testen](testen.md)                             | testopzet, fakes, coverage en architectuurtest              | `ba1383c`     |
| [Toestemmingen](toestemmingen.md)               | locatie, meldingen en camera                                | `ba1383c`     |
| [Verwerkingsformulier](verwerkingsformulier.md) | dynamisch formulier, concept, validatie en submit           | `ba1383c`     |

### Betekenis van signalen

- **Claimstatus:** bij een wikicontrole krijgt iedere claim de status klopt, wijkt af, geen test of
  niet te controleren. De pagina zelf bevat de specificatie; het controlerapport bevat de actuele
  status.
- **Testgat:** `—` in de testkolom betekent dat geen directe test voor die bewering is gevonden.
  Een onderliggende domeintest is niet automatisch een route-, scherm- of componenttest.
- **Open vraag:** gedrag dat product, backend of team nog moet bevestigen staat in
  [open vragen](../functioneel/open-vragen.md). De wiki vermeldt de gebruikte aanname, maar maakt
  die niet definitief.
- **Gecontroleerde commit:** de commit boven een pagina is de codeversie waartegen de claims voor
  het laatst zijn gelegd. Wijzigingen na die commit vragen een nieuwe controle van de betrokken
  bronnen.

## Beweringen

| ID       | Bewering                                                                                                                     | Code                                                                     | Test |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| INDEX-01 | De tabel bevat ieder markdownbestand dat op deze commit in `docs/wiki/` staat, inclusief deze index.                         | `docs/wiki/`                                                             | —    |
| INDEX-02 | De leesroute voor een nieuwe developer begint bij architectuur en flow en eindigt bij domein- en statusdetail.               | `docs/wiki/README.md`                                                    | —    |
| INDEX-03 | De leesroute voor product owner of klant begint bij gebruikersflow, status en handmatige acceptatie.                         | `docs/wiki/README.md`                                                    | —    |
| INDEX-04 | Iedere onderwerp pagina gebruikt een blijvend claim-ID en noemt codebewijs en een testpad of `—`.                            | `.agents/skills/wiki/pagina-sjabloon.md`, `docs/wiki/`                   | —    |
| INDEX-05 | Een testgat betekent dat de bewering geen directe test heeft, ook als onderliggende code door een andere test wordt geraakt. | `.agents/skills/wiki/SKILL.md`, `.agents/skills/wiki/pagina-sjabloon.md` | —    |
| INDEX-06 | Een open vraag blijft als aanname herkenbaar totdat product, backend of team haar bevestigt.                                 | `docs/functioneel/open-vragen.md`, `.agents/skills/wiki/SKILL.md`        | —    |

## Randgevallen en bewuste keuzes

- De index beschrijft pagina's, niet alle bronbestanden; de onderwerpenkaart bevat de brongebieden
  per onderwerp.
- Een gecontroleerde commit betekent niet dat een functie op een echt toestel of tegen een echte
  backend is geaccepteerd. Zie [ontwikkelstatus](ontwikkelstatus.md).
- De componentencatalogus telt directe UI-tests en schrijft een pure domeintest niet toe aan
  rendering.
- Bekende regressies en bewuste verschillen staan in
  [bekende fouten](../functioneel/bekende-fouten-oude-app.md).

## Open vragen

- De inhoudelijke open vragen staan centraal in
  [docs/functioneel/open-vragen.md](../functioneel/open-vragen.md).
- Wanneer een nieuw onderwerp of domein ontstaat, moet eerst de
  [onderwerpenkaart](../../.agents/skills/wiki/onderwerpen.md) worden bijgewerkt en daarna deze
  index.
