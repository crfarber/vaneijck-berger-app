# Spec — Voertuiggegevens herkennen uit foto's

Status: concept
Domeinen: `photos`, `rdw`, `service-form`, `allocation-unit`, nieuw `vehicle-recognition`

## 1. Aanleiding

Bij een berging moet de berger kenteken, merk, model en kleur vastleggen. Dat gebeurt nu met de hand of via de RDW-opzoeking op kenteken. We willen zoveel mogelijk van deze gegevens automatisch uit de camera of uit de gemaakte foto's halen. Dat moet ook werken als het voertuig zwaar beschadigd is of de kentekenplaat ontbreekt.

## 2. Uitgangspunten

- Herkenning levert altijd een **voorstel**. De berger bevestigt of verbetert het. Er wordt nooit iets zonder bevestiging opgeslagen.
- Het kenteken gaat vóór beeldherkenning. Gegevens van de RDW zijn betrouwbaarder dan wat een model in een foto ziet.
- Kenteken lezen (OCR) gebeurt op het toestel en werkt dus ook zonder netwerk.
- Beeldherkenning in de cloud loopt via onze eigen backend. Er staan geen API-sleutels in de app.
- Alles staat achter poorten. `domain/`, `api/` en `service/` blijven pure TypeScript.
- Elke fase staat achter een feature flag en levert los iets op.

## 3. Huidige situatie

- `rdw`-domein: `createRdwApi` haalt `licensePlate`, `model`, `tradeName` en `primaryColor` op via de backend.
- `service-form`: de kentekengroep (`license_plate_group`) vult bij een geldig kenteken automatisch velden in via de RDW (`rdw-autofill`), inclusief het koppelen aan de CRM-opzoektabellen voor merk en type (`lookup-match`).
- `allocation-unit`: `normalizeLicensePlate`, `isDutchLicensePlate` en `canBeDutchLicensePlate` controleren de 14 Nederlandse kentekenformaten (sidecodes).
- `photos`: foto's worden gemaakt met `expo-camera`. Er is nog geen beeldanalyse.

## 4. Fase 1 — Kenteken scannen in het formulier

### 4.1 Gedrag

- Naast het kentekenveld in de kentekengroep komt een scanknop.
- De knop opent de camera met een kader voor de kentekenplaat.
- Na de opname leest OCR op het toestel de tekst. De app haalt daaruit de kentekens die mogelijk zijn.
- Eén geldig kenteken: de app vult het veld in en de bestaande RDW-opzoeking start, zoals bij handmatig invoeren.
- Meerdere kentekens: de berger kiest er een.
- Geen kenteken gevonden: een melding en terugvallen op handmatig invoeren.

### 4.2 Techniek

- Een native module voor tekstherkenning met ML Kit (bijvoorbeeld `@react-native-ml-kit/text-recognition`). Dit vraagt prebuild en een nieuwe ontwikkelbuild.
- Een poort `TextRecognizer` met `recognize(uri): Promise<string[]>` (de herkende regels), gekoppeld in `container.ts`.
- Een pure functie `extractLicensePlateCandidates(lines)` in `vehicle-recognition/domain`:
  - normaliseren met `normalizeLicensePlate`;
  - per sidecode verwisselde tekens corrigeren (O↔0, I↔1, B↔8, S↔5, Z↔2), maar alleen waar het formaat een letter of juist een cijfer verwacht;
  - filteren met `isDutchLicensePlate`;
  - ontdubbelen en sorteren op betrouwbaarheid.

### 4.3 Tests

- Unit-tests voor de kandidaatextractie met realistische OCR-ruis: "NL", landcodestrook, streepjes, spaties, verwisselde tekens.
- Een end-to-end test in `container.test.ts` met een nep-`TextRecognizer`: van scan naar RDW-opzoeking naar ingevulde velden.

## 5. Fase 2 — Kenteken uit verplichte foto's

- Na het maken van de verplichte foto's van voor- en achterkant draait OCR op de achtergrond op die foto's.
- Wordt er een geldig kenteken gevonden en is het kentekenveld leeg, dan toont het formulier het als voorstel ("Kenteken herkend: XX-123-X, overnemen?").
- Wijkt het gevonden kenteken af van het ingevulde, dan krijgt de berger een waarschuwing. Er wordt niets overschreven.
- Er is geen extra handeling voor de berger nodig.

## 6. Fase 3 — Chassisnummer (VIN) als terugvaloptie

- Voor voertuigen zonder kentekenplaat: het chassisnummer scannen (ruit, deurstijl of typeplaatje).
- Controle: 17 tekens, zonder I, O of Q.
- Opzoeken op chassisnummer bestaat nog niet in de backend (zie open vragen). Zonder die opzoeking slaan we alleen het chassisnummer op.

## 7. Fase 4 — Beeldherkenning merk, model en kleur

### 7.1 Gedrag

- Alleen voor voertuigen zonder bruikbaar kenteken, of als controle op de RDW-gegevens.
- De app stuurt een of meer verplichte foto's (bij voorkeur voor en achter, schuin) naar de backend.
- De backend geeft per veld een voorstel met een betrouwbaarheidsscore: merk, model, kleur en carrosserievorm.
- Voorstellen worden gekoppeld aan de CRM-opzoektabellen via de bestaande `lookup-match`.
- Onder een drempelwaarde toont de app niets.
- Als controle: bij een afwijking tussen RDW-gegevens en beeld (bijvoorbeeld een andere kleur of een ander merk) krijgt de berger een waarschuwing dat het kenteken mogelijk niet bij het voertuig hoort.

### 7.2 Techniek

- Een poort `VehicleRecognizer` met `recognize(photoIds): Promise<VehicleSuggestion>`.
- De API-implementatie loopt via een nieuw backend-endpoint. Het contract is nog **niet bekend**; alles gaat door een zod-schema.
- Het model kiest de backend (een multimodaal model of een gespecialiseerde dienst voor kentekens en merk/model/kleur). De app hangt niet af van die keuze.

## 8. Niet-functionele eisen

- **Privacy:** een kenteken is een persoonsgegeven. In logs gaat het door `redact`. Foto's gaan alleen naar een cloudmodel als Van Eijck daarmee akkoord is en er een verwerkersovereenkomst is.
- **Offline:** fases 1 tot en met 3 werken zonder netwerk, behalve de opzoekingen. Fase 4 is alleen online beschikbaar en blokkeert niets.
- **Prestaties:** OCR op het toestel duurt minder dan 1 seconde op het referentietoestel. Beeldherkenning loopt op de achtergrond en blokkeert het formulier niet.
- **Teksten:** in `resources.ts`, in het Nederlands en het Engels.
- **Hermes:** geen `toSorted` of `toReversed`.

## 9. Volgorde

1. Fase 0: open vragen 1 tot en met 3 beantwoorden en een korte spike met ML Kit op echte bergingsfoto's (ook 's nachts en bij schade).
2. Fase 1: kenteken scannen in het formulier.
3. Fase 2: kenteken uit verplichte foto's.
4. Fase 3: chassisnummer scannen.
5. Fase 4: beeldherkenning, na een akkoord over privacy en een backend-endpoint.

## 10. Open vragen

1. Mogen foto's naar een cloudmodel? Welke leverancier en welke regio (EU)?
2. Bouwt de backend een endpoint voor beeldherkenning en een opzoeking op chassisnummer?
3. Moeten buitenlandse kentekens in fase 1 worden ondersteund, of alleen Nederlandse?
4. Moet een afwijking tussen RDW-gegevens en beeld worden vastgelegd in het CRM (audit)?
5. Welke drempelwaarde voor betrouwbaarheid is acceptabel voor een voorstel?

## 11. Acceptatiecriteria

- [ ] De berger kan een Nederlands kenteken scannen, en het formulier vult de RDW-gegevens in zoals bij handmatig invoeren.
- [ ] Een ongeldige of onleesbare scan vult nooit iets in en toont een duidelijke melding.
- [ ] Een herkend kenteken uit de verplichte foto's verschijnt alleen als voorstel en overschrijft nooit een ingevulde waarde.
- [ ] Er komen geen kentekens onversleuteld in de logs.
- [ ] Alle nieuwe domeinlogica heeft tests, en `pnpm run ci` slaagt.
- [ ] Fase 4 staat uit totdat open vraag 1 is beantwoord.
