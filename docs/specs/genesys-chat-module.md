# Spec & haalbaarheid — Chat- en AI-modules in de VRS-app

|                 |                                                        |
| --------------- | ------------------------------------------------------ |
| Status          | Concept, voor afstemming met Van Eijck en Frontline BV |
| Datum           | 30-09-2026                                             |
| Doel-planning   | Q1 2027 (gefaseerd, zie §11)                           |
| Aanvrager       | Van Eijck                                              |
| Leverancier KCC | Frontline BV (Genesys Cloud)                           |

## 1. Aanleiding

Van Eijck stapt eind 2026 over op Genesys Cloud (KCC-oplossing via Frontline BV) voor telefonie en de centrale mailbox. Genesys biedt ook messaging. De vraag is om in de VRS-app de volgende communicatiemodules toe te voegen:

| Module                         | Omschrijving                                                                                                  | Gesprekspartner             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **M1 – Meldkamerchat**         | Chat tussen uitvoerder en meldkamer, met statusberichten en keep-alive. Vervangt Telegram.                    | Mens (meldkamer in Genesys) |
| **M2 – AI-assistent opdracht** | Vragen stellen over de allocation, het incident en de diensten die daaronder vallen                           | AI-agent                    |
| **M3 – AI-voertuigassistent**  | Vragen over het voertuig van de allocation, bijvoorbeeld "Hoe open je deze Tesla?" of "Waar zit de 12V-accu?" | AI-agent                    |
| **M4 – AI-formulierinvuller**  | Het scherm stelt vragen, de uitvoerder antwoordt met spraak of tekst en een AI-agent vult het formulier in    | AI-agent                    |

M2 en M3 zijn **2 losse chats**.

De centrale vraag in deze spec is: **bouwen we de chat zelf, zodat we M2 tot en met M4 kunnen toevoegen, of gebruiken we Genesys daarvoor, en kán dat?** Zie §6.

## 2. Huidige situatie van de app

De VRS-app is de herbouwde berger-app `vaneijck-berger-app`: Expo SDK 57, React Native 0.86, Expo Router, development build met prebuild, en een domeinarchitectuur met poorten. Zie `docs/architecture.md` en `docs/roadmap.md` in die repository. De oude app staat onder `legacy/`. De backend is de **Salvage-API** (ASP.NET, CRM-gebaseerd).

**Wat al bestaat en wat de modules kunnen hergebruiken:**

| Bouwsteen                                                                                                                                 | Waar in de app                         | Hergebruik voor                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Inloggen met SMS-code (extern) en Azure AD (intern), `TokenProvider` en `SessionLifecycle`                                                | domein `auth`                          | Identiteit van de uitvoerder (R1). Login en uitlog zijn de triggers voor R4.                        |
| Opdrachten, incidenten en diensten (`/api/allocations`, `/api/incidents`, `/api/services`)                                                | domeinen `allocations` en `services`   | Context voor de opdracht-assistent (M2)                                                             |
| Voertuiggegevens bij de opdracht (onder andere `dn_vehiclebrand`) en een RDW-lookup op kenteken                                           | domeinen `allocations` en `rdw`        | Voertuigcontext voor de voertuigassistent (M3)                                                      |
| Verwerkingsformulier uit CRM-definities (`dataDefinition` in de referentiedata), met validatie, conceptopslag en `PUT /api/services/{id}` | domein `service-form`                  | **Het doelformulier voor M4.** De AI vult dit bestaande formulier in; er komt geen nieuw formulier. |
| Pushmeldingen via FCM en Notifee, met een parser, ontdubbeling, effectplanner en berichtgeschiedenis                                      | domein `notifications`                 | Melding bij een nieuw chatbericht (nieuw berichttype)                                               |
| Outbox: mutaties in volgorde, met retry bij tijdelijke fouten                                                                             | domein `outbox`                        | Offline versturen van chatberichten en spraakopnames                                                |
| Foto's: camera, multipart-upload en wachtrij                                                                                              | domein `photos`                        | Bijlagen in de meldkamerchat (R5)                                                                   |
| Medewerker (`/api/workers`), eenheid en homebase-locaties (interne bergers)                                                               | domeinen `worker` en `allocation-unit` | Mogelijke bron voor het cluster of de vestiging (R1). Dit moet worden bevestigd, zie §13.           |
| Referentiedata-sync, i18n (NL/EN), logger met redactie                                                                                    | domeinen `reference-data` en `shared`  | Clusterlijst, teksten en privacyveilige logging                                                     |

**Wat nog ontbreekt:** een chatscherm, audio-opname (bijvoorbeeld `expo-audio`), een koppeling met Genesys, en AI-endpoints in de Salvage-API.

Nieuwe onderdelen volgen de bestaande regels (`CLAUDE.md`, `docs/conventions.md`):

- elke module wordt een eigen domein (`chat`, `assistant`, `voice-form`);
- de buitenwereld (audio, websocket en klok) zit achter poorten;
- elke response gaat door zod;
- teksten staan in i18n;
- `domain/`, `api/` en `service/` hebben 90% testdekking.

## 3. Eisen per module

### M1 – Meldkamerchat (uit de oorspronkelijke aanvraag)

| #   | Eis                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Elk bericht bevat de gebruiker (uitvoerder) en het actieve cluster/de actieve vestiging als attribute, voor routering naar de clusterwachtrij                                    |
| R2  | Bij het aanleggen van een nieuwe uitvoerder wordt "Nieuwe gebruiker aangelegd" gestuurd (keep-alive, automatisch afgehandeld)                                                    |
| R3  | Elke 70 uur wordt per uitvoerder "Inlogsessie verlengd" gestuurd (keep-alive, automatisch afgehandeld)                                                                           |
| R4  | Bij inloggen en uitloggen wordt "Uitvoerder is ingelogd" of "Uitvoerder is uitgelogd" gestuurd. Dit bericht komt in de clusterwachtrij en de meldkamer vinkt het af als gelezen. |
| R5  | Uitvoerder en meldkamer chatten in beide richtingen, ook met bijlagen                                                                                                            |

Genesys sluit een sessie na 72 uur inactiviteit. Zonder open sessie kan de meldkamer niet naar de uitvoerder communiceren.

### M2 – AI-assistent opdracht

- De chat hoort bij één allocation. De AI-agent kent de allocation, het incident en de onderliggende diensten.
- De agent beantwoordt vragen als: "Wat is het adres?", "Welke diensten moet ik uitvoeren?", "Wie is de klant of het contactpersoon?" en "Wat is de status van dienst X?".
- De agent haalt data **live via de Salvage-API** op, met de rechten van de ingelogde uitvoerder. Hij kan niet bij data van andere allocations.
- In de eerste versie leest de agent alleen (read-only). Hij voert geen mutaties uit.
- Weet de agent het antwoord niet, dan zegt hij dat. Optioneel verwijst hij door naar de meldkamer (M1).

### M3 – AI-voertuigassistent

- De chat hoort bij het voertuig van de allocation (merk, model, bouwjaar en brandstof/aandrijving, bijvoorbeeld op basis van het kenteken via RDW).
- De agent beantwoordt technische vragen, zoals hoe je het voertuig opent, waar het onderdeel zit, hoe je het hoogvoltagesysteem uitschakelt en waar de sleeppunten en de 12V-accu zitten.
- De agent antwoordt **alleen op basis van bronnen** (RAG) en noemt altijd de bron. Staat het antwoord niet in de bronnen, dan zegt hij "Niet bekend" en gokt hij niet.
- ⚠️ Aanname: veiligheidskritieke informatie, zoals hoogvoltage bij elektrische auto's, komt uitsluitend uit officiële bronnen. Denk aan de Emergency Response Guides en Rescue Sheets van de fabrikant of aan een gelicentieerde database zoals Moditech/Euro Rescue. De keuze en licentie van de bron is een open vraag (§13).

### M4 – AI-formulierinvuller (spraak/tekst)

- Het doel is het **bestaande verwerkingsformulier** (`service-form`), dat is opgebouwd uit de CRM-definities per dienst en fase. M4 is een alternatieve invoermodus op dat formulier, geen nieuw formulier.
- Het scherm stelt stap voor stap vragen die zijn afgeleid van de zichtbare en bewerkbare velden van het formulier, bijvoorbeeld over de schade, de aangetroffen situatie of de uitgevoerde werkzaamheden.
- De uitvoerder antwoordt met een **spraakopname** of met **tekst**.
- De backend zet spraak om naar tekst (Nederlands). Een AI-agent zet het antwoord daarna om naar gestructureerde velden volgens het formulierschema (JSON Schema/structured output).
- De app vult het formulier in. De uitvoerder **controleert en bevestigt** de ingevulde velden voordat het formulier wordt verzonden. Er wordt nooit automatisch verzonden.
- Ontbreekt er informatie of is die onduidelijk, dan stelt de agent een vervolgvraag.
- De AI-uitkomst komt in het bestaande concept van het formulier terecht. Validatie, de fotocontrole en het versturen (`PUT /api/services/{id}`) blijven ongewijzigd.
- Offline kan de opname lokaal worden bewaard, via hetzelfde wachtrijprincipe als de outbox en de fotowachtrij, en worden verwerkt zodra er weer verbinding is.

## 4. Technische bevindingen Genesys

| Onderwerp                              | Bevinding                                                                                                                                                                                                                                                                                                               | Gevolg                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Messenger Mobile SDK (met UI)          | Native voor Android en iOS. De officiële React Native-wrapper is **per 8 juli 2024 gedeprecieerd en verwijderd**.                                                                                                                                                                                                       | Niet direct bruikbaar in onze Expo-app. De UI is bovendien van Genesys en niet uit te breiden met M2 tot en met M4.                       |
| Messenger **Transport** SDK (headless) | Actief onderhouden (v2.15, september 2026). Kotlin Multiplatform voor Android en iOS. Ondersteunt `sendMessage(text, customAttributes)`, bijlagen, geauthenticeerde sessies (OIDC), push en sessie-einde-events.                                                                                                        | Is via een eigen Expo native module te gebruiken, met een eigen UI.                                                                       |
| Sessieduur Web Messaging               | De sessie blijft actief zolang er in de afgelopen 72 uur berichten zijn uitgewisseld, en verloopt daarna.                                                                                                                                                                                                               | De keep-alive uit de aanvraag is nodig bij Web Messaging.                                                                                 |
| **Open Messaging**                     | Een API-koppeling voor inkomende berichten met `customAttributes` en een webhook voor uitgaande berichten. Uitgaande berichten naar een bekende gebruiker zijn mogelijk.                                                                                                                                                | Berichten kunnen server-side en betrouwbaar worden verstuurd. Keep-alive is mogelijk niet nodig; dit moet Frontline bevestigen.           |
| AI in Genesys                          | Genesys heeft een eigen **Agentic Virtual Agent / AI Guides** (AI Studio, knowledge base/RAG) en een **Bot Connector** / Digital Connector om een eigen bot, bijvoorbeeld op Azure OpenAI, in een Architect-messageflow te hangen. Bij beide kan het gesprek worden overgedragen aan een wachtrij met de context erbij. | Technisch kán een AI-agent in de Genesys-chat. De prijs is licentie- of verbruiksafhankelijk en niet publiek; vraag die op bij Frontline. |
| Spraak in messaging                    | Bijlagen worden ondersteund. Spraakberichten en transcriptie in mobiele messaging zijn niet als standaardfunctie gedocumenteerd.                                                                                                                                                                                        | M4 met spraak moet sowieso in de app en de eigen backend worden gebouwd.                                                                  |

## 5. Kernprobleem bij M1: berichten die de app niet zelf betrouwbaar kan versturen

- **R2:** een uitvoerder wordt aangelegd in het beheer of de backend. Er bestaat dan nog geen app-sessie.
- **R3:** iOS en Android garanderen geen achtergrondtaak op een vast tijdstip, bijvoorbeeld als de app geforceerd is afgesloten of de telefoon uit staat.
- **R4:** bij een automatische uitlog, een verlopen token of een lege batterij verstuurt de app geen bericht.

Deze berichten moeten dus **server-side** worden verstuurd. Daarvoor is hoe dan ook een eigen backend nodig.

## 6. Afweging: zelf bouwen of Genesys gebruiken

### Optie 1 — Alles via Genesys

Alle chats lopen via Genesys. M2 en M3 draaien als Genesys Virtual Agent of als eigen bot via de Bot Connector.

- **Voordelen:** 1 kanaal. Overdracht van AI naar de meldkamer zit er standaard in. De meldkamer ziet ook de AI-gesprekken.
- **Nadelen:**
  - M2 en M3 hebben **VRS-data** nodig (allocation, incident, voertuig). Genesys moet dan onze API aanroepen via Data Actions, of we bouwen toch een eigen bot-backend achter de Bot Connector. De AI-logica zit dus alsnog bij ons, met Genesys als extra tussenlaag.
  - Elk AI-gesprek wordt een Genesys-conversatie. Dat heeft impact op de licentie- en verbruikskosten, de rapportages en mogelijk de wachtrijen.
  - Genesys kent 1 messaging-sessie per gebruiker (deployment). **2 losse AI-chats en een meldkamerchat** in 1 app passen daar slecht in: meerdere deployments of ingewikkelde routering zijn nodig.
  - M4 (formulier invullen met spraak) is geen chatcenter-functionaliteit en kan niet in Genesys.
  - Er is geen officiële React Native-SDK, dus we bouwen toch een native wrapper en een eigen UI.
- **Conclusie:** technisch deels mogelijk, maar het levert weinig op en maakt ons afhankelijk van Genesys voor functionaliteit die niets met de meldkamer te maken heeft.

### Optie 2 — Alles zelf bouwen, zonder Genesys

- **Nadeel:** dit is geen optie voor M1. De meldkamer werkt straks in Genesys, dus de meldkamerchat moet daar uitkomen.

### Optie 3 — Hybride: eigen chatplatform in de app en backend, Genesys alleen voor de meldkamer (aanbevolen)

```text
                         ┌──────────── Salvage-API (bestaand) + chat/AI-uitbreiding ──────┐
Berger-app (bestaand)    │                                                                │
 ├─ nieuw domein `chat`  │  /api/chat/meldkamer ─► Open Messaging API + webhook ─► Genesys ┼─► Architect ─► clusterwachtrij
 │  (1 UI, 3 kanalen)    │  /api/chat/opdracht  ─► AI-agent + tools (allocations/incidents/services)
 ├─ `service-form`       │  /api/chat/voertuig  ─► AI-agent + RAG (voertuigbronnen)        │
 │  + spraakinvoer       │  /api/form/extract   ─► Speech-to-text ─► LLM structured output │
 └─ `notifications`(FCM) │  Events: aanmaak, login/uitlog, 70-uurs keep-alive-scheduler    │
                         └────────────────────────────────────────────────────────────────┘
```

⚠️ Aanname: de chat- en AI-endpoints komen als uitbreiding in de Salvage-API, of als aparte service achter dezelfde authenticatie. Daar zijn het gebruikersbeheer (aanmaak) en de sessies (login en uitlog) al bekend, en zijn de data en rechten al aanwezig. Wie de Salvage-API beheert en of die uitbreiding daar mag, is een open vraag (§13).

- **Voordelen:**
  - We bouwen **1 chatcomponent** in de app en gebruiken die voor alle 3 de chats (meldkamer, opdracht, voertuig). M4 hergebruikt de invoer (tekst en spraak).
  - De AI-agents draaien direct naast de VRS-data en rechten, zonder omweg via Genesys. Er zijn geen Genesys-licentiekosten voor AI-gesprekken.
  - M1 is betrouwbaar dankzij server-side systeemberichten (R2 tot en met R4) en attributes die op basis van de geauthenticeerde gebruiker worden ingevuld (R1).
  - Genesys wordt alleen gebruikt waarvoor het bedoeld is: menselijk contact met de meldkamer.
  - Een overdracht van AI naar de meldkamer is optioneel mogelijk. De backend kan een AI-gesprek met samenvatting doorzetten naar de meldkamerchat.
  - We houden volledige controle over de UX, AVG, bewaartermijnen, AI-kosten en modelkeuze.
- **Nadelen:** we bouwen en beheren zelf een backend. De meldkamer ziet de AI-gesprekken niet in Genesys, behalve bij een overdracht.

### Conclusie en aanbeveling

**Kies optie 3.** De extra's (M2 tot en met M4) zijn het sterkste argument om de chat zelf te bouwen. Ze hebben VRS-context nodig, er zijn meerdere losse chats, en spraak-naar-formulier is geen chatcenter-functie. Genesys blijft het eindpunt voor de meldkamer via Open Messaging.

Een alternatief kan zijn om de AI-agents bewust in Genesys te plaatsen, als Van Eijck vindt dat de meldkamer alle AI-gesprekken moet kunnen meelezen of dat Genesys de "single pane of glass" moet zijn. Vraag dan bij Frontline de licentie en kosten van de Virtual Agent op en reken met extra doorlooptijd.

## 7. Functionele specificatie M1 (meldkamerchat via Open Messaging)

### 7.1 Attributes (R1)

| Attribute          | Voorbeeld                                                                                                 | Bron                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vrs_userId`       | `U-10234`                                                                                                 | VRS gebruikersbeheer                                                                                                                                    |
| `vrs_userName`     | `J. Jansen`                                                                                               | VRS gebruikersbeheer                                                                                                                                    |
| `vrs_clusterId`    | `CL-UTRECHT`                                                                                              | Actieve vestiging. Voor interne bergers mogelijk de homebase-locatie van de geregistreerde eenheid; voor externe bergers is de bron nog onbekend (§13). |
| `vrs_clusterName`  | `Utrecht`                                                                                                 | Stamdata cluster                                                                                                                                        |
| `vrs_allocationId` | `A-2027-00123`                                                                                            | Actieve allocation (optioneel)                                                                                                                          |
| `vrs_messageType`  | `chat` \| `status_login` \| `status_logout` \| `keepalive_new_user` \| `keepalive_extend` \| `ai_handoff` | Backend                                                                                                                                                 |

### 7.2 Systeemberichten (R2 tot en met R4)

| Trigger                           | Tekst                      | `vrs_messageType`    | Verwerking                |
| --------------------------------- | -------------------------- | -------------------- | ------------------------- |
| Uitvoerder aangelegd              | Nieuwe gebruiker aangelegd | `keepalive_new_user` | Automatisch, zonder agent |
| Laatste bericht ouder dan 70 uur  | Inlogsessie verlengd       | `keepalive_extend`   | Automatisch, zonder agent |
| Login                             | Uitvoerder is ingelogd     | `status_login`       | Clusterwachtrij, afvinken |
| Uitlog (handmatig of server-side) | Uitvoerder is uitgelogd    | `status_logout`      | Clusterwachtrij, afvinken |

De berichten worden idempotent verstuurd. Een mislukte verzending wordt opnieuw geprobeerd met backoff. Bij aanhoudende fouten volgt een alert.

### 7.3 Chat (R5)

- Tekst en bijlagen (foto en pdf) worden in beide richtingen uitgewisseld, met een verzendstatus. Foto's gebruiken de bestaande camera en upload uit `photos`.
- Bij een nieuw bericht volgt een pushmelding: een nieuw berichttype in het bestaande `notifications`-domein (FCM), met tiknavigatie naar de chat.
- Zonder netwerk zet de app berichten in een wachtrij, volgens het outbox-principe.

### 7.4 Genesys-inrichting (Frontline)

- Een Open Messaging-integratie met een webhook naar de backend.
- Een Architect-flow:
  - `keepalive_*` wordt automatisch afgehandeld;
  - de overige berichten gaan naar een wachtrij op basis van `vrs_clusterId`;
  - een fallback-wachtrij voor een onbekend cluster.
- Een wachtrij per cluster en een agentscript dat de attributes toont.
- Een OAuth-client (client credentials) met minimale rechten.

## 8. Functionele specificatie M2 tot en met M4 (AI)

### 8.1 Gedeeld AI-platform

- **Model:** Azure OpenAI (EU Data Zone), aangeroepen via de backend. De app bevat geen API-keys.
- **Autorisatie:** elke AI-aanroep draait onder de identiteit van de uitvoerder. Tools (Salvage-API) respecteren dezelfde rechten.
- **Guardrails:** de agent antwoordt alleen binnen het domein van de chat. Bij twijfel geeft hij geen antwoord en zegt hij dat eerlijk. Er is content filtering en we beschermen tegen prompt injection.
- **Logging en evaluatie:** we bewaren de vraag, het antwoord, de gebruikte bronnen/tools en de feedback (duim omhoog of omlaag) volgens een afgesproken bewaartermijn.
- **UI:** de chatcomponent van M1, met een duidelijk label "AI-assistent" en een disclaimer.

### 8.2 M2 – Opdracht-assistent

- Tools (function calling) op de bestaande Salvage-API-endpoints, met het token van de berger en in de eerste versie alleen lezen:
  - `getAllocation` (`/api/allocations/{id}`)
  - `getIncident` (`/api/incidents/{id}`)
  - `getServices` (`/api/services/by-incident-id/{id}`)
  - de relevante referentiedata, zoals dienstsoorten en statussen
- De chat wordt gestart vanuit het allocationscherm en de context wordt automatisch meegegeven.
- **Acceptatie-indicatie:**
  - de agent beantwoordt vragen over velden die in de allocation staan correct;
  - hij geeft geen data van andere allocations;
  - bij een onbekend antwoord noemt hij dat het niet bekend is.

### 8.3 M3 – Voertuigassistent

- **Context:** merk (`dn_vehiclebrand`) en kenteken uit de opdracht, aangevuld met model, bouwjaar en brandstof via de bestaande RDW-lookup (`/api/check/rdw/registrationnumber/{plate}`).
- **Kennisbron:** een geïndexeerde verzameling documenten (Azure AI Search) met rescue sheets, ERG's en werkplaatsinformatie, gefilterd op merk, model en bouwjaar.
- **Antwoorden:** altijd met een bronvermelding en waar mogelijk met een afbeelding of pagina uit de rescue sheet.
- **Veiligheid:** bij hoogvoltage- of airbagvragen wordt altijd naar de officiële bron verwezen. Zonder bron geeft de agent geen antwoord.

### 8.4 M4 – Formulierinvuller

1. De app toont een vraag, afgeleid van de `dataDefinition` van het verwerkingsformulier: het label, het veldsoort en de keuzelijst uit de referentiedata.
2. De uitvoerder spreekt het antwoord in (`expo-audio`) of typt het.
3. De backend verwerkt het antwoord:
   - spraak wordt omgezet naar tekst (Azure AI Speech of `gpt-4o-transcribe`, Nederlands);
   - een LLM met structured output (JSON Schema van het formulier) zet de tekst om naar velden.
4. De app valideert de uitkomst met de bestaande validatie van `service-form` en zet de waarden in het concept. De velden worden gemarkeerd als "door AI ingevuld". Ontbreekt er iets of is iets onduidelijk, dan volgt een vervolgvraag.
5. De uitvoerder controleert in het normale formulierscherm, past eventueel aan en verstuurt via de bestaande flow.

Uitgangspunten:

- De formulierdefinities komen al uit het CRM via de referentiedata-sync. Er zijn geen aparte schema's nodig: de backend of app zet de `dataDefinition` om naar een JSON Schema voor de structured output.
- Keuzelijstvelden mogen alleen waarden uit de referentiedata krijgen. Een onbekende waarde laat het veld leeg.
- De audio wordt na de transcriptie verwijderd, tenzij anders afgesproken.

## 9. Niet-functionele eisen

- **Beveiliging:** de app authenticeert alleen bij de Salvage-API (bestaande SMS- of Azure AD-login). Er staan geen Genesys- of AI-credentials in de app. De webhook wordt gevalideerd met een HMAC-signature. Secrets staan in Key Vault.
- **Privacy (AVG):**
  - chatinhoud, spraakopnames en login- en uitlogmomenten zijn persoonsgegevens;
  - er is een verwerkersovereenkomst nodig met Frontline/Genesys en Microsoft (EU-dataresidentie);
  - de bewaartermijnen moeten worden afgesproken;
  - uitvoerders worden geïnformeerd;
  - er wordt een DPIA uitgevoerd voor het AI-gebruik.
- **EU AI Act:** gebruikers moeten weten dat ze met AI praten (transparantieplicht). De verwachting is geen hoog-risicotoepassing; dit moet worden bevestigd.
- **Betrouwbaarheid:** er zijn logging, alerts en health checks voor de koppelingen met Genesys, Azure OpenAI en de Salvage-API.
- **Kosten:** het AI-verbruik (tokens en spraakminuten) wordt gemonitord, met een budgetalert.
- **Platformen:** iOS en Android. We testen op fysieke toestellen, met een EAS development build (nodig voor native modules en push).

## 10. Wat is er nodig?

### Van Van Eijck / Frontline

- [ ] Een Genesys-testomgeving vóór de start van Q1 en een contactpersoon bij Frontline.
- [ ] Bevestiging dat de licentie Open Messaging ondersteunt en dat agent-geïnitieerde berichten mogelijk zijn.
- [ ] Een lijst van clusters/vestigingen met de bijbehorende wachtrij.
- [ ] Een testaccount met opdrachten en diensten op de tst-omgeving. Op het huidige testaccount staan er geen (zie `docs/roadmap.md`, slice 4).
- [ ] Een keuze en licentie voor de **voertuigbron** (M3).
- [ ] Een keuze welke **diensten of fases** van het verwerkingsformulier als eerste spraakinvoer krijgen (M4).
- [ ] Afspraken over AVG, de DPIA en bewaartermijnen.
- [ ] Een besluit over optie 3 (aanbevolen) of het plaatsen van de AI in Genesys.

### Van ons (development)

- [ ] Een uitbreiding van de Salvage-API (of een aparte service): Open Messaging, webhook, scheduler, AI-agents, RAG-index, spraak en extractie.
- [ ] Een Azure OpenAI-resource (EU), Azure AI Search en eventueel Azure AI Speech.
- [ ] In de app:
  - een nieuw domein `chat` (1 UI, 3 kanalen);
  - spraakinvoer in `service-form`;
  - audio-opname (`expo-audio`, met de microfoontoestemming in `settings`);
  - een nieuw pushtype in `notifications`.

  Login, push (FCM), outbox, foto's en een development build bestaan al.

## 11. Indicatieve inschatting en fasering

Dit is een grove schatting voor 1 tot 2 developers. Login, push, outbox, foto's, opdrachten, diensten en het verwerkingsformulier bestaan al in de app en worden hergebruikt.

| Onderdeel                                                                                  | Schatting                                 |
| ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Spike met Frontline (Open Messaging, routering) en AI-proof-of-concept                     | 1–2 weken                                 |
| Backenduitbreiding (Open Messaging, webhook, chat-endpoints, logging)                      | 2 weken                                   |
| Domein `chat` in de app (1 UI, 3 kanalen, bijlagen via `photos`, pushtype)                 | 1,5–2 weken                               |
| M1: systeemberichten, keep-alive-scheduler, Genesys-integratietest                         | 1–2 weken                                 |
| M2: opdracht-assistent (tools op de bestaande endpoints, guardrails)                       | 1,5–2 weken                               |
| M3: voertuigassistent (bronnen, index, RAG, bronvermelding)                                | 2–4 weken (sterk afhankelijk van de bron) |
| M4: spraakinvoer op `service-form` (opname, transcriptie, extractie naar `dataDefinition`) | 2–3 weken                                 |
| Acceptatietest, AI-evaluatie en store-release                                              | 2 weken                                   |
| **Totaal**                                                                                 | **~13–19 weken**                          |

**Haalbaarheid:** het complete pakket past niet realistisch in één kwartaal. Voorstel:

- **Q1 2027:** fundament, M1 (meldkamerchat, vervanging van Telegram) en M2 (opdracht-assistent). M1 is afhankelijk van de livegang van Genesys en heeft daarom prioriteit.
- **Q2 2027:** M4 (formulierinvuller) en M3 (voertuigassistent), zodra de voertuigbron en de licentie rond zijn.

## 12. Risico's

| Risico                                                      | Impact | Maatregel                                                                              |
| ----------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| De Genesys-livegang of testomgeving is vertraagd            | Hoog   | Bouw eerst tegen een mock. M2 en M4 zijn niet afhankelijk van Genesys.                 |
| De AI geeft een fout antwoord op een veiligheidsvraag (M3)  | Hoog   | Alleen RAG met bronvermelding, geen antwoord zonder bron en een verplichte disclaimer. |
| Er is geen geschikte of gelicentieerde voertuigbron         | Hoog   | Besluit vóór de start van M3. Start eventueel met de publieke ERG's van fabrikanten.   |
| De AI vult een formulierveld verkeerd in (M4)               | Midden | Laat de uitvoerder altijd controleren en bevestigen, en markeer de AI-velden.          |
| Spraakherkenning werkt slecht bij omgevingsgeluid (snelweg) | Midden | Test in het veld en val terug op tekstinvoer.                                          |
| De AI-kosten zijn niet voorspelbaar                         | Midden | Monitoring, een budgetalert en een keuze voor een kleiner model waar mogelijk.         |
| AVG of AI-compliance is onduidelijk                         | Midden | Voer de DPIA uit vóór de livegang.                                                     |
| Uitvoerders blijven Telegram gebruiken                      | Laag   | Maak een uitfaseringsplan en communiceer het.                                          |

## 13. Open vragen aan Van Eijck / Frontline

1. Wie beheert de Salvage-API? Mogen de chat- en AI-endpoints daarin, of moet er een aparte service komen? Gaat het aanleggen van een uitvoerder (R2) via die API of direct in het CRM? In het laatste geval is een CRM-trigger of -plugin nodig.
2. Ondersteunt de Genesys-licentie Open Messaging? Kan de meldkamer daarmee zelf een gesprek starten, zodat de keep-alive vervalt?
3. Moet de meldkamer de AI-gesprekken (M2 en M3) kunnen meelezen in Genesys? Dit bepaalt of de AI in Genesys of in de eigen backend komt.
4. Moet de AI kunnen doorverwijzen naar de meldkamer (overdracht met samenvatting)?
5. Welke bron gebruiken we voor de voertuiginformatie (M3)? Zijn er licenties, bijvoorbeeld voor Moditech/Euro Rescue?
6. Welke diensten of fases van het verwerkingsformulier krijgen als eerste spraakinvoer (M4)? Welke velden zijn daar het meest tijdrovend?
7. Mag M2 in de toekomst ook acties uitvoeren (bijvoorbeeld een status bijwerken), of blijft het read-only?
8. Wat is het "cluster" in het CRM? Is dat de homebase-locatie van een interne berger? Welk cluster geldt voor een externe berger? Wisselt een uitvoerder tijdens een dienst van cluster?
9. Welke bijlagetypes zijn nodig in de meldkamerchat, en in beide richtingen?
10. Welke bewaartermijnen gelden voor chats, AI-gesprekken en spraakopnames?
11. Hoeveel uitvoerders, clusters en allocations per dag zijn er (voor de schatting van volume en AI-kosten)?

## 14. Voorstel backlog-opzet (ter refinement)

- **Epic:** Communicatie en AI-ondersteuning voor uitvoerders in de VRS-app
  - **Feature (Enabler):** Chat- en AI-backend
    - Technische PBI: Spike Genesys Open Messaging en routering (met Frontline)
    - Technische PBI: Proof of concept AI-agent met VRS-tools
    - Technische PBI: Chat-endpoints en logging in de Salvage-API (of een aparte service)
  - **Feature (Business):** Meldkamerchat via Genesys (M1)
    - Technische PBI: Open Messaging-client met attributes en webhook
    - Technische PBI: Server-side systeemberichten en 70-uurs keep-alive
    - PBI: Als uitvoerder wil ik met de meldkamer chatten, ook met bijlagen
  - **Feature (Business):** AI-assistent opdracht (M2)
  - **Feature (Business):** AI-voertuigassistent (M3)
  - **Feature (Business):** Formulier invullen met spraak of tekst (M4)
  - **Feature (Business):** Uitfasering van de Telegram-chat

## Bronnen

- [Genesys Messenger Mobile SDK](https://developer.genesys.cloud/commdigital/digital/webmessaging/mobile-messaging/messenger-mobile-sdk/)
- [Deprecation van de React Native-wrapper](https://rcworkbench.genesys.cloud/announcements/genesys-cloud/deprecation-mobile-messenger-sdk-for-react-native-apps/)
- [Messenger Transport SDK (GitHub)](https://github.com/MyPureCloud/genesys-messenger-transport-mobile-sdk)
- [Verloopt een Web Messaging-guestsessie?](https://help.genesys.cloud/faqs/does-a-web-messaging-guest-session-expire/)
- [Open Messaging: inkomende tekstberichten](https://developer.genesys.cloud/commdigital/digital/openmessaging/inboundTextMessages)
- [Een Open Messaging-integratie configureren](https://help.genesys.cloud/articles/configure-an-open-messaging-integration/)
- [Genesys Cloud Agentic Virtual Agent](https://www.genesys.com/capabilities/virtual-agents)
- [Blueprint Bot Connector (bring your own bot)](https://github.com/GenesysCloudBlueprints/bot-connector-for-ms-power-virtual-agent)
