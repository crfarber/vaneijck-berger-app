# Uitwerkplan — Centrale locatievoorziening

|                 |                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Status          | Voorstel; nog niet geïmplementeerd                                                             |
| Datum           | 20-10-2026                                                                                     |
| Raakt           | `location`, `allocations`, `photos`, `standby-location`, `service-form`, `settings`, bootstrap |
| Onderzoeksbasis | Werkboom op commit `631fa807`, inclusief de nog niet gecommitte kaartfunctionaliteit           |
| Doel            | Stabiele GPS-status, hergebruik van metingen en begrensd batterijgebruik                       |

## 1. Resultaat en afbakening

We bouwen het bestaande `location`-domein uit tot de enige eigenaar van de actuele
locatietoestand en de aansturing van apparaatmetingen. Andere domeinen vragen een locatie
met passende kwaliteitseisen of lezen de gedeelde toestand. Zij beheren geen eigen GPS-timer,
cache of native watch.

De gebruiker merkt daarvan:

- een tijdelijke leesfout laat de laatst bekende locatie niet verdwijnen;
- kaart, toolbar en GPS-sheet spreken elkaar niet tegen;
- een nieuwe scherminstantie hoeft niet opnieuw vanaf een lege GPS-status te beginnen;
- dienstacceptatie en standby-controle werken ook zonder vooraf geopende detailpagina;
- metingen stoppen wanneer er geen actieve behoefte is of de app naar de achtergrond gaat.

Deze wijziging introduceert geen achtergrondtracking, routehistorie, periodieke GPS-posts
naar de backend, nieuwe dependencies of opslag van de actuele positie op schijf.
Foto's blijven hun bestaande, versleuteld opgeslagen coördinaat houden.

Het plan stelt geen batterijbesparing in procenten vast: die is nog niet gemeten.
Alleen dit plan wordt nu toegevoegd; bestaande werkboomwijzigingen blijven onaangeraakt.

## 2. Bestaand gedrag dat behouden blijft

| Onderdeel               | Te behouden afspraak                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dienstacceptatie        | Afstand kleiner dan 500 meter gaat zonder afstandsbevestiging door; vanaf 500 meter volgt bevestiging. Onbekende huidige positie of onbekend doel houdt de bestaande bevestigingsroute.          |
| Acceptatiemeting        | Maximaal 5 seconden oud, horizontale onzekerheid kleiner dan 500 meter, maximaal 10 seconden wachten. Deze regels zijn geen veiligheidswaarborg dat de werkelijke positie binnen 500 meter ligt. |
| Doelkeuze               | De bestaande dienst- en PLTR-regels blijven leidend; geen wijzigingen aan CRM-velden of statuscodes.                                                                                             |
| Foto's                  | De locatie wordt bij verzenden gekoppeld, niet bij opname. De camera blijft onafhankelijk van GPS reageren. Een gekoppelde fotocoördinaat wordt bij uploadretry niet opnieuw bepaald.            |
| Ontbrekende fotolocatie | De normale verzendactie toont de bestaande fout/herstelactie. De bestaande wachtrij blijft foto's zonder locatie behouden en later opnieuw proberen.                                             |
| Simulator               | De bestaande foto-only ontwikkelfallback blijft gescheiden van echte GPS-status en dienstacceptatie.                                                                                             |
| Depotkeuze              | Grove locatie is voldoende; geen verplichte nauwkeurige GPS-fix om opties te tonen.                                                                                                              |
| Kaart                   | Blijft zonder GPS te openen. Opdrachtmarkers, acceptatieflow en handmatige camerabewegingen blijven werken. Nieuwe GPS-metingen trekken de kaart niet telkens opnieuw naar de gebruiker.         |
| Toestemmingen           | De bestaande disclosure, systeemdialoog en instellingenroute blijven bestaan. Deze refactor verandert niet stilzwijgend wanneer toestemming mag worden gevraagd.                                 |

Bronnen: [locatiewiki](../wiki/locatie.md), [fotowiki](../wiki/fotos.md),
[toestemmingen](../wiki/toestemmingen.md),
[acceptatiegrenzen](../../src/domeinen/location/domain/fresh-sample.ts),
[afstandsbeslissing](../../src/domeinen/location/domain/proximity.ts) en
[doelkeuze](../../src/domeinen/services/domain/target-location.ts).

## 3. Problemen die de implementatie moet oplossen

| ID      | Probleem                                                                                                                                                                            | Bewijs                                                                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GPS-P01 | Iedere `useGpsStatus`-instantie heeft eigen aanvankelijk lege state; succesvolle metingen worden niet gedeeld.                                                                      | [use-gps-status.ts](../../src/domeinen/location/hooks/use-gps-status.ts)                                                                                                                                                                |
| GPS-P02 | Een ongeldige refresh overschrijft een eerder geldige positie. De kaartknop en kaartmarkering kunnen daardoor wisselen of verdwijnen.                                               | [hook](../../src/domeinen/location/hooks/use-gps-status.ts), [kaartknop](../../src/domeinen/allocations/components/allocations-map-button.tsx), [Android-marker](../../src/domeinen/allocations/components/osm-allocations-map-html.ts) |
| GPS-P03 | De kaart start elke 5 seconden een standaard High-lezing, wacht niet op voltooiing en doet bij centreren extra lezingen. Een laat antwoord kan een nieuwere uitkomst overschrijven. | [allocations-map-screen.tsx](../../src/domeinen/allocations/screens/allocations-map-screen.tsx)                                                                                                                                         |
| GPS-P04 | Kaartverversing is aan mount gekoppeld, niet aan focus en appstatus. Een late native watch-start kan een eerdere stop overleven.                                                    | [kaartscherm](../../src/domeinen/allocations/screens/allocations-map-screen.tsx), [Expo-adapter](../../src/domeinen/location/platform/rn/expo-location-reader.ts)                                                                       |
| GPS-P05 | Standby vraagt een verse watch-meting zonder zelf de benodigde watch te starten.                                                                                                    | [standby-banner](../../src/domeinen/standby-location/components/standby-location-banner.tsx)                                                                                                                                            |
| GPS-P06 | Watch-versheid gebruikt callbackontvangst in plaats van de native meettijd; losse lezingen verliezen nauwkeurigheid en meettijd.                                                    | [Expo-adapter](../../src/domeinen/location/platform/rn/expo-location-reader.ts)                                                                                                                                                         |
| GPS-P07 | De adapter krijgt geen logger; toestemming wordt los van GPS-status bijgehouden en kaartindicatoren hanteren verschillende betekenissen.                                            | [native bootstrap](../../src/bootstrap/native.ts), [GPS-status](../../src/domeinen/location/domain/gps-status.ts), [kaartscherm](../../src/domeinen/allocations/screens/allocations-map-screen.tsx)                                     |
| GPS-P08 | Meerdere vervangingsfoto's vragen tijdens één verzendactie elk opnieuw een locatie.                                                                                                 | [foto-overzicht](../../src/domeinen/photos/screens/photo-overview-screen.tsx)                                                                                                                                                           |

Dit zijn bevindingen uit broncodeonderzoek. De frequentie van knipperen en het daadwerkelijke
energiegebruik moeten nog op toestellen worden vastgesteld.

## 4. Doelarchitectuur

```text
Toolbar / kaart / GPS-sheet ───────────────► gedeelde location-store
             │                                        ▲
             └── vraag volgen/verversen ──► LocationService
Dienst / standby / foto's / depot ────────►      │
                                               ▼
                                       native locatiepoort
                                               │
                                               ▼
                                           expo-location

Bootstrap koppelt service, store, permissiepoort, klok, scheduler en logger.
Bootstrap geeft ook appstatus en sessiebeëindiging door.
```

### 4.1 Verantwoordelijkheden en laaggrenzen

- **`domain/`**: metingstypen, validatie, versheid, kwaliteitseisen en presentatiestatus.
  Hergebruik de bestaande afstands- en doelregels.
- **`service/`**: één coördinator voor aanvragen, cachehergebruik, time-outs, actieve
  afnemers en starten/stoppen of herconfigureren van de apparaatbron.
- **`store/`**: één met een fabriek gemaakte vanilla Zustand-store voor client-state.
  Geen tweede metingcache in hooks of in de adapter.
- **`platform/rn/`**: dunne Expo-adapter die native metingen inclusief meettijd en
  nauwkeurigheid doorgeeft en subscriptions correct opruimt.
- **`hooks/`**: selectors en focusregistratie; geen GPS-polling of lokale kopie van de
  gedeelde positie. Alleen presentatiedetails zoals een geopende sheet blijven lokaal.
- **`bootstrap/`**: maakt onderdelen en verbindt appstatus, sessie, foutenlog en providers.
  De service importeert geen hogere storelaag: toegang tot de ene toestand gaat via
  een kleine, getypeerde poort die bootstrap op de store aansluit.

De bestaande permissiepoort blijft de enige toegang voor lezen, aanvragen en openen van
systeeminstellingen. Er komt geen tweede permissiemodel met eigen native systeemdialogen.
De locatieadapter rapporteert daarnaast of locatieservices beschikbaar zijn.

Andere domeinen gebruiken uitsluitend `location/index.ts` of `location/ui.ts`.
Geen globals, module-singletons, React Native in de servicelaag of `getState()` in domeinregels.

### 4.2 Gedeelde toestand

De toestand onderscheidt:

- `lastKnown`: geldige coördinaat, native meettijd en horizontale nauwkeurigheid, of
  `null` zolang er geen geldige meting is;
- permissiestatus, inclusief aanvankelijk nog niet ingelezen;
- beschikbaarheid van locatieservices, inclusief onbekend;
- of de bron actief is en of een expliciete verversing loopt;
- de laatste verwachte mislukking, zoals weigering, uitgeschakelde locatieservices,
  onvoldoende kwaliteit of time-out.

Regels:

1. Starten of mislukken van een refresh wist `lastKnown` niet.
2. Een ongeldige of oudere meting overschrijft een nieuwere geldige meting niet.
3. Versheid gebruikt de native meettijd, niet het tijdstip waarop JavaScript een callback
   ontvangt. Ongeldige coördinaten, nauwkeurigheid en tijdstempels worden afgewezen.
4. Een bewaarde positie is niet automatisch geschikt voor een nieuwe actie.
   Iedere actie toetst leeftijd en nauwkeurigheid opnieuw.
5. Intrekken van toestemming of uitgeschakelde locatieservices is direct zichtbaar;
   een bewaarde positie mag niet als actieve GPS of toestemming worden gepresenteerd.
6. Leeftijd kan ook zonder nieuwe GPS-callback verlopen. Plan daarvoor met `Scheduler`
   een statusovergang bij de relevante grens, geen extra GPS-read alleen om een label bij te werken.
7. Uitloggen wist de actuele toestand en annuleert aanvragen. Late resultaten uit de oude
   sessie mogen de toestand niet herstellen. Een achtergrondovergang bewaart `lastKnown`,
   maar beëindigt actief meten.

### 4.3 Publiek contract

Werk met een beperkt aantal benoemde gebruiksprofielen, geen vrij instelbare GPS-opties
voor ieder scherm. Het concrete TypeScript-contract wordt in de eerste implementatiestap
vastgelegd met de afnemertests.

De voorziening ondersteunt:

- een meting aanvragen voor een profiel, met een expliciete getypeerde uitkomst;
- volgen aanvragen, met een idempotente releasefunctie per afnemer;
- appstatus doorgeven en de huidige sessie opruimen;
- de gedeelde toestand lezen via de provider en selectors.

Verwachte GPS-uitkomsten zijn een `Result`. Onverwachte adapterfouten worden via de
bestaande logger zichtbaar gemaakt en volgens de repositoryconventies afgehandeld.
Geen brede catch die iedere fout zonder onderscheid verandert in "geen locatie".

Een tijdelijke compatibiliteitsadapter naar `LocationReader` is toegestaan tijdens migratie,
maar bevat geen eigen cache of meetlogica en verdwijnt zodra alle afnemers zijn aangesloten.

## 5. Meetbeleid en batterijgebruik

| Gebruik                     | Voorgesteld beleid                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Toolbar/status              | Passief de gedeelde toestand lezen. Bij focus of terugkeer naar de voorgrond alleen een begrensde gedeelde refresh wanneer nodig; geen eigen timer of blijvende watch.                                                               |
| Zichtbare kaart             | `Balanced` volgen zolang kaartfocus én actieve app gelden. Startvoorstel: 5 seconden als Android-minimuminterval en 10 meter bewegingsfilter; dit zijn geen gegarandeerde callbackintervallen op beide platformen.                   |
| Dienstacceptatie            | Bestaande kwaliteitseisen behouden: leeftijd maximaal 5 seconden, onzekerheid kleiner dan 500 meter, deadline 10 seconden. De aanvraag zorgt zelf voor een bron wanneer die nog niet loopt.                                          |
| Standby-aankomst            | Dezelfde meetkwaliteit als de bestaande controle. Op focus, relevant nieuw advies en terugkeer naar de voorgrond één gedeelde aanvraag; niet twee aanvragen door overlappende effecten. Geen continue aankomsttracking introduceren. |
| Foto's verzenden            | Bestaande fine-intentie behouden. Eén meting voor de nog locatievrije doelen van één verzendactie, inclusief vervangingsfoto's. In de eerste versie geen willekeurige oude kaartcache als fotolocatie gebruiken.                     |
| Depot sorteren              | Grove aanvraag; een gelijktijdige geschikte meting hergebruiken. Geen nieuwe langlevende depotcache of gewijzigde sorteervoorwaarden nodig.                                                                                          |
| Geen afnemers / achtergrond | Geen app-watch, geen geplande GPS-refresh en geen nieuwe GPS-read vanuit de fotowachtrij. Locatievrije uploads blijven wachten tot de app weer actief is.                                                                            |

De parameters voor kaartvolgen zijn meetbare startwaarden, geen bewezen energieoptimum.
Een bewegingsfilter kan bij stilstand updates onderdrukken; dienstacceptatie moet daarom
zelf een nieuwe meting kunnen verkrijgen wanneer de vorige inmiddels te oud is.

### 5.1 Gelijktijdigheid, deadlines en annuleren

- Maximaal één app-beheerde native watch tegelijk.
- Compatibele aanvragen delen één acquisitie, maar houden hun eigen kwaliteitseisen en
  deadline. Een kaartmeting keurt niet automatisch een striktere acceptatieaanvraag goed.
- Bij hogere eisen tijdelijk de gedeelde bron aanpassen; na afloop terug naar wat de
  resterende afnemers nodig hebben.
- Een verlopen aanvraag laat geen listeners of timers achter. Een losgelaten afnemer
  stopt geen bron die nog door een andere afnemer nodig is.
- Gebruik waar nodig een tijdelijk watch-abonnement met expliciete cleanup voor begrensde
  acquisitie. Alleen een `Promise.race` rond een niet-annuleerbare native one-shot is niet
  voldoende: de native activiteit moet ook echt worden beëindigd.
- Controleer na iedere asynchrone watch-start of de aanvraaggeneratie en appstatus nog
  geldig zijn. Zo niet, verwijder de zojuist verkregen subscription onmiddellijk.
- Eén beheerder bepaalt het actuele bronprofiel; laat schermen niet onafhankelijk
  nauwkeurigheid verhogen of na een fout een nieuwe watch starten.

### 5.2 iOS-kaartbron

Apple Maps toont momenteel zijn eigen native locatiepunt; Android tekent de gedeelde
coördinaat. Dat zijn verschillende bronnen.

In de kaartmigratie wordt expliciet gekozen tussen:

1. op beide platformen de centrale positie tekenen, met behoud van herkenbaarheid en
   bereikbaarheid van de eigen positie; of
2. de native iOS-locatielaag behouden, maar de extra native activiteit en mogelijke
   verschillen met de banner documenteren en meten.

Voorkeur is optie 1 voor één app-brede waarheid. Verifieer eerst of de gebruikte
`expo-maps`-versie die presentatie zonder UX-verlies ondersteunt. Claim niet dat er
app-breed één native locatiebron is zolang de onafhankelijke Apple Maps-laag actief blijft.

## 6. Migratie per afnemer

| Afnemer                      | Wijziging                                                                                                                                                                                    | Regressiegrens                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolbar, banner en GPS-sheet | Eén gedeelde hook/store. Toestemming, actualiteit en beschikbaarheid consistent afleiden. Knoppen niet verbergen omdat een refresh loopt.                                                    | Kaart blijft te openen zonder fix. Toestemming mag niet als geldige meting worden weergegeven.                                               |
| Kaartscherm                  | Vijfsecondenpolling, eigen permissieboolean en dubbele center-lezing verwijderen. Volgen via focusregistratie; centreren gebruikt de uitkomst van één aanvraag.                              | Geen nieuwe camera-jumps, geen verdwijnend Android-punt bij tijdelijke fout, correcte permissie na terugkeer uit instellingen.               |
| Dienstenscherm en PLTR       | Handmatig `start/stop` vervangen door centrale afnemerregistratie. Behoud focusgebonden Balanced-voorbereiding in de eerste migratie; de acceptatieaanvraag blijft ook zelfstandig werken.   | Drempels, doelkeuze en bevestigingen blijven gelijk; timeout annuleert de meting, niet de opdracht of sessie.                                |
| Standby                      | Eén lifecycle-triggerpad voor de locatieaanvraag; focus/foreground combineren en dedupliceren. Meting kan zelfstandig starten.                                                               | Alleen het nog actuele advies wissen bij aankomst; een late uitkomst mag geen inmiddels nieuw advies verwijderen.                            |
| Foto's                       | Locatiekoppeling voor één verzendactie in de fotoservice bundelen, inclusief selectie van gewone concepten en overrides. UI start niet per vervangingsfoto GPS.                              | Reeds gekoppelde coördinaten, fasegrenzen, override-flags, opslag en uploadvolgorde blijven behouden. Een opname blijft zonder GPS mogelijk. |
| Depotkeuze                   | Grove meting via dezelfde voorziening.                                                                                                                                                       | Onbeschikbare GPS mag de keuzelijst niet blokkeren; bestaande fallbacksortering behouden.                                                    |
| Instellingen en bootstrap    | Bestaande permissiepoort aansluiten; bij actieve app opnieuw beschikbaarheid lezen. Bij achtergrond, uitloggen en containerstop bron en aanvragen opruimen. Logger daadwerkelijk aansluiten. | Disclosurevolgorde blijft gelijk; late callbacks herstellen geen beëindigde sessie.                                                          |

De precieze nieuwe kleuren en teksten zijn nog geen vastgesteld productbesluit.
Leg vóór aanpassing van de indicatoren vast wat "toegestaan", "actueel", "laatst bekend"
en "niet beschikbaar" betekenen. Gebruik bestaande UI-tokens en NL/EN-vertaalsleutels.
Een oudere positie mag herkenbaar blijven, maar niet ongemerkt als actuele positie gelden.

## 7. Werkpakketten en volgorde

Elke implementatiestap begint met tests voor het betreffende gedrag.

| Stap | Werk                                                                                                                                | Afhankelijk van | Gereed wanneer                                                                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Contract en nulmeting: alle afnemers inventariseren, profielen en indicatorsemantiek afspreken, bestaande toestelgedrag vastleggen. | —               | Bestaande regels en voorgestelde gedragswijzigingen zijn onderscheiden; iOS-kaartoptie en deadlines voor niet-acceptatieaanvragen zijn expliciet vastgelegd. |
| 2    | Pure metingsvalidatie, kwaliteitselectie en gedeelde toestand; regressietests voor wissen en verouderde resultaten.                 | 1               | Eén eigenaar voor de locatie; fouten behouden `lastKnown`; meettijd bepaalt versheid.                                                                        |
| 3    | Coördinator, native adapter en bootstrap-lifecycle; races, annulering, deduplicatie en logger.                                      | 2               | Eén app-watch, begrensde aanvragen en aantoonbare cleanup bij focusverlies, achtergrond, stop en uitloggen.                                                  |
| 4    | Toolbar, GPS-sheet en kaarten migreren; oude polling en dubbele state verwijderen.                                                  | 3               | Gemeenschappelijke status, stabiel punt en knoppen; centreren doet één aanvraag; geen ongevraagde camera-updates.                                            |
| 5    | Dienstacceptatie, PLTR en standby migreren.                                                                                         | 3               | Bestaande grensgevallen blijven werken; standalone acceptatie en standby hebben geen vooraf gestarte watch nodig.                                            |
| 6    | Foto's en depotkeuze migreren; compatibiliteitslaag en oude locatiepaden opruimen.                                                  | 3, 5            | Alle productieafnemers gebruiken dezelfde voorziening; één acquisitie per fotoverzendactie; geen oude `LocationReader`-logica naast de nieuwe coördinator.   |
| 7    | Integratie, documentatie en toestel-/energievalidatie; kaartprofiel zo nodig bijstellen.                                            | 4, 5, 6         | Acceptatiecriteria uit §8 zijn gecontroleerd en de resterende toestelbeperkingen zijn expliciet gerapporteerd.                                               |

Stappen 4 en 5 zijn functioneel onafhankelijk na stap 3. Voer ze bij voorkeur na elkaar
uit om wijzigingen aan gedeelde bootstrap en publieke exports overzichtelijk te houden.
Geen generiek trackingframework, remote configuratie of featureflagplatform toevoegen.

## 8. Tests en acceptatiecriteria

Gebruik de bestaande fakes voor klok, scheduler en `deferred()`. De native poort krijgt
een fake waarmee starten, leveren, fouten en verwijderen apart bestuurbaar zijn.
Belangrijke logica blijft in Node testbaar; native cleanup wordt aanvullend op een toestel
gecontroleerd. Alleen de pure versheidsfunctie testen is niet voldoende.

| ID      | Scenario en meetbare verwachting                                                                                                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GPS-A01 | Na één geldige meting leveren tien mislukte refreshes geen `lastKnown: null` op. De fout blijft wel zichtbaar; de meting wordt niet verjongd.                                                                                                                                           |
| GPS-A02 | Toolbar en kaart lezen dezelfde meting. Mounten van een extra afnemer maakt de bestaande positie niet leeg en start niet zelfstandig een tweede acquisitie.                                                                                                                             |
| GPS-A03 | Twintig gelijktijdige compatibele aanvragen delen één native acquisitie. Een aanvraag met strengere eisen krijgt niet voortijdig het grovere resultaat.                                                                                                                                 |
| GPS-A04 | Een laat oud resultaat, een ongeldige meting of een fout overschrijft geen nieuwere geldige meting. Een laat resultaat na uitloggen wordt genegeerd.                                                                                                                                    |
| GPS-A05 | `stop/release` tijdens een nog lopende native start verwijdert de late subscription. Herhaald loslaten is veilig. Twee afnemers delen één watch; pas bij de laatste release stopt die.                                                                                                  |
| GPS-A06 | Achtergrond of containerstop laat nul actieve app-subscriptions en nul GPS-acquisitietimers achter. Een gemount maar niet gefocust kaartscherm meet niet zelfstandig door.                                                                                                              |
| GPS-A07 | Acceptatie test leeftijd 5.000 ms tegenover 5.001 ms, onzekerheid net onder 500 tegenover 500 meter, en de bestaande afstandsgrens. Een oude native meting met een nieuwe callback is niet vers. Zonder bruikbare meting volgt uiterlijk na de bestaande deadline de bevestigingsroute. |
| GPS-A08 | Bij stilstand en uitblijvende callbacks wordt een positie op de afgesproken leeftijd herkenbaar "laatst bekend", zonder extra GPS-read voor alleen die labelwijziging.                                                                                                                  |
| GPS-A09 | Standby-aankomst werkt zonder geopende detailpagina. Dubbele lifecycle-events delen één aanvraag. Een oud adviesresultaat wist geen nieuw advies.                                                                                                                                       |
| GPS-A10 | Eén fotoverzendactie met gewone concepten en meerdere overrides gebruikt één acquisitie voor de nog locatievrije doelen. Reeds gekoppelde foto's houden hun coördinaat. Capture vraagt geen GPS; productie gebruikt nooit simulatorcoördinaten.                                         |
| GPS-A11 | Toestemming weigeren/intrekken, locatieservices uitschakelen, opnieuw inschakelen en terugkeer uit instellingen leveren consistente status en herstel zonder appherstart.                                                                                                               |
| GPS-A12 | Android-marker en kaartacties blijven bij tijdelijke meetfouten stabiel. iOS en Android tonen de afgesproken betekenis van actuele en laatst bekende positie. De camera blijft waar de gebruiker hem heeft gezet.                                                                       |
| GPS-A13 | Timeout, bronfout en onvoldoende kwaliteit hebben een herkenbare uitkomst en foutregistratie. Logs bevatten geen coördinaten, adres, fotodata of ruwe native payloads.                                                                                                                  |

Voeg in [container.test.ts](../../src/bootstrap/container.test.ts) de ketens toe voor
gedeelde locatie tussen afnemers, standalone acceptatie, fotoverzending en
sessie-/foreground-lifecycle. Toets de UI-gerelateerde claims via bestaande ondersteunde
componenttests waar mogelijk en expliciete handmatige scenario's waar de huidige
testomgeving geen native rendering ondersteunt.

### 8.1 Validatiecommando's bij implementatie

1. Eerst alleen de gewijzigde locatie-, afnemer- en containertests met Vitest.
2. Daarna `pnpm run ci`; de bestaande coveragegrenzen blijven gelden.
3. Vanwege gewijzigde imports/routes ook een Android-export met
   `EXPO_PUBLIC_API_BASE_URL` gezet op een niet-geheime testwaarde:

   ```sh
   EXPO_PUBLIC_API_BASE_URL=https://example.invalid pnpm exec expo export --platform android
   ```

4. Nieuwe UI-teksten in Nederlands én Engels; architectuur- en i18n-tests moeten slagen.

### 8.2 Toestellen en energie

Vergelijk vóór en na op ten minste één fysiek Android- en één fysiek iOS-toestel:

- 15 minuten opdrachtenoverzicht zonder kaart;
- 15 minuten kaart open bij stilstand;
- 15 minuten kaart tijdens verplaatsing, bediend door een passagier;
- 15 minuten achtergrond na kaartgebruik;
- foto's verzenden en dienst accepteren met goede, grove en ontbrekende GPS.

Houd toestel, buildtype, schermhelderheid en omstandigheden per vergelijking gelijk.
Noteer acquisitieaantal, watchduur, nauwkeurigheidsprofiel, time-outs, hersteltijd en het
beschikbare energieprofiel via Android Studio/Xcode. Log daarvoor geen locaties.
Een korte batterijpercentagevergelijking alleen is onvoldoende bewijs.

Harde criteria: geen automatische High-requests elke vijf seconden op de kaart, nul
app-watchactiviteit op de achtergrond, geen achtergebleven subscription en geen verlies
van een geldige weergavepositie door een tijdelijke fout. Rapporteer energieverbetering
als meetuitkomst, niet vooraf als belofte.

## 9. Documentatie en besluitpunten

Bij implementatie:

- werk [locatie](../wiki/locatie.md), [toestemmingen](../wiki/toestemmingen.md),
  [foto's](../wiki/fotos.md), [standby-locatie](../wiki/standby-locatie.md),
  [stores](../wiki/stores.md) en [architectuur](../architecture.md) bij voor werkelijk
  veranderd gedrag; maak expliciet wat wel en niet op een toestel getest is;
- leg de centrale eigenaar en lifecycle vast in een nieuwe, kort gehouden ADR;
  verwijs naar [ADR 0016](../decisions/0016-diensten-en-locatie.md) en
  [ADR 0031](../decisions/0031-allocations-kaart.md);
- leg gekozen maximale wachttijden voor kaart/foto/depot, de grens voor
  "laatst bekend" en de indicatorsemantiek vast vóór de betreffende implementatiestap;
  dit plan verzint daarvoor geen bestaand productcontract;
- wijzig de foto-afspraak niet: locatie bij opname in plaats van verzenden is een
  afzonderlijk productbesluit, buiten deze refactor.

Er zijn voor deze centrale voorziening geen nieuwe backendvelden of statuscodes nodig.
Ontstaan tijdens uitwerking wel onduidelijkheden over CRM-gedrag, volg dan de bestaande
[open-vragenprocedure](../functioneel/open-vragen.md).
