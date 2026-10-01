# 0023. ServiceForm: het verwerkingsformulier, uit de pilot in plaats van `ProcessingService.js`

**Status:** motor, scherm, basisvelden, selectvelden, concept-opslag, foto-bevestiging en afwijzen
gebouwd (slices 12, 13, 17 en 18 in de [roadmap](../roadmap.md)); kenteken, adres en handtekening
volgen in slice 14 tot en met 16.

## Context

`ProcessingService.js` (6044 regels) en `ProcessingFinish.js` (1215 regels) zijn de laatste twee
oude bestanden die nooit zijn overgenomen — elke slice tot nu toe noemt ze expliciet als "blijft het
team". Bij het opnieuw bekijken bleek er inmiddels een tweede bron te zijn: `vaneijck-salvageapp`
(niet de `-analyse`-kopie, de repo waar het team zelf in werkt) bevat sinds kort een pilot,
`Servicesform.tsx` en omgeving (`src/domains/services/{types,utils,store,hooks,components/form,views}`,
zie `docs/ServicesForm.md` daar), die precies hetzelfde probleem oplost: dezelfde `dataDefinition`-JSON
(fases → secties → velden, met zichtbaarheids- en verplicht-regels, gelokaliseerde labels), maar
schoon opnieuw opgebouwd als functionele componenten en pure utils, in plaats van één grote
class-component.

In overleg gekozen: **deze pilot overnemen als bron, niet `ProcessingService.js`.** Waar elke
eerdere slice "neem het gedrag over, niet de code" volgde omdat de oude code zelf niet de moeite
waard was om te kopiëren, geldt dat hier niet — de pilot is al geschreven zoals dit project het zelf
zou doen (pure functies, geen `any`, typen voor elk veld), dus is letterlijk overnemen (met alleen de
onvermijdelijke aanpassingen: `KeyValueStore` in plaats van rechtstreeks AsyncStorage, bestaande
`services`-domeinconstanten in plaats van een eigen kopie) sneller én betrouwbaarder dan het gedrag
opnieuw afleiden. `ProcessingService.js`/`ProcessingFinish.js` zijn met deze beslissing overbodig;
`legacy/` in deze repo is alleen naslagwerk, niet iets om vandaan te porten.

## Besluit

- **Nieuw domein `service-form`**, met dezelfde indeling als de pilot maar in de lagen van dit
  project: `domain/` (types, schema-normalisatie, waarden, conditionals, validatie, selectors,
  submission-payloads, handtekeningsleutels — allemaal puur), `service/` (concept-opslag achter
  `KeyValueStore`), `store/` (een Zustand-store per gemount formulier — het eerste echte gebruik van
  Zustand in dit project, zoals `architecture.md` al noemde), `hooks/` (de orchestratie).
- **Dit is de motor, nog geen scherm.** Precies zoals de pilot zelf: een onbekend of nog niet
  ondersteund veldtype krijgt een zichtbare diagnostic-tekst in plaats van dat de app vastloopt. Dat
  principe draagt de rest van de uitrol: elke vervolgslice maakt één stuk van een écht schema
  bruikbaar (basisvelden, dan select, dan kenteken/RDW, dan adres, dan handtekening, dan foto's),
  zonder dat er ooit een moment is waarop het scherm openstaat maar niets doet.
- **`use-processing-exit.ts` (slice 6) blijft de enige eigenaar van versturen-en-navigeren.** Het
  formulier levert alleen de payload (`buildServicePostBody`/`buildSignaturePostData`, al gebouwd en
  getest) en roept daarna dezelfde exit-flow aan met `trigger: 'submit'` — geen nieuwe navigatielogica.
- **Twee ingangen** openen het scherm: een actieve dienst (slice 6, `services-screen.tsx`) en de
  laad-/afleverknop op het PLTR-scherm (slice 7). Beide lopen via `useOpenService`, dat na de
  statuscontrole naar `/allocations/[id]/services/[serviceId]/form` gaat in plaats van de melding
  "dit onderdeel wordt nog gebouwd" te tonen.

## Slice 12 en 13: het scherm

- **Het schema zoeken.** Bewust geen vaste sync-entiteitnaam: nieuwe of hernoemde
  `dataDefinition`-entiteiten moeten zonder app-update werken, net als in de oude app (die de hele
  opslag doorzocht op `dataDefinition[].servicecode`; [besluit 25](../functioneel/open-vragen.md)).
  `reference-data` houdt bij welke entiteiten gesynchroniseerd zijn (`listEntities`), en
  `ServiceFormService.findDefinition` doorzoekt die op inhoud. Per diensttype wordt de entiteitnaam
  gecached (niet de inhoud, zodat een nieuwe sync meteen telt). Een bestaande installatie zonder die
  lijst vraagt één keer alles opnieuw op. Het schema gaat bewust niet door TanStack Query: de
  bewaarde query-cache zou een tweede kopie op het toestel zetten.
- **Versturen** is `PUT /api/services/{id}` met `buildServicePostBody`
  ([open vraag 26](../functioneel/open-vragen.md)). Een status die geen verzending meer toestaat
  stuurt niets (`isSubmitAllowed`) en verlaat het scherm als `blocked`. Een mislukte verzending gaat
  niet in de uitgaande wachtrij: het formulier blijft open met "opnieuw proberen", zodat de chauffeur
  ziet dat het niet verstuurd is.
- **Fase en taal.** HULPVERLENING_AKKOORD is de afleverfase, al het andere de laadfase, zoals de
  pilot. De labels volgen de taal van de app (1043/1044); de sync zelf blijft 1043.
- **Selectvelden.** De tabelregels uit de pilot staan puur in `domain/select-options.ts`. Elke optie
  draagt zijn eigen waarde; de pilot zocht die na de keuze opnieuw op via het label. De positie voor
  de afstandssortering komt van de bestaande `LocationReader`, alleen voor velden die erom vragen.
- **Foutmeldingen.** De validatie levert een code en (bij een grens) `limit`; het scherm vertaalt
  die. Na "Verzenden" staan alle fouten bij hun veld en springt het formulier naar de eerste; de pilot
  toonde alleen fouten bij aangeraakte velden.
- **Slice 17:** concept laden/bewaren/wissen, reset, afwijzen vanaf het formulier, en één
  foto-bevestiging vóór versturen (`needsPhotoConfirmation`).
- **Bewust nog niet:** de voorwaarden bij de handtekening (slice 16) blokkeren versturen nog niet.

## Gevolgen

- Een test uit de pilot zelf bleek een verouderde verwachting te hebben (een select-veld zonder
  CRM-label all een placeholder tonen — de eigen `resolveServiceFormValueToShow` doet dat niet); de
  overgenomen test is aangepast aan het geverifieerde gedrag, met een toelichting in de test zelf.
- De pilot dekte zelf ook nog niet alles (adres zoeken, postcode-autofill, contractrechten,
  volledige foto-upload waren daar ook al "nog niet aangesloten") — dit project sluit die stuk voor
  stuk aan, in de slices hieronder, in plaats van in één keer.
