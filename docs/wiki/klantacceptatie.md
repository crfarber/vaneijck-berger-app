# Klantacceptatie

> Gecontroleerd op: ba1383c (2026-09-23)
> Bronnen: `docs/wiki/applicatieflow.md`, `docs/wiki/ontwikkelstatus.md`, `docs/roadmap.md`, `src/app/`, `src/domeinen/`
> Zie ook: [applicatieflow](applicatieflow.md), [ontwikkelstatus](ontwikkelstatus.md), [componenten](componenten.md)

## Waarvoor

Deze checklist helpt klant en productteam de hoofdflows handmatig te beoordelen zonder kennis van
de code. Gebruik alleen aangewezen testaccounts en testopdrachten; noteer per scenario datum,
apparaat, appvariant en resultaat.

## Hoe het werkt

Gebruik per scenario één van deze uitkomsten: **geslaagd**, **afgewezen**, **geblokkeerd door
testdata** of **niet uitgevoerd**. Leg bij een afwijking alleen vast wat zichtbaar gebeurde en
deel geen telefoonnummers, persoonsgegevens, codes of andere gevoelige gegevens.

### Te controleren met echte backend of toestel

#### KLANT-01 Extern inloggen

**Randvoorwaarden:** een extern testaccount dat een SMS-code kan ontvangen en een bereikbare
testomgeving.

**Stappen:**

1. Start de app zonder bestaande sessie.
2. Kies extern inloggen, land en telefoonnummer.
3. Vraag een code aan en vul de ontvangen code in.
4. Herhaal stap 3 eenmaal met een onjuiste code.

**Verwacht resultaat:** een geldige code opent onboarding of de opdrachtenlijst. Een onjuiste code
geeft een begrijpelijke melding en laat de gebruiker opnieuw proberen.

**Technische koppeling:** [FLOW-03](applicatieflow.md#beweringen) en
[DEV-02](ontwikkelstatus.md#beweringen).

#### KLANT-02 Intern inloggen en sessie herstellen

**Randvoorwaarden:** een intern testaccount en een native testbuild.

**Stappen:**

1. Kies intern inloggen en rond de Microsoft-aanmelding af.
2. Sluit de app volledig en open hem opnieuw.
3. Annuleer de aanmelding in een aparte poging.

**Verwacht resultaat:** na geslaagde aanmelding opent onboarding of de opdrachtenlijst en een
herstart vraagt niet direct opnieuw om inloggen. Annuleren toont geen technische fout.

**Technische koppeling:** [FLOW-01 en FLOW-03](applicatieflow.md#beweringen) en
[DEV-02](ontwikkelstatus.md#beweringen).

#### KLANT-03 Eenheid registreren

**Randvoorwaarden:** één extern en één intern testaccount zonder geldige eenheid, plus actuele
voertuiggegevens in de testomgeving.

**Stappen:**

1. Log extern in en registreer kenteken, beschikbaarheid en eindtijd.
2. Log intern in en kies trekker en eventueel aanhanger, beschikbaarheid en eindtijd.
3. Herstart de app na iedere registratie.
4. Probeer registratie met een account dat nog open werk heeft.

**Verwacht resultaat:** ieder gebruikerstype krijgt het passende scherm. Een geldige registratie
opent de opdrachtenlijst en blijft na herstart geldig. Open werk geeft uitleg om contact met
dispatch op te nemen.

**Technische koppeling:** [FLOW-05](applicatieflow.md#beweringen) en
[DEV-04](ontwikkelstatus.md#beweringen).

#### KLANT-04 Opdrachtenlijst en acties

**Randvoorwaarden:** testdata met een actieve opdracht, een wachtende opdracht en zo mogelijk een
voertuigafgifte.

**Stappen:**

1. Open de opdrachtenlijst en trek omlaag om te verversen.
2. Open de actieve opdracht.
3. Accepteer, wijs af en draag elk met daarvoor bedoelde testdata één wachtende opdracht over.
4. Controleer de terugkeer naar de lijst na iedere actie.

**Verwacht resultaat:** de lijst toont de juiste groepen en ververst zonder dubbele kaarten. Iedere
actie geeft duidelijke voortgang en de gewijzigde opdracht krijgt daarna de juiste zichtbare staat.

**Technische koppeling:** [FLOW-06 en FLOW-07](applicatieflow.md#beweringen) en
[DEV-05 en DEV-07](ontwikkelstatus.md#beweringen).

#### KLANT-05 Diensten, locatie en PLTR

**Randvoorwaarden:** één gewone opdracht met meerdere diensten, één PLTR-opdracht en een toestel
waarop locatie kan worden aan- en uitgezet.

**Stappen:**

1. Open de gewone opdracht en controleer actieve en wachtende diensten.
2. Accepteer een dienst dichtbij, ver weg en zonder beschikbare positie.
3. Open de PLTR-opdracht en doorloop laad- en afleverstap met de afgesproken testdata.
4. Open het afsluitscherm van een daarvoor geschikte dienst.

**Verwacht resultaat:** diensten staan in de juiste groep. Alleen de afgesproken afstandsgevallen
vragen bevestiging. PLTR toont laad- en afleverinformatie in de juiste volgorde en gaat na afronden
naar de juiste lijst.

**Technische koppeling:** [FLOW-08 tot en met FLOW-10](applicatieflow.md#beweringen) en
[DEV-06 tot en met DEV-08](ontwikkelstatus.md#beweringen).

#### KLANT-06 Formulier, concept en foto's

**Randvoorwaarden:** een dienst met een echt ondersteund formulier, bekende verplichte velden en
fototypes, plus cameratoegang.

**Stappen:**

1. Open het formulier en vul tekst-, getal- en keuzevelden in.
2. Verlaat het formulier halverwege, kies bewaren en open het opnieuw.
3. Maak een foto, keer terug en controleer of die zichtbaar blijft.
4. Probeer zonder verplichte foto te verzenden en kies daarna foto's toevoegen.
5. Vul de verplichte velden en verstuur.

**Verwacht resultaat:** labels en keuzes passen bij de dienst, het concept komt terug, de foto blijft
zichtbaar en ontbrekende foto's geven één duidelijke keuze. Na succesvol verzenden verdwijnt het
concept en volgt de juiste vervolgstap.

**Technische koppeling:** [FLOW-11 tot en met FLOW-14](applicatieflow.md#beweringen) en
[DEV-09, DEV-13 en DEV-14](ontwikkelstatus.md#beweringen).

#### KLANT-07 Offline werken en herstellen

**Randvoorwaarden:** een eerder geladen opdrachtenlijst en testdata waarop veilig een actie mag
worden uitgevoerd.

**Stappen:**

1. Open de opdrachtenlijst met verbinding.
2. Zet vliegtuigmodus aan en heropen de lijst.
3. Voer een afgesproken opdracht- of dienstactie uit.
4. Sluit en open de app terwijl de verbinding nog uit staat.
5. Herstel de verbinding en wacht tot de actie is verwerkt.

**Verwacht resultaat:** de laatst geladen lijst blijft bruikbaar, de app logt niet uit, de actie
krijgt een wachtstatus en wordt na herstel eenmaal verwerkt.

**Technische koppeling:** [FLOW-15](applicatieflow.md#beweringen) en
[DEV-12](ontwikkelstatus.md#beweringen).

#### KLANT-08 Beschikbaarheid wijzigen

**Randvoorwaarden:** een medewerker met beschikbare statuskeuzes in de testomgeving.

**Stappen:**

1. Tik op de status boven in de app.
2. Kies een andere beschikbare status.
3. Keer terug en ververs de app.

**Verwacht resultaat:** de nieuwe status wordt zichtbaar en blijft na verversen gelijk aan de
status in de testomgeving.

**Technische koppeling:** [FLOW-18](applicatieflow.md#beweringen) en
[DEV-16](ontwikkelstatus.md#beweringen).

#### KLANT-09 Pushmelding ontvangen

**Randvoorwaarden:** een fysiek toestel met verleende meldingen, geldige testconfiguratie en een
testbericht dat door de backend kan worden verzonden.

**Stappen:**

1. Ontvang een bericht terwijl de app open is.
2. Open de meldingenhistorie en controleer de ongelezen teller.
3. Ontvang en tik op een bericht terwijl de app op de achtergrond staat.
4. Herhaal nadat de app volledig is afgesloten.

**Verwacht resultaat:** het bericht verschijnt maximaal eenmaal, werkt de juiste gegevens bij en
staat in de historie. Tikken opent de app op een geldige plek zonder vast te lopen.

**Technische koppeling:** [FLOW-19](applicatieflow.md#beweringen) en
[DEV-10](ontwikkelstatus.md#beweringen).

#### KLANT-10 Taal en toestemmingen

**Randvoorwaarden:** een toestel waarop locatie, meldingen en camera nog niet of niet meer mogen
worden gevraagd.

**Stappen:**

1. Wissel via Instellingen → Taal tussen Nederlands en Engels.
2. Sluit en heropen de app.
3. Open vanuit instellingen het toestemmingenscherm.
4. Doorloop voor iedere toestemming eenmaal toestaan en eenmaal weigeren.
5. Open via de app de systeeminstellingen wanneer opnieuw vragen niet mogelijk is.

**Verwacht resultaat:** de taal wisselt direct en blijft gekozen. Iedere toestemming toont de
juiste status; weigeren blokkeert de rest van de app niet en de terugkeer uit systeeminstellingen
werkt zonder herstart.

**Technische koppeling:** [FLOW-16 en FLOW-17](applicatieflow.md#beweringen) en
[DEV-11](ontwikkelstatus.md#beweringen).

#### KLANT-11 Support en uitloggen

**Randvoorwaarden:** een ingelogde sessie waarin enkele gewone testacties zijn uitgevoerd.

**Stappen:**

1. Open support vanuit instellingen en deel het supportbestand met een veilige testbestemming.
2. Controleer dat het bestand geen zichtbare persoonsgegevens of toegangsinformatie bevat.
3. Log uit en start de app opnieuw.
4. Log opnieuw in en controleer dat oude wachtrijen, concepten, foto's en meldingen niet terugkomen.

**Verwacht resultaat:** delen opent de systeemkeuze met een leesbaar, geredigeerd bestand.
Uitloggen toont de login, wist gebruikersgebonden gegevens en bewaart alleen de gekozen taal.

**Technische koppeling:** [FLOW-20](applicatieflow.md#beweringen) en
[DEV-12](ontwikkelstatus.md#beweringen).

### Nog niet beschikbaar

#### KLANT-12 Voertuig via QR, eenheid afmelden en live locatie delen

**Randvoorwaarden:** geen; deze onderdelen horen niet in een acceptatieronde van deze versie.

**Stappen:** niet uitvoeren.

**Verwacht resultaat:** QR-selectie, de huidige eenheid afmelden en live positie naar de backend
sturen zijn niet beschikbaar. De gewone handmatige voertuigkeuze en lokale locatiefuncties blijven
wel bruikbaar.

**Technische koppeling:** [DEV-04 en DEV-11](ontwikkelstatus.md#beweringen).

#### KLANT-13 Kentekeninformatie, adreszoeken en handtekening in het formulier

**Randvoorwaarden:** geen; formulieren die deze invoer vereisen zijn nog niet volledig af te nemen.

**Stappen:** niet uitvoeren als volledig formulieracceptatiescenario.

**Verwacht resultaat:** automatisch voertuiggegevens ophalen, een adres zoeken en een handtekening
vastleggen of versturen zijn niet beschikbaar in deze versie.

**Technische koppeling:** [DEV-15](ontwikkelstatus.md#beweringen).

#### KLANT-14 Productie-uitrol en monitoring

**Randvoorwaarden:** geen; dit is nog geen productieacceptatie.

**Stappen:** geen store- of productieacceptatie uitvoeren op basis van deze checklist.

**Verwacht resultaat:** monitoring, store-publicatie en een geaccepteerde productiebuild zijn nog
niet beschikbaar als afgeronde oplevering.

**Technische koppeling:** [DEV-12](ontwikkelstatus.md#beweringen).

## Beweringen

| ID       | Acceptatiebewering                                                                                                                | Technische koppeling                                       | Code                                                                                                                                                                                                    | Test                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| KLANT-01 | Een externe tester kan met telefoon en SMS-code inloggen en krijgt bij een onjuiste code herstelbare feedback.                    | FLOW-03, DEV-02                                            | `src/domeinen/auth/screens/login-screen.tsx`                                                                                                                                                            | `src/domeinen/auth/service/auth-service.test.ts`, `src/bootstrap/container.test.ts`                                                        |
| KLANT-02 | Een interne tester kan inloggen, annuleren zonder technische fout en een geldige sessie na herstart hervatten.                    | FLOW-01, FLOW-03, DEV-02                                   | `src/domeinen/auth/platform/rn/internal-auth.ts`, `src/bootstrap/container.ts`                                                                                                                          | `src/domeinen/auth/platform/rn/internal-auth.test.ts`, `src/bootstrap/container.test.ts`                                                   |
| KLANT-03 | Een tester zonder geldige eenheid krijgt het passende registratiescherm en bereikt na geldige registratie de opdrachtenlijst.     | FLOW-05, DEV-04                                            | `src/domeinen/onboarding/screens/onboarding-gate-screen.tsx`, `src/domeinen/allocation-unit/screens/register-unit-screen.tsx`, `src/domeinen/allocation-unit/screens/register-internal-unit-screen.tsx` | `src/domeinen/onboarding/domain/next-step.test.ts`, `src/domeinen/allocation-unit/service/allocation-unit-service.test.ts`                 |
| KLANT-04 | Met echte opdrachten zijn lijst, verversen, accepteren, afwijzen en overdragen handmatig te beoordelen.                           | FLOW-06, FLOW-07, DEV-05, DEV-07                           | `src/domeinen/allocations/screens/allocations-screen.tsx`, `src/domeinen/allocations/components/allocation-reassign-sheet.tsx`                                                                          | `src/domeinen/allocations/service/allocation-actions-service.test.ts`, `src/domeinen/allocations/service/reassign-service.test.ts`         |
| KLANT-05 | Met echte diensten en PLTR zijn groepering, locatiebevestiging, fasen en afronden handmatig te beoordelen.                        | FLOW-08, FLOW-09, FLOW-10, DEV-06, DEV-08                  | `src/domeinen/allocations/screens/services-screen.tsx`, `src/domeinen/allocations/screens/pltr-screen.tsx`                                                                                              | `src/domeinen/allocations/service/service-actions-service.test.ts`, `src/domeinen/services/domain/pltr.test.ts`                            |
| KLANT-06 | Met een echt ondersteund schema zijn formulier, concept, foto's en succesvolle verzending handmatig te beoordelen.                | FLOW-11, FLOW-12, FLOW-13, FLOW-14, DEV-09, DEV-13, DEV-14 | `src/domeinen/service-form/screens/service-form-screen.tsx`, `src/domeinen/photos/screens/photo-overview-screen.tsx`                                                                                    | `src/domeinen/service-form/service/service-form-service.test.ts`, `src/domeinen/photos/service/photo-service.test.ts`                      |
| KLANT-07 | Met een echte verbindingsonderbreking zijn bewaarde lijst, wachtrij, sessiebehoud en herstel handmatig te beoordelen.             | FLOW-15, DEV-12                                            | `src/domeinen/outbox/service/outbox-service.ts`, `src/shared/query/query-cache-store.ts`                                                                                                                | `src/domeinen/outbox/service/outbox-service.test.ts`, `src/shared/query/query-cache-store.test.ts`, `src/bootstrap/container.test.ts`      |
| KLANT-08 | Met echte statusopties is een wijziging van medewerkerbeschikbaarheid handmatig te beoordelen.                                    | FLOW-18, DEV-16                                            | `src/domeinen/worker/screens/availability-screen.tsx`                                                                                                                                                   | `src/domeinen/worker/service/worker-availability-service.test.ts`, `src/domeinen/worker/api/worker-api.test.ts`                            |
| KLANT-09 | Met een fysiek toestel en werkende pushconfiguratie zijn voorgrond, achtergrond, koude start en historie handmatig te beoordelen. | FLOW-19, DEV-10                                            | `src/domeinen/notifications/`, `src/bootstrap/notification-actions.ts`                                                                                                                                  | `src/domeinen/notifications/service/push-runtime.test.ts`, `src/bootstrap/notification-actions.test.ts`, `src/bootstrap/container.test.ts` |
| KLANT-10 | Op een echt toestel zijn taalbehoud en de drie toestemmingsroutes handmatig te beoordelen.                                        | FLOW-16, FLOW-17, DEV-11                                   | `src/domeinen/settings/screens/settings-screen.tsx`, `src/domeinen/settings/screens/permissions-screen.tsx`                                                                                             | `src/domeinen/settings/service/language-settings.test.ts`, `src/domeinen/settings/domain/permission-step.test.ts`                          |
| KLANT-11 | Supportdelen en uitloggen zijn met echte systeemdeling en herstart handmatig te beoordelen.                                       | FLOW-20, DEV-12                                            | `src/domeinen/support/screens/support-screen.tsx`, `src/bootstrap/container.ts`                                                                                                                         | `src/domeinen/support/domain/export.test.ts`, `src/bootstrap/container.test.ts`                                                            |
| KLANT-12 | QR-selectie, eenheid afmelden en live locatie delen zijn niet beschikbaar voor acceptatie.                                        | DEV-04, DEV-11                                             | —                                                                                                                                                                                                       | —                                                                                                                                          |
| KLANT-13 | Voertuiggegevens ophalen, adreszoeken en handtekening in het formulier zijn niet beschikbaar voor volledige formulieracceptatie.  | DEV-15                                                     | —                                                                                                                                                                                                       | —                                                                                                                                          |
| KLANT-14 | Monitoring, store-publicatie en productieacceptatie zijn nog geen afgeronde oplevering.                                           | DEV-12                                                     | —                                                                                                                                                                                                       | —                                                                                                                                          |

## Randgevallen en bewuste keuzes

- Voer muterende scenario's alleen uit met vooraf afgesproken testdata; accepteer of rond geen echte
  productieopdracht af.
- Een scenario is niet afgewezen wanneer vereiste testdata ontbreekt. Gebruik dan **geblokkeerd
  door testdata** en noteer wat ontbrak.
- Een tijdelijk netwerkprobleem mag geen uitlog veroorzaken.
- Deel bij bewijs geen screenshots of bestanden met persoonsgegevens, codes of toegangsinformatie.
- Afwijkingen ten opzichte van eerder gedrag staan in
  [bekende fouten](../functioneel/bekende-fouten-oude-app.md).

## Open vragen

- Voor pushacceptatie moet de backendroute via de Expo-pushdienst worden bevestigd; zie open vraag
  [21](../functioneel/open-vragen.md).
- Live locatie en eenheid afmelden wachten op open vragen
  [14 en 23](../functioneel/open-vragen.md).
- Productiepublicatie en monitoring wachten op open vragen
  [10 en 15](../functioneel/open-vragen.md).
- De definitieve formulieracceptatie hangt af van open vragen
  [26 tot en met 29](../functioneel/open-vragen.md).
