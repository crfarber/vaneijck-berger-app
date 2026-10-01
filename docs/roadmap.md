# Roadmap

De herbouw gaat in **verticale slices**: elke slice levert iets werkends van scherm tot backend, met tests, en past bij een branch en een pull request. Een slice is klaar als `pnpm run ci` slaagt, de app bundelt, en de acceptatiecriteria hieronder gehaald zijn (waar mogelijk als test, anders met een handmatige controle op de simulator).

Volgorde en omvang zijn een voorstel; de open vragen ([functioneel/open-vragen.md](functioneel/open-vragen.md)) bepalen wat eerst moet worden beantwoord.

## Slice 0: fundament (klaar)

Gereed: Expo SDK 57 met Expo Router, strikte TypeScript, oxlint, prettier, husky, CI; `HttpClient`, fouttaxonomie, logger met redactie, runtime-configuratie met zod; sessiebeheer (`TokenProvider`, `SessionLifecycle`, beveiligde opslag), SMS-login-API; regels voor dienststatussen, vroeg afronden, verwerkingsuitgang, doellocatie, opdrachtsecties, samenvoegen, kentekens, werktijden, notificaties, afstand; zod-schema's en API voor opdrachten en diensten; i18n (nl/en); TanStack Query-configuratie; compositieroot met een end-to-end test; architectuurtest; loginscherm (SMS) en opdrachtenlijst.

## Slice 1: inloggen compleet (klaar op iOS)

Gereed: Azure AD voor interne gebruikers als `InternalAuth`-adapter (`react-native-app-auth`, [ADR 0012](decisions/0012-azure-ad-inloggen.md)) in `src/domeinen/auth/platform/rn/`, met de configuratie- en foutclassificatie als pure, geteste domeinfuncties. Het keuzescherm intern/extern bestaat al sinds slice 0 (beide knoppen op het inlogscherm, elk met hun eigen tekst); een aparte "taalwissel" is niet gebouwd, want de oude `DriverChoice` had die ook niet — alleen de telefoonstap wisselt taal op de landcode.

Op een toestel bevestigd (iOS-simulator, 22 september 2026): de echte Microsoft-aanmeldpagina verschijnt met de juiste tenant-branding; annuleren — zowel bij het systeemvenster vóór de aanmeldpagina als bij het sluiten van de pagina zelf — laat stil de opdrachtenlijst zien, zonder foutmelding (dat vond meteen een echte bug: de eerste versie van `classifyInternalAuthError` herkende de eerste annulering niet, omdat iOS' generieke foutcode een boodschap van het besturingssysteem zelf meegeeft, niet van AppAuth, dus zonder het woord "cancel" — de aanname in de code was fout, niet alleen ongetest); en **een echte aanmelding met een Van Eijck-account slaagt**: de app kwam op het opdrachtenscherm met een werkende "Sign out"-knop. Zie [ADR 0012](decisions/0012-azure-ad-inloggen.md#gecontroleerd).

Ook bevestigd: een volledige herinstallatie (nieuwe native build) behield de sessie via de Keychain — de app opende direct op het opdrachtenscherm, zonder opnieuw in te loggen.

**Nog niet gecontroleerd:**

- een geweigerde refresh-token toont het loginscherm met uitleg;
- vliegtuigmodus na het openen logt niet uit;
- Android (de config-plugin is niet gebouwd of getest op dit platform).

## Slice 2: synchronisatie van referentiedata (mechanisme klaar)

Gereed: domein `reference-data` — `client-sync/schema/{taal}` en `/{entiteit}/{taal}`, hervatbare batch (één "sinds"-datum, geen per-entiteit-datum: de oude app had die ook niet), taalcode per taal ([ADR 0013](decisions/0013-referentiedata-sync.md)). Bij het overnemen bleek de oude sync een blijvend-verlies-bug te hebben (de datum werd te vroeg vastgelegd); de nieuwe versie is er expliciet tegen getest. Een gewone (niet-beveiligde) device-opslag kwam erbij (`expo-sqlite/kv-store`, [ADR 0006](decisions/0006-opslag.md)). De container start een sync op de achtergrond zodra er een sessie is (inloggen of herstart bij app-start). Bij uitloggen blijft de syncdatum staan zodat de volgende login alleen wijzigingen vraagt; een half afgemaakte pending-batch wordt wel afgebroken.

Op een toestel bevestigd (iOS-simulator, 22 september 2026): na het herstarten van een bestaande sessie ging er een echte, geauthenticeerde aanvraag naar `/api/client-sync/schema/1033` op de tst-backend — het toestel stond op Engels, dus dat bevestigt ook dat de taalcode uit de systeemtaal komt. De inhoud van het antwoord (welke entiteiten, of ze succesvol opgeslagen zijn) is niet gecontroleerd: er is geen scherm dat dat op dit moment laat zien.

**Nog niet gebouwd (bewust, hoort bij slice 3):** een voortgangsscherm. De oude `SynchronizeScreen` combineert sync met de hele onboarding-navigatie (taalkeuze, toestemmingsschermen, doorsturen naar de eenheidkeuze); die beslissingen horen bij onboarding, niet bij het sync-mechanisme zelf.

**Nog niet gecontroleerd:** of de synchronisatie daadwerkelijk entiteiten binnenhaalt en opslaat (er is geen scherm om dat te zien; alleen het verzoek zelf is bevestigd).

## Slice 3: onboarding en eenheid (extern en intern klaar, QR niet)

Gereed voor externe én interne bergers ([ADR 0014](decisions/0014-onboarding-en-eenheid.md)): `allocation-unit` kreeg een registratiescherm (kenteken, vier beschikbaarheidsschakelaars, eindtijd — de 24-uursgrens en het verleden gebruiken de al bestaande regels), `GET/POST/PATCH /api/allocation-units*`, en `decideReregister` (letterlijk overgenomen van `useForceUserReregister`). Interne bergers kiezen in plaats van een kenteken een trekker (verplicht) en optioneel een aanhanger uit de vloot (`dn_fleets`) — die lijst komt uit de generieke `reference-data`-sync van slice 2, niet uit een aparte API. Het nieuwe domein `onboarding` heeft geen aparte "eerste keer"-vlag: `useOnboardingGate` controleert bij elke start of de huidige eenheid nog geldig is, en stuurt anders naar het registratiescherm — dus ook een verlopen eenheid, niet alleen een nieuwe berger. "Kenteken opzoeken (RDW)" uit de eerdere versie van deze regel bleek niet te bestaan voor de eigen eenheid (wel voor voertuigen bij een dienst) en is geschrapt.

Bij het live testen bleek de backend registreren of bijwerken van een eenheid te weigeren (400 `ACTIVE_INCIDENT`) zodra een berger al open werk heeft — ook een nog niet geaccepteerde ("pending") opdracht telt daarvoor mee, niet alleen een actieve. `useOnboardingGate` hield tot dan toe alleen rekening met actieve opdrachten; dat is gecorrigeerd (`hasOpenAllocations`, telt actief én pending), en zowel de gate (bij "blocked") als een mislukte registratie tonen nu een duidelijke melding om dispatch te bellen (`showNoUnitDispatchAlert`) in plaats van een kale foutmelding of stilzwijgend niets. Zie [api-contract.md](functioneel/api-contract.md).

**Later teruggedraaid (op verzoek van product):** alleen een actieve opdracht telt weer mee (`hasActiveAllocations`), zoals de oude `useForceUserReregister`. Met alleen opdrachten in afwachting kan de berger van voertuig wisselen. Een verlopen dienst zonder actieve opdracht vraagt alleen een nieuwe eindtijd (`extend-shift` / oude `SetWorkingHours`), geen volledige herregistratie. Of de backend dan nog `ACTIVE_INCIDENT` geeft, staat als [open vraag 32](functioneel/open-vragen.md); gebeurt dat vanuit onboarding, dan zet `reportOpenWork` de berger op het overzicht met een "doorgaan"-melding. Geen geldige eenheid maar wel een actieve opdracht: dezelfde melding i.p.v. alleen "bel dispatch". Uitloggen is geblokkeerd zolang er een actieve opdracht is; zonder actief werk cancelleert `sign-out-guard` eerst de eenheid (`POST .../cancel` met `id`).

**Bewust niet gebouwd:** de QR-sneltoets op dezelfde vlootlijst (`ScanQRTransport`) — dat vraagt cameratoegang (slice 8/10); interne bergers zoeken voorlopig altijd handmatig. "Vorig voertuig onthouden" is een nicetohave uit de oude app die niet is overgenomen. Een aparte "Afmelden"-knop in instellingen bestaat niet: afmelden zit in vrijwillig uitloggen.

**Op een toestel gecontroleerd:** beide registratieschermen (kenteken/vloot, beschikbaarheid, eindtijd) en de gate, met echte data uit de tst-sync.

## Slice 4: opdrachtenlijst compleet (gebouwd)

Kaarten met acties ([ADR 0015](decisions/0015-opdrachtenlijst-acties.md)): accepteren
(`PUT .../accept`, met dezelfde eenheid-hercontrole als de oude app vóór elke acceptatie, niet
alleen bij opstarten), afwijzen (`PUT .../decline`, met redenen uit de generieke
`dn_allocation_statuscode`-referentiedata en geblokkeerd zolang een dienst actief in behandeling
is), afronden (dezelfde afwijs-oproep met een vaste code), en de voertuigafgifte-lijst
(`GET /api/vehicle-releases/locations` + `/{id}/assignments`). Verversen gebeurt bij terugkomen op
dit scherm (niet letterlijk bij elke app-voorgrond — dat was een verkeerde eerdere aanname, zie ADR 0015) en via pull-to-refresh.

**Twee correcties op deze roadmap-tekst zelf:** de "500 m-bevestiging" hoorde hier niet thuis — dat
is een dienst-acceptatie-regel (slice 5), niet iets bij het accepteren van een hele opdracht. En
"verversen bij terugkeer naar de voorgrond" was de oude app's eigen mechanisme niet (dat is
scherm-focus, geen `AppState`).

**Bewust niet gebouwd:** "Preview" (leest diensten/PLTR read-only; die schermen bestaan pas in
slice 5/7), en het openen van een voertuigafgifte (leidt in de oude app naar de verwerkingsflow die
het team zelf herbouwt).

**Nog niet gecontroleerd op een toestel:** geen opdrachten of voertuigafgiftes beschikbaar op het
testaccount om de knoppen en de lijst mee te vullen; alleen de lege staat en de vloot/beschikbaarheid-achtige
netwerkaanroepen zijn bevestigd te werken zonder te crashen.

## Slice 5: incident en diensten (gebouwd)

Een geaccepteerde opdracht is nu aantikbaar en opent `ServicesScreen`
([ADR 0016](decisions/0016-diensten-en-locatie.md)): twee secties (actief/wachtend, een afgeronde
dienst blijft zichtbaar in "actief"), `hydrateServices` haalt bij het openen de volledige diensten
op. Accepteren van een wachtende dienst doet nu de 500 m-check die in slice 4 hierheen is
gecorrigeerd: `location` kreeg zijn eerste apparaat-laag (`expo-location`, kale versie — de nettere
permissietekst en uitleg zijn nog steeds slice 10), en de drie bevestigingen (geen locatie, doel
onbekend, te ver weg) werken echt.

**Bewust niet gebouwd:** het openen van een dienst zelf (de knop "Preview", en het aantikken van een
actieve dienst) — dat navigeert in de oude app naar de verwerkingsflow die het team zelf herbouwt.
RDW-verrijking van voertuiggegevens op de kaart is niet meegenomen.

**Nog niet gecontroleerd op een toestel:** geen diensten beschikbaar op het testaccount; alleen dat
het scherm laadt en niet crasht is te controleren zonder een opdracht met echte diensten.

## Slice 6: de naad naar verwerken, en overdragen (gebouwd)

`resolveProcessingExit`/`getExitTarget` (`services`, al sinds slice 0 pure regels) zijn aangesloten
op echte navigatie ([ADR 0018](decisions/0018-verwerken-naad-en-overdragen.md)): een actieve dienst
aantikken haalt hem eerst vers op en verlaat het scherm meteen als hij niet meer verstuurd mag
worden (`blocked`, ported van `ProcessingServiceWrapper`'s eigen effect); staat hij al op
HULPVERLENING_AFGEROND, dan opent `ServiceFinishScreen` — de naad van `ProcessingFinishedWrapper`,
met precies het ene signaal dat die naad ook had. Een wachtende opdracht kan nu ook worden
overgedragen aan een collega (`ReassignScreen`, nieuw domein `worker` voor
`dn_canforwardallocationcode`) in plaats van geaccepteerd of afgewezen. Postcode controleren
(`POST /api/check/zipcode`) is toegevoegd als kale, geteste API-functie.

**Twee correcties op deze roadmap-tekst zelf:** "overdragen aan een collega" hoort niet bij
verwerken maar bij de opdrachtenlijst (de knop staat op de kaart van een wachtende opdracht, niet
diep in een dienst) — en `GET /api/workers` stond al bij slice 3 genoemd maar is daar nooit gebouwd
(slice 3 ging over de eenheid, niet de medewerker); dat is hier alsnog gedaan.

**Later vervangen (slice 12):** actieve diensten openen nu `ServiceFormScreen` via `useOpenService`
in plaats van een "nog gebouwd"-melding. `POST /api/incidents/{id}` (incident bijwerken) hoort bij
de verwerkingsflow en is (nog) niet gebouwd. De PLTR-variant van het dienstenscherm kwam in slice 7.

**Nog niet gecontroleerd op een toestel:** geen wachtende opdracht met `canForward` en geen dienst
op HULPVERLENING_AFGEROND beschikbaar op het testaccount; alleen dat de nieuwe schermen laden en
niet crashen is te controleren.

## Slice 7: PLTR (gebouwd)

Een planbaar transport (type 1012 én 1030) opent een eigen scherm ([ADR 0019](decisions/0019-pltr.md)):
twee kaarten, laadadres en afleveradres, met een vinkje zodra die fase klaar is. De knop onderaan
volgt de status: accepteren, starten met laden, starten met afleveren, of — bij
HULPVERLENING_AFGEROND — het afsluitscherm uit slice 6. Afronden vanaf dat scherm eindigt op de
opdrachtenlijst; na de laadfase kom je terug op dit scherm. Op de opdrachtenlijst heeft de kaart
een PLTR-label.

Laden en afleveren openen sinds slice 12 hetzelfde `ServiceFormScreen` als een gewone dienst.
"Preview" (zelfde scherm, alleen lezen) is niet meegenomen.

**Nog niet gecontroleerd op een toestel:** geen PLTR op het testaccount.

## Slice 8: foto's, camera, handtekening (scherm en wachtrij gebouwd)

Nieuwe fotostroom ([ADR 0020](decisions/0020-fotos.md)): één lijst per dienst, `isExtra` pas bij
uploaden, fase 2 als vergelijking met laadfoto's, wachtrij die een mislukte upload bewaart en
hervat. Knop "Foto's" op het dienst- en PLTR-scherm. Camera met `expo-camera` (kale systeemvraag).

**Bewust niet gebouwd:** handtekening (`POST /api/signatures`), verplichte types uit de
formulierdefinitie (komen met het team-formulier).

**Nog niet gecontroleerd op een toestel:** camera vraagt een nieuwe native build.

## Slice 9: push-notificaties (gebouwd; native FCM + Notifee, echt bericht nog niet)

Registratie van het apparaat (`POST /api/workers/register` met het FCM-token), ontvangst in
voorgrond, achtergrond en bij koude start (`initial`), banner (Notifee) en navigatie naar de
opdrachtenlijst bij een tik. FCM + Notifee ([ADR 0017](decisions/0017-push-notificaties.md)). De
effecten van een bericht lopen via de al bestaande handler naar de Query-cache. Een geweigerde
permissie is een nette staat: de app blijft werken en registreert niet.

**Op een toestel gecontroleerd:** native rebuild met React Native Firebase en Notifee. De app
opent op het inlogscherm. Firebase-configbestanden zijn gitignored.

**Nog niet:** een echt bericht op een fysiek toestel. Dat vraagt geldige Firebase-configuratie
en een backend die FCM-tokens verstuurt — zie [open vraag 21](functioneel/open-vragen.md). De
permissie-uitleg en het instellingenscherm horen bij slice 10.

## Slice 10: locatie en permissies (gebouwd)

Instellingenscherm ([ADR 0021](decisions/0021-instellingen-en-toestemmingen.md)): locatie, meldingen
en camera, met uitleg. Is de systeemdialoog na een weigering niet meer te tonen, dan opent de app
de systeeminstellingen. De 500 m-check blijft de drie bevestigingen (geen positie, geen doel, te
ver). Live positie naar de backend niet ([open vraag 14](functioneel/open-vragen.md)). Eenheid
afmelden zit in vrijwillig uitloggen (`POST .../cancel` met `id`; open vraag 23 gesloten).

**Nog niet gecontroleerd op een toestel:** de systeemdialogen en de terugkeer uit de instellingen.

## Slice 11: offline, support en release (deels gebouwd)

Gereed ([ADR 0022](decisions/0022-offline-en-support.md)): uitgaande wachtrij voor bevestigde mutaties
(afronden, afwijzen, opdracht accepteren, dienst accepteren). Tijdelijke fouten blijven aan het
hoofd en gaan later weg; een harde 4xx blokkeert de rest niet. Geslaagde Query-resultaten worden
bewaard en bij een herstelde sessie teruggezet. Uitloggen wist wachtrij en cache. Support deelt het
log van de laatste dag via het systeem; de tekst komt uit `formatLogExport` en is al geredigeerd.

**Bewust niet gebouwd:** monitoring (Sentry, [open vraag 15](functioneel/open-vragen.md)),
store-listing en productie-release ([open vraag 10](functioneel/open-vragen.md),
[ADR 0009](decisions/0009-varianten-en-bundle-ids.md)), component-tests (`jest-expo`,
[ADR 0003](decisions/0003-vitest-in-node.md)) en Maestro. Een productiebuild is niet op acceptatie
getest.

**Klaar als:** een afronding zonder verbinding blijft staan en gaat later weg (getest); support
krijgt een log zonder persoonsgegevens (het exportpad). De acceptatie "productiebuild getest" is
niet gehaald.

## Slice 12: formulierschema, basisvelden en het scherm (gebouwd)

Gereed ([ADR 0023](decisions/0023-serviceform.md)): het scherm `ServiceFormScreen` op
`/allocations/[id]/services/[serviceId]/form`, geopend vanaf een actieve dienst en vanaf de laad- en
afleverknop van het PLTR-scherm (beide via `useOpenService`). Het schema komt uit de
gesynchroniseerde referentiedata: `service-form` doorzoekt alle entiteiten (`listEntities`) op
`dataDefinition` + `servicecode` — bewust geen vaste naam, zodat nieuwe sync-entiteiten zonder
app-update werken ([besluit 25](functioneel/open-vragen.md)). Tekst, tekstvak, getal, decimaal, telefoon (met
belknop), datum (alleen tonen, [open vraag 27](functioneel/open-vragen.md)) en alleen-lezen velden;
een onbekend type toont een melding. Header met dienstnaam, fase en voortgang; secties met
voortgangscirkel en foutenteller; "Volgende" springt naar het eerstvolgende lege verplichte veld.
Verzenden: `PUT /api/services/{id}` ([open vraag 26](functioneel/open-vragen.md)), daarna
`useProcessingExit` met `trigger: 'submit'`. Een mislukte verzending houdt het formulier open met
"opnieuw proberen". De container-test dekt schema vinden, depots op afstand en versturen.

**Nog niet gecontroleerd:** de voorwaarden bij de handtekening (slice 16) blokkeren versturen nog
niet. Verplichte foto's geven sinds slice 17 één bevestiging. Niet op een toestel of met een echt
schema getest; de schermlogica heeft geen componenttests ([ADR 0003](decisions/0003-vitest-in-node.md)).

- **Klaar als:** een dienst met een schema van alleen ondersteunde veldtypes kan volledig worden
  ingevuld, gevalideerd en verstuurd, met de juiste status na afronden.

## Slice 13: selectvelden (gebouwd)

Gereed: `useServiceFormSelectOption` met een keuzelijst (zoekveld bij `autocomplete`, vanaf twee
tekens). De regels staan puur in `service-form/domain/select-options.ts` en zijn getest: land
(Nederland, België, Duitsland eerst, [open vraag 29](functioneel/open-vragen.md)), locatie/depot op
afstand als er een positie is, anders de bronvolgorde; autotype alleen van het gekozen merk (zonder
merk een melding); verzekeraar/leasemaatschappij bewaart `accountid` naast het label; gewone
optionsets inclusief waarde 0; true/false en optioneel ja/nee als schakelaar (drie standen als het
veld optioneel is). Elke keuze draagt zijn eigen CRM-waarde, ook bij twee rijen met hetzelfde label.

**Nog niet gecontroleerd:** "klaar als" vraagt om elk select-veld in een echt schema; dat kan pas met
een gesynchroniseerd schema van tst.

- **Klaar als:** elk select-veld in een echt schema opent de juiste lijst met de juiste labels en
  slaat de juiste CRM-waarde op. Een ander merk kiezen wist het gekozen type via
  `dependencies.required`.

## Slice 14: kenteken en RDW (gebouwd)

Gereed: herbruikbaar domein `rdw` (`GET /api/check/rdw/registrationnumber/{plate}`, matching
land/merk/type) plus formuliergroep met vaste veldvolgorde. Bij een geldig NL-kenteken (6 tekens)
autofill; bij mislukte lookup worden land/merk/type runtime-verplicht en verdwijnen de
RDW-readonlyvelden. Kentekenregels komen uit `allocation-unit` (geen duplicaat).

**Op een toestel gecontroleerd** (25 september 2026): een echt kenteken op tst levert RDW-data
(merk/type/kleur) en vult de formuliergroep.

- **Klaar als:** een kenteken invullen vult de RDW-velden automatisch, inclusief wat er gebeurt als
  RDW niets teruggeeft.

## Slice 15: adres zoeken (gebouwd)

Gereed: herbruikbaar `places`-domein — HTTP-client, pure `toStructuredAddress`, `PlacesProvider`,
`PlaceSearchControl` / `AddressSearchSheet` via `places/ui.ts` (multi-insertbaar op elk scherm).
Service-form houdt alleen de CRM-adapter (`buildAddressPlaceAnswers`). Zonder API-sleutel blijft
het veld gewone tekst (geen zoekknop).

**Nog niet gecontroleerd:** echte Places-sleutel en tst-schema op toestel.

- **Klaar als:** een adres zoeken en kiezen vult de bijbehorende velden.

## Slice 16: handtekening (gebouwd)

Gereed: herbruikbaar `signatures`-domein (`POST /api/signatures`, 409 = al verwerkt),
full-screen native pad via `react-native-signature-ink` (geen WebView: zichtbare inkt op oude
Android), JPEG-export met witte achtergrond, thumbnail na vastleggen én in overzicht, naam/e-mail/
schakelaars, upload vóór `PUT` service. `react-native-signature-canvas` + `react-native-webview`
zijn verwijderd.

**Nog niet gecontroleerd:** echte teken-/uploadflow op oude én nieuwe Android/iOS-toestellen en
upload op tst.

Toestelchecklist: tekenen, undo, wissen, leeg opslaan geweigerd, thumbnail zichtbaar, concept heropent
thumbnail, upload op tst.

- **Klaar als:** een handtekening wordt vastgelegd, correct meegestuurd bij versturen, en de
  schakelaars werken zoals in de motor getest is.

## Slice 17: foto's, concept-opslag en afwijzen (gebouwd)

Gereed: verplichte foto's via het bestaande `photos`-domein (slice 8) — vóór versturen één
bevestiging ("Foto's toevoegen" / "Toch versturen", [bekende fout 39](functioneel/bekende-fouten-oude-app.md)).
Concept-opslag: laden bij openen, bewaren bij verlaten, wissen na versturen of resetten. Dienst
afwijzen vanuit dit scherm (futile ride / terug naar TP) en een resetknop.

**Nog niet gecontroleerd:** scherminteractie heeft geen componenttest; niet op een toestel
gevalideerd met een echt schema.

- **Klaar als:** verplichte foto's zonder lokale foto tonen de bevestigingsdialoog; een halverwege
  verlaten formulier staat er bij terugkomst weer zoals het was.

## Slice 18: opruimen (gebouwd)

Gereed: de "dit onderdeel wordt nog gebouwd"-melding op een actieve dienst en de PLTR-knop is in
slice 12 vervangen door het formulier. `ProcessingService.js`/`ProcessingFinish.js` blijven
ongebruikt in `legacy/`, ter referentie. In `src/` staat die melding nergens meer.

- **Klaar als:** nergens in de app staat nog een melding dat het verwerkingsformulier ontbreekt.

## Slice 19: knoppenbalk opdrachtenlijst (gebouwd)

De vier ontbrekende knoppen uit de oude `NavigationBar` staan weer boven de opdrachtenlijst (GPS,
meldkamer bellen, wagen wisselen, meldingenbel); het tandwiel blijft in de header. GPS toont status
en coordinaten; meldkamer belt het vaste nummer (zonder de oude `+0`-fout) en biedt interne
bergers support; wagen wisselen gebruikt `decideReregister`/`decideChangeVehicle` en opent
`/unit` (of `/unit?mode=extend` bij alleen een verlopen eindtijd); de bel bewaart pushberichten in
een historie (max 100) en opent `/notifications`.

**Bewust anders:** bij een actieve opdracht geen stille navigatie naar registratie (backend `ACTIVE_INCIDENT`);
geen aparte locatie-disclosure-route (open vraag 31).

- **Klaar als:** de vier knoppen werken op het opdrachtenscherm; een pushbericht verschijnt in de
  historie en verdwijnt bij uitloggen (container-test).

## Doorlopend

Elke slice werkt [flows](functioneel/flows.md), [statussen](functioneel/statussen.md), [API-contract](functioneel/api-contract.md) en de [open vragen](functioneel/open-vragen.md) bij, en voegt zijn regressietests voor oude fouten toe aan [bekende-fouten-oude-app.md](functioneel/bekende-fouten-oude-app.md).

### Reconciliation bij ambigu mislukte submits (open)

Voorkom dubbele submits en onterechte foutmeldingen wanneer VRS een mutatie al heeft
verwerkt, maar de app geen succesvolle response ontvangt. Onderzoek eerst het gedrag van
de oude app en leg de bekende gevallen, waaronder `BERG-2026019593`, vast als
regressietest. Haal na iedere submitfout de actuele serverstatus op en vergelijk die met de
beoogde status. Herhaal deze controle met oplopende wachttijden, omdat een verwerkte mutatie
mogelijk vertraagd zichtbaar wordt. Behandel een match als succes; toon de oorspronkelijke
fout pas wanneer de serverstatus na alle controles niet overeenkomt. Blokkeer een volgende
submit gedurende zowel de mutatie als de volledige reconciliation. Log bij een echte fout de
geredigeerde HTTP-status, timeout- en netwerkclassificatie en serverboodschap via de logger.
Leg onbekende backendvelden en de mogelijkheid van een expliciete `already processed`- of
HTTP 409-response vast in [open vragen](functioneel/open-vragen.md); verzin geen contract.

- **Klaar als:** tests eerst de succesvolle verwerking na iedere soort submitfout, een echt
  mislukte verwerking, vertraagde statuszichtbaarheid, dubbele tikken en een submit tijdens
  reconciliation afdekken; de implementatie voor alle submitfouten reconcileert; de actie tot
  en met de laatste controle geblokkeerd blijft; volledige geredigeerde foutdetails worden
  gelogd; de functionele documentatie is bijgewerkt; en `pnpm run ci` slaagt.
