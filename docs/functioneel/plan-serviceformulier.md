# Plan: serviceformulier in gebruik nemen

## Doel

Een berger kan vanuit een actieve dienst of de laad-/afleverstap van PLTR een formulier openen,
invullen, veilig verlaten met een concept, en versturen naar CRM. Na een geslaagde verzending volgt
de bestaande verwerkingsuitgang.

De nieuwe app gebruikt `service-form` als formulierengine. `legacy/docs/ServicesForm.md` is
gedragsnaslag; de nieuwe implementatie volgt de lagen en poorten van deze app.

## Uitgangspunt

De route `/allocations/[id]/services/[serviceId]/form` bestaat en geeft de parameters correct door
aan `ServiceFormScreen`. De ene directe import uit `@react-navigation/native` onderschept alleen
terugnavigatie om een gewijzigd formulier als concept te bewaren. Expo Router gebruikt React
Navigation zelf; deze import verklaart daarom niet waarom het formulier niet opent.

De eerste aanname die we moeten toetsen is dat de gesynchroniseerde referentiedata geen bruikbare
`dataDefinition` voor het actuele `dn_servicetypecode` bevat. Zonder die definitie toont het scherm
bewust de status zonder formulier.

## Fase 1: fout vastleggen en ingang controleren

1. Kies op tst een actieve dienst met bekende `allocationId`, `serviceId`, status en
   `dn_servicetypecode`.
2. Open die dienst vanuit het dienstenscherm en noteer de zichtbare uitkomst: route opent niet,
   laadstatus blijft staan, definitie ontbreekt, of het formulier toont een fout.
3. Controleer met een tijdelijke, geredigeerde debugweergave of supportlog welke dienstcode de app
   ontvangt en welke gesynchroniseerde entiteiten `dataDefinition` bevatten. Log geen formulierdata,
   persoonsgegevens of tokens.
4. Voeg een regressietest toe voor de vastgelegde fout, bij voorkeur op `ServiceFormService` of in
   `src/bootstrap/container.test.ts` wanneer de fout de volledige keten raakt.

**Klaar:** de fout is met een vaste test of reproduceerbaar tst-scenario aantoonbaar en heeft één
concrete oorzaak.

## Fase 2: schemadefinitie en synchronisatie werkend maken

1. Vergelijk de `dn_servicetypecode` uit fase 1 met een daadwerkelijk opgeslagen
   `dataDefinition[].servicecode`.
2. Controleer dat `reference-data` de entiteit met de definitie in `listEntities` registreert en
   na synchronisatie kan lezen.
3. Behoud de huidige inhoudelijke zoekstrategie: geen vaste entiteitsnaam, maar zoeken naar
   `dataDefinition` en `servicecode`. Nieuwe CRM-entiteitsnamen mogen geen app-release vereisen.
4. Maak tests voor een gevonden definitie, een ontbrekende definitie en een gewijzigde definitie na
   een volgende synchronisatie.

**Klaar:** een actieve dienst met een ondersteund schema opent altijd het juiste formulier in de
juiste taal en fase.

## Fase 3: navigatie en concepten afronden

1. Behoud Expo Router voor alle route-overgangen (`router.push`, `router.back`, `router.replace`).
2. Test de huidige `beforeRemove`-bescherming op iOS en Android: terug, hardware-terug en gesture
   tonen bewaren, weggooien en annuleren alleen wanneer het formulier gewijzigd is.
3. Vervang de directe `useNavigation`-listener alleen als die controles een platformprobleem
   aantonen. Gebruik dan een Expo Router-compatibele oplossing die dezelfde actie na bevestiging
   voortzet; verander de conceptregels niet tegelijk.
4. Test hervatten, nieuw beginnen, weggooien en wissen na succesvol versturen.

**Klaar:** een gebruiker kan geen ingevuld formulier per ongeluk verliezen en preview blijft altijd
alleen-lezen.

## Fase 4: velden per echte definitie aansluiten

1. Verzamel op tst per diensttype welke veldtypes werkelijk voorkomen.
2. Controleer basisvelden en selectvelden eerst tegen die schema's, inclusief conditionals,
   readonly-velden, verplichte velden, optie met waarde `0`, lookups met gelijke labels en
   afstandssortering van depots.
3. Sluit ontbrekende integraties één voor één aan: kenteken/RDW, adres zoeken, handtekening en
   volledige foto-afhandeling.
4. Voeg per veldtype pure domeintests toe en een regressietest voor elke fout uit de oude app.

**Klaar:** onbekende veldtypes falen zichtbaar maar veilig; alle veldtypes in het gekozen tst-schema
zijn invulbaar of bewust als niet beschikbaar gemarkeerd.

## Fase 5: verzenden en uitrol valideren

1. Controleer met de backend welk contract voor `PUT /api/services/{id}` geldt; verifieer daarbij
   expliciet de nog gedocumenteerde onzekerheid over de oude swagger die `POST` noemt.
2. Test validatiefouten, tijdelijke netwerkfout met opnieuw proberen, niet-verzendbare status en
   succesvolle verzending. Een tijdelijke fout laat het formulier open en logt de gebruiker niet
   uit.
3. Controleer na een succesvolle verzending de CRM-mutatie, foto-/handtekeningvolgorde waar van
   toepassing, de conceptverwijdering en de exit-navigatie.
4. Draai `pnpm run ci` en bij route- of importwijzigingen ook
   `EXPO_PUBLIC_API_BASE_URL=<tst-url> pnpm exec expo export --platform android`.
5. Voer de handmatige acceptatie uit op iOS en Android met minimaal een Berging-, Pechhulp- en
   PLTR-dienst, in Nederlands en Engels.

**Klaar:** de volledige flow werkt op tst voor de gekozen diensttypen en de regressietests bewaken
de gevonden fouten.

## Volgorde

Voer fase 1 en 2 uit voordat er aan de navigatie-import wordt gewijzigd. Zolang geen bruikbare
`dataDefinition` wordt gevonden, levert een migratie van de `beforeRemove`-listener geen zichtbaar
formulier op.
