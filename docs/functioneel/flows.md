# Flows

Een compact overzicht van hoe de gebruiker de app gebruikt. De volledige analyse van de oude app (schermen, stores, API-aanroepen, notificaties, instellingen) staat in het analysedocument, zie [legacy](../legacy.md). Deze pagina beschrijft wat er in de nieuwe app **al werkt** en wat volgt.

## 1. Opstarten en inloggen (werkt)

1. De app leest de configuratie (faalt met een duidelijke melding als die niet klopt) en herstelt de sessie uit de beveiligde opslag. Zolang dat duurt, staat de splash.
2. Geen sessie: keuzescherm op de splash (VRS-gebruiker of externe gebruiker, met versienummer). **Extern (SMS):** land en nummer invullen, "Valideer telefoonnummer", daarna de zes vakjes voor de sms-code en "Inloggen". Is er al een geldige code verstuurd, dan gaat het scherm door naar het codescherm. **Intern:** Azure AD (slice 1).
3. Sessie hersteld of ingelogd: de opdrachtenlijst. De sessie wordt op de achtergrond ververst; bij een niet te redden sessie verschijnt het loginscherm met de uitleg dat de sessie verlopen is.
4. Uitloggen wist de sessie en alle gecachte gegevens.

## 2. Opdrachtenlijst (werkt)

De berger ziet actieve opdrachten (nieuwste eerst) en opdrachten die op acceptatie wachten (op incidentnaam), met type en plaats. Bovenaan staan vier knoppen (GPS-status, meldkamer bellen, wagen wisselen, meldingenbel); het tandwiel blijft in de header. Trek-om-te-verversen, accepteren, afwijzen, overdragen en de voertuigafgifte-lijst werken.

## 3. Een opdracht uitvoeren (regels klaar, schermen volgen)

- Een opdracht heeft een incident met één of meer **diensten**. De status van een dienst bepaalt de fase: accepteren, laden (fase 1), afleveren (fase 2), afgerond.
- Bij het openen worden de volledige diensten opgehaald (`hydrateServices`); ontbrekende typecodes worden per dienst aangevuld.
- **Accepteren van een dienst** vraagt een bevestiging als de berger verder dan 500 m van het doel is, of als positie of doel onbekend is. Succes en "in de wachtrij" zijn toasts, geen blokkerende dialoog ([ADR 0024](../decisions/0024-feedback-en-dialogen.md)).
- Na het **verzenden** bepaalt `resolveProcessingExit` en `getExitTarget` waar de gebruiker heen gaat: het afsluitscherm, de diensten van het incident, of de opdrachtenlijst. Diensten van bepaalde typen worden na fase 1 afgesloten (vroeg afronden).
- **Dienst weigeren** (vergeefse rit of terug naar dispatch) opent een bottom sheet met bevestiging, daarna dezelfde exit-flow.
- **Concept bewaren** bij sluiten met wijzigingen; hervatten bij opnieuw openen. Ontbrekende verplichte foto's blokkeren versturen totdat iedere verplichte positie is ingevuld.
- **PLTR** (planbaar transport, type 1012 en 1030) opent een eigen scherm: laadadres en afleveradres, en één volgende stap (accepteren, laden, afleveren, afronden). Afronden eindigt op de opdrachtenlijst. Het doel van de 500 m-check is eerst de laadlocatie en in de afleverfase de afleverlocatie.
- **Het verwerkingsformulier** opent vanaf een actieve dienst of de laad-/afleverknop van PLTR. Het toont de velden van de huidige fase in secties, gevuld met wat het CRM al weet, met voortgang per sectie. "Volgende" springt naar het eerstvolgende lege verplichte veld; zijn alle verplichte velden ingevuld, dan wordt het "Verzenden". Keuzelijsten volgen de regels van de oude app (landen, depots op afstand, autotype per merk). Na verzenden volgt dezelfde exit als hierboven. Kenteken/RDW, adres zoeken, native handtekening en foto's horen bij slice 14 tot en met 17.

## 4. Eenheid en werktijden (regels klaar)

Bij het starten van een dienst meldt de berger zijn voertuig (kenteken in één van de 14 Nederlandse patronen) en de eindtijd van de dienst. Die moet in de toekomst liggen en binnen 24 uur. De eindtijd wordt onthouden; is die vervallen terwijl de eenheid verder nog klopt, dan vraagt de app alleen een nieuwe eindtijd (zoals de oude `SetWorkingHours`), geen volledige herregistratie.

## 5. Notificaties (werkt, nog niet op een toestel gecontroleerd)

Een push-bericht wordt gelezen (type in verschillende velden, soms in geneste JSON), ontdubbeld op bericht-id en vertaald naar effecten: één opdracht ophalen, alles verversen, een opdracht verwijderen, de medewerker herladen of voertuigafgifte verversen. Mislukt het ophalen van één opdracht, dan wordt alles ververst. In de voorgrond toont de app een banner (met een vaste tekst als het bericht geen titel of tekst heeft). Elk niet-uitgeschakeld bericht gaat ook in de in-app historie (bel op de opdrachtenlijst, max 100, ongelezen-teller); een tik op een incidentmelding opent de opdracht. Een tik op de systeembanner, ook de melding die de app koud startte, opent de opdrachtenlijst. Een geweigerde permissie verandert niets aan de rest van de app. Het token dat wordt geregistreerd is een Expo-pushtoken. Uitloggen wist de historie.

## 6. Foto's en handtekening

De berger opent Foto's vanaf een dienst of PLTR. Per fase (laden of afleveren) maakt hij foto's van
een gekozen type. Opnames blijven lokaal totdat hij de fasebatch expliciet verstuurt. Bij afleveren
staan alle laadfoto's als aanklikbare history ter vergelijking en wordt iedere laadfoto opnieuw
verplicht. Een verzonden verplichte foto kan afzonderlijk worden vervangen; verzonden extra's zijn
locked. Na aanbieden loopt upload via een wachtrij: een tijdelijke fout houdt de versleutelde foto
lokaal en probeert later opnieuw.
Pas na een door de server bevestigde `finish` van de opdracht wist de app de lokale foto's.

Handtekeningen zet hij full-screen in het verwerkingsformulier (native pad, JPEG-upload vóór het
formulier-PUT). Na vastleggen ziet hij een thumbnail; leeg opslaan wordt geweigerd.

## 7. Instellingen (werkt)

Via het tandwiel rechtsboven in de header. Bovenaan de werkerbalk (naam en login-type; tik
ververst). Daaronder een menu onder "Algemeen": taal, toestemmingen, synchronisatiestatus,
support, en in ontwikkeling ook debug. Onderin het versienummer; daaronder uitloggen. Taal
opent een apart scherm (NL of EN, wisselt direct en blijft bewaard, ook na uitloggen). Op het
toestemmingenscherm staan locatie, meldingen en camera, elk met uitleg en de huidige status.
Mag de systeemdialoog nog, dan vraagt de app toestemming. Na een weigering waarbij de dialoog
niet terugkomt, opent de app de systeeminstellingen. De 500 m-check zelf blijft de drie
bevestigingen. Live positie naar de backend volgt nog (open vraag 14). Eenheid afmelden gebeurt bij
vrijwillig uitloggen.

## 8. Offline en support (werkt, deels)

Een afronding, afwijzing of acceptatie die de server niet haalt door een tijdelijke fout blijft op
het apparaat en gaat later weg, in de volgorde waarin de berger ze bevestigde. De berger ziet een
toast en op de kaart het label "wacht op verbinding". Een harde afwijzing
van de server (4xx) houdt de rest niet tegen. De lijst van de vorige keer is er nog zonder
verbinding. Via instellingen deelt de berger het log van de laatste dag; persoonsgegevens zijn eruit.
Monitoring en een store-release volgen nog (open vragen 15 en 10).
