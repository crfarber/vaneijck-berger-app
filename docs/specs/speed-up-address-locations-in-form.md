# Spec — Snellere personen, adressen en locaties in het verwerkingsformulier

|                |                                                                                                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status         | Concept                                                                                                                                                                                                                                             |
| Datum          | 12-10-2026                                                                                                                                                                                                                                          |
| Raakt          | berger-app (`service-form`), management portal (definition builder)                                                                                                                                                                                 |
| Bouwt voort op | [ADR 0026 adresgroepen](../decisions/0026-adresgroepen-in-serviceform.md), [ADR 0027 kentekengroepen](../decisions/0027-kentekengroepen-in-serviceform.md), [ADR 0028 persoonsnaamgroepen](../decisions/0028-persoonsnaamgroepen-in-serviceform.md) |

## 1. Aanleiding

Het invullen van personen, adressen en locaties kost de berger veel tijd. Elke persoon en elk adres bestaat in de definitie uit 9 tot 16 losse velden onder elkaar. De adresgroep (`address_group`, ADR 0026) laat zien dat het sneller kan: postcode en huisnummer, lookup, bevestigen, samenvatting. Die groep wordt bijna nergens gebruikt.

Deze spec beschrijft:

- waar de adresgroep direct toegepast kan worden;
- hoe de adresgroep een keuze uit een bestaande lijst (depot) kan aanbieden vóór de postcodelookup;
- een persoonsgroep die naam, contact en adres in één kaart toont;
- wat de definition builder daarvoor nodig heeft.

## 2. Uitgangspunten

- **De CRM-velden blijven plat en ongewijzigd.** Groepen zijn metadata op een ankerveld, net als `address_group` en `license_plate_group`. Oudere apps en het CRM negeren de metadata.
- **Eén basis.** Alles wat een adres is, gebruikt `address_group`. Nieuwe gedragingen worden een optie van die groep, geen nieuw component.
- **Zonder metadata verandert er niets.** Een definitie zonder groep rendert zoals nu.
- **Lokaal eerst.** Lijsten uit de referentiedata (`dn_locations`, `dn_country`, `leasecompany`, `insurancecompany`) werken zonder netwerk. De postcodelookup en "snel zoeken" hebben netwerk nodig en komen daarom pas daarna.
- **Geen aannames over CRM-gedrag.** Wat we niet weten staat in §9 en in `docs/functioneel/open-vragen.md`.

## 3. Huidige situatie (experiment-definities)

Bron: de bestanden in `docs/diensten/experiment` (Berging_Test is verwijderd).

| Blok              | Voorvoegsel             | Diensten | Velden per fase | Zichtbaar bij                                         |
| ----------------- | ----------------------- | -------- | --------------- | ----------------------------------------------------- |
| Bestuurder        | `dn_driver…`            | 9        | ~16             | `dn_driverstatecode`                                  |
| Kentekenhouder    | `dn_registrationowner…` | 10       | ~14             | `dn_alternativeregistrationownercode`                 |
| Verzekeringsnemer | `dn_insurer…`           | 7        | ~14             | `dn_alternativeinsurercode`                           |
| Afleveradres      | `dn_delivery…`          | 9        | ~9              | afhandelingscode of `dn_deliveryaddressavailablecode` |
| Taxi van/naar     | `dn_requesttaxi…`       | 3        | 4               | `dn_requesttaxi`                                      |
| Depot             | `_dn_locationid_value`  | 14       | 1               | afhandelingscode of `dn_towtodepotcode`               |

Bevindingen:

1. `address_group` staat in alle definities maar één keer: bestuurder in Berging fase 1. Fase 2 van dezelfde dienst mist hem.
2. De rollen van een persoon zijn overal gelijk:
   - naam: aanhef, voorletters, (voornaam), tussenvoegsel, achternaam;
   - contact: telefoon 1 en 2, e-mail;
   - adres: postcode, huisnummer, toevoeging, straat, plaats, land;
   - in de Berging-familie ook een bedrijf (`_dn_…accountid_value`).
3. In Berging staat het afleveradresblok twee keer in dezelfde tab, met dezelfde veldnamen. Eén keer optioneel (`dn_deliveryaddressavailablecode` = 0/false) en één keer verplicht (= 1/true).
4. Depot is een keuzelijst uit `dn_locations`, gesorteerd op afstand (`orderby: distance`). Het veld vult geen adresvelden.
5. Afgifte heeft geen locatieveld: de locatie komt van de opdracht (`dn_locationId` van het afgifte-item). Planbaar transport toont laad- en afleverlocatie als alleen-lezen tekst die het CRM invult.

## 4. Adresgroep op alle adresblokken

Elk blok uit §3 met postcode, huisnummer, straat en plaats krijgt een `address_group`, in **alle fases**. Er is geen nieuwe app-code nodig, behalve de afwijkingen hieronder.

- **Alleen postcode en huisnummer** (taxi van/naar). `street` en `city` worden optioneel in de groep. Zonder die rollen toont de samenvatting het gevonden adres wel, maar schrijft alleen postcode en huisnummer weg.
- **Dubbele blokken** (Berging). Die worden in de definitie samengevoegd tot één blok met één groep. Verplicht/optioneel volgt dan uit de waarde van `dn_deliveryaddressavailablecode`. Tot die opschoning gedaan is, krijgen deze blokken geen groep: de app zoekt velden op naam op en kan de twee kopieën niet uit elkaar houden.

## 5. Bronnen in de adresgroep (depot en andere lijsten)

### 5.1 Definitie

`address_group` krijgt een optionele lijst `sources`, op volgorde van voorkeur:

```json
"address_group": {
  "id": "delivery",
  "flow": "nl_postal_lookup",
  "fields": {
    "name": "dn_deliveryname",
    "postalCode": "dn_deliverypostalcode",
    "houseNumber": "dn_deliveryhouseno",
    "addition": "dn_deliveryhousenoaddition",
    "street": "dn_deliverystreet",
    "city": "dn_deliverycity",
    "country": "_dn_deliverycountryid_value"
  },
  "sources": [
    { "kind": "reference", "field": "_dn_locationid_value", "fillAddress": true },
    { "kind": "postal_lookup" },
    { "kind": "places" },
    { "kind": "manual" }
  ]
}
```

| `kind`          | Betekenis                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `reference`     | Kies uit een selectveld in dezelfde tab. De opties komen uit het eigen `table` van dat veld, met de eigen sortering. |
| `postal_lookup` | De huidige postcode- en huisnummerflow                                                                               |
| `places`        | "Gebruik snel zoeken"                                                                                                |
| `manual`        | Handmatig invullen, inclusief buitenland (volgt `allowManual` en `allowForeignManual`)                               |

Zonder `sources` geldt de huidige volgorde: postcodelookup, snel zoeken, handmatig.

### 5.2 Gedrag in de app

1. **Eerst de lijst.** Staat `reference` vooraan, dan toont de kaart eerst de drie dichtstbijzijnde opties als knoppen, met "Ander depot…" voor de zoeklijst. "Ander adres" opent de volgende bron.
2. **Een optie gekozen.** Het selectveld krijgt de gekozen waarde, zoals bij een gewone keuzelijst. Met `fillAddress: true` vult de app de naam- en adresrollen uit de gekozen rij, als die rij ze bevat (open vraag 38). Daarna toont de kaart de samenvatting.
3. **Is het selectveld niet zichtbaar** volgens `requiredvisibility`, dan slaat de kaart de `reference`-bron over.
4. **Opnieuw.** "Opnieuw" wist het selectveld en de adresrollen samen.
5. **Wordt het adres op een andere manier ingevuld** (postcode, snel zoeken, handmatig), dan wist de app een eerder gekozen depot. Hangt af van open vraag 39.

### 5.3 Alleen een depot, zonder adresblok

Voor diensten waar alleen `_dn_locationid_value` staat (Belastingdienst, Ontruiming, Politietakel, Incident management) komt er geen adresgroep. De keuzelijst krijgt dezelfde snelle weergave: dichtstbijzijnde knoppen plus zoeken. Dit is een weergave-optie op het selectveld:

```json
"autoform": {
  "value": "_dn_locationid_value",
  "quickPicks": 3
}
```

`quickPicks` is een positief geheel getal. De app toont de eerste N opties als chips (na de bestaande sortering, dus dichtstbijzijnde eerst bij `orderby: distance`) en opent via "Meer opties…" de gewone keuzelijst. Zonder `quickPicks` blijft het selectveld zoals nu. In de builder is 3 de standaardwaarde.

Quick picks en "Meer opties…" delen één TanStack Query-cache (`serviceFormSelectOptionsQueryKey`), zodat de sheet geen tweede tabel- en GPS-load afwacht. Afstandssortering vraagt de LocatieReader met `accuracy: coarse` (~1 km; Expo `Accuracy.Low`); fine GPS blijft voor acceptatie (500 m) en foto-coördinaten.

### 5.4 Per dienst

| Situatie                     | Diensten                                                                                                | Toepassing                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Depot plus afleveradres      | Achtergelaten voertuig, Direct transport, Verzekeringsdienstverlening, Zware berging, Berging, Pechhulp | Adresgroep met `reference` als eerste bron         |
| Depot en adres apart         | Wegsleepverordening                                                                                     | Twee kaarten: depotkeuze (§5.3) en adresgroep (§4) |
| Alleen depot                 | Belastingdienst, Ontruiming, Politietakel, Incident management                                          | Depotkeuze met snelle knoppen (§5.3)               |
| Locatie vast van de opdracht | Afgifte, Planbaar transport                                                                             | Geen wijziging                                     |

## 6. Persoonsgroep

### 6.1 Definitie

Op het eerste veld van een persoonsblok (meestal aanhef). In `docs/diensten/experiment` staan
`person_group` en `address_group` op **bestuurder**, **kentekenhouder** en **verzekeringsnemer**,
met vaste schermvolgorde: gate → status (alleen bestuurder) → bedrijf (indien aanwezig) →
naamgroep → contact → adresmodule.

```json
"person_group": {
  "id": "driver",
  "label": [
    { "language-code": 1043, "value": "Bestuurder" },
    { "language-code": 1044, "value": "Driver" }
  ],
  "flow": "person_v1",
  "gate": "dn_driverstatecode",
  "fields": {
    "salutation": "dn_driversalutationcode",
    "initials": "dn_driverinitials",
    "firstName": "dn_driverfirstname",
    "middleName": "dn_drivermiddlename",
    "lastName": "dn_driverlastname",
    "phone1": "dn_drivertelephonenumber1",
    "phone2": "dn_drivertelephonenumber2",
    "email": "dn_driveremail",
    "company": "_dn_driveraccountid_value"
  },
  "addressGroupId": "dn_driverpostalcode",
  "copyFrom": null
}
```

Kentekenhouder (`id: registrationowner`, gate `dn_alternativeregistrationownercode`) en
verzekeringsnemer (`id: insurer`, gate `dn_alternativeinsurercode`) gebruiken dezelfde structuur
met hun eigen veldnamen. Groeptitels: Bestuurder / Kentekenhouder / Verzekeringsnemer.

- `lastName` is de enige verplichte rol. De rest is optioneel, omdat de definities verschillen (voornaam of voorletters, wel of geen bedrijf).
- `gate` is het selectveld dat de persoon aan- of uitzet. De kaart gebruikt dezelfde zichtbaarheidsregel als nu; ze voegt geen nieuwe regel toe.
- `addressGroupId` verwijst naar het ankerveld van een `address_group` in dezelfde tab. Het adres blijft een eigen groep.
- `copyFrom` verwijst naar de `id` van een andere persoonsgroep in hetzelfde formulier.

### 6.2 Gedrag in de app

**v1 (naamrollen, [ADR 0028](../decisions/0028-persoonsnaamgroepen-in-serviceform.md)):**

1. **Snelle naaminvoer:** één vrij tekstveld plus knop **Verdelen**. Bij bevestigen (niet per toetsaanslag) parst de app lokaal (aanhef-aliassen, voorletters, NL-tussenvoegsels, conservatief bij buitenlandse namen).
2. **Bevestiging:** dialoog “Klopt deze verdeling?” met de voorgestelde rollen. **Ja** schrijft batch naar de gemapte CRM-velden en laat de ingetikte tekst in het vrije veld staan; de knop wordt **Opnieuw** (wist alleen de afgeleide rollen). **Nee** schrijft niets weg.
3. **Handmatig:** aanhef als knoppen (opties uit de tabel van het veld) plus voorletters, voornaam, tussenvoegsel en achternaam blijven altijd bewerkbaar. Wijzigen van het vrije veld wist afgeleide naamrollen opnieuw.
4. Contact, adres, bedrijf, gate-kaart, samenvatting en `copyFrom` blijven in v1 gewone losse velden / later.

**Later (volle persoonskaart):**

1. **Kop:** label plus de `gate`-schakelaar. Uit betekent een dichte kaart.
2. **Naam:** zoals v1 (snel + handmatig).
3. **Contact:** telefoon 1 en e-mail. Telefoon 2 zit achter "+ extra nummer"; de app toont het veld direct als het verplicht is of al een waarde heeft.
4. **Adres:** de gekoppelde adresgroep, als blok in de kaart.
5. **Bedrijf:** de keuzelijst uit de eigen tabel van het veld (`leasecompany`, `insurancecompany`, `dn_account`).
6. **Samenvatting:** zijn alle verplichte rollen gevuld, dan klapt de kaart dicht tot één regel ("Dhr. J. de Vries · 06… · Dorpsstraat 1, Utrecht"). Tikken opent hem weer.
7. **"Zelfde als bestuurder"** (met `copyFrom`): kopieert de antwoorden van de andere groep naar de eigen rollen, inclusief het adres. Er worden alleen antwoorden gezet. Zie open vraag 40.
8. **Validatie:** dezelfde validaties per veld als nu. Een fout opent de kaart en springt naar het veld.

## 7. Definition builder

### 7.1 Groepen herkennen

Een knop **"Groepen herkennen"** op de definitie:

- **Per tab en per fase:** groeperen op **achtervoegsel**, niet op een vaste lijst voorvoegsels. Een voorvoegsel met `postalcode`, `houseno`, `street` en `city` in dezelfde tab is een adresblok. Alleen `zipcode{from,to}` en `houseno{from,to}` (taxi-route) is ook een adresblok, met optionele straat en plaats. Een voorvoegsel met `lastname` erbij is later een persoonsblok.
- **Een lijst met voorstellen**, bijvoorbeeld: "Bestuurder: adres, 6 velden, fase 1 en 2". Per voorstel kun je de rollen controleren. Een landveld met een ander type dan `select` wordt niet gekoppeld.
- **Dubbele veldnamen** in een tab: dat blok wordt overgeslagen en gemarkeerd (bijvoorbeeld het afleveradres in Berging).
- **Combinatie met een depot** (later, stap 4): staat er een `_dn_locationid_value` in dezelfde tab als een afleverblok én is het onder dezelfde voorwaarde zichtbaar, dan stelt de builder de `reference`-bron voor.
- **Toepassen** schrijft `address_group` (en later `person_group`) op de ankervelden.

### 7.2 Voor alle fases

De sheets voor adres, kenteken en persoon krijgen de keuze **"Ook toepassen op andere fases"**, standaard aan. Een groep wordt alleen gekopieerd naar tabs waar alle gekoppelde velden met dezelfde naam bestaan. De builder meldt welke fases overgeslagen zijn.

### 7.3 Adresgroep-sheet

- **Een blok "Bronnen":** bronnen toevoegen, verwijderen en ordenen.
- **Bron "Uit lijst":** kies een selectveld met een `table` uit dezelfde tab, plus het vinkje "Adres invullen vanuit lijst".
- **Straat en plaats optioneel** (voor taxi).
- **Een waarschuwing** als het lijstveld en de adresvelden een andere `requiredvisibility` hebben.

### 7.4 Persoonsgroep-sheet en -kaart

- **`PersonGroupSheet`:**
  - ankerveld, label nl/en;
  - rollen per dropdown, vooraf ingevuld op basis van het voorvoegsel;
  - het `gate`-veld;
  - de gekoppelde adresgroep (of meteen aanmaken);
  - "kopiëren van".
- **`PersonGroupCard` in de preview:** één kaart in plaats van de losse velden, met de adreskaart erin.

### 7.5 Controles

- Dubbele veldnamen binnen één tab geven een waarschuwing, met de vraag om de kopieën samen te voegen voordat er een groep op komt.
- Een `addressGroupId` of `copyFrom` die niet bestaat, geeft een fout bij opslaan.
- Elk veld zit in hoogstens één groep. Uitzondering: een adresgroep die bij een persoon hoort.

### 7.6 Export en typen

- `person_group` en `address_group.sources` in de typen.
- `person_group` doorlaten in `sanitize-document-for-export`.
- Locales nl/en voor alle nieuwe teksten.

## 8. Volgorde

| Stap | Inhoud                                                                  | App                             | Builder   |
| ---- | ----------------------------------------------------------------------- | ------------------------------- | --------- |
| 1    | Groepen herkennen en voor alle fases opslaan, alleen `address_group`    | —                               | ja        |
| 2    | Adresgroep op alle adresblokken in de experiment-definities (§4)        | klein (straat/plaats optioneel) | ja        |
| 3    | Snelle depotkeuze (`autoform.quickPicks`, §5.3)                         | ja                              | klein     |
| 4    | `sources` met `reference` in de adresgroep (§5), na open vraag 38 en 39 | ja                              | ja        |
| 5    | Persoonsgroep (§6)                                                      | ja                              | ja        |
| 6    | Dubbele afleverblokken in Berging opschonen                             | —                               | definitie |

Elke stap is los te leveren. Stap 1 tot en met 3 maken adressen en depots al sneller zonder de open vragen over `dn_locations`.

## 9. Open vragen

Deze staan in `docs/functioneel/open-vragen.md`:

| #   | Vraag                                                                                                                  | Aanname tot antwoord                                                                    | Voor    |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------- |
| 38  | Welke velden heeft een rij in `dn_locations`: naam, straat, postcode, huisnummer, plaats, land?                        | Alleen `dn_name`, `dn_locationid` en coördinaten; `fillAddress` vult dan alleen de naam | backend |
| 39  | Vult het CRM het afleveradres zelf in als `_dn_locationid_value` gezet is?                                             | Nee; de app stuurt de adresvelden zoals de berger ze invult                             | backend |
| 40  | Neemt de backend de bestuurder over als kentekenhouder of verzekeringsnemer als de "alternatief"-schakelaar uit staat? | Nee; "Zelfde als bestuurder" vult de velden in de app zelf in                           | backend |
| 41  | Laat het CRM `person_group` en `address_group.sources` ongemoeid op een veld staan, net als `address_group`?           | Ja, zoals bij open vraag 37                                                             | backend |
| 42  | Mogen de twee afleverblokken in Berging samengevoegd worden?                                                           | Ja; het verschil zit alleen in verplicht/optioneel                                      | product |

## 10. Acceptatiecriteria

- Een definitie zonder nieuwe metadata rendert exact zoals nu (regressietest).
- Een adresgroep met alleen postcode en huisnummer toont een samenvatting uit de lookup en schrijft geen straat of plaats weg.
- Een selectveld met `autoform.quickPicks: 3` toont de eerste drie opties als chips (dichtstbijzijnde eerst bij afstandssortering) en opent via "Meer opties…" de gewone lijst.
- Zonder `quickPicks` blijft het selectveld ongewijzigd.
- De builder herkent adresblokken op achtervoegsel en schrijft een groep in alle fases waarin de velden bestaan; overgeslagen fases worden gemeld.
- Dubbele veldnamen in een tab blokkeren een groep op dat blok.
- Elke regel in `domain/` heeft een test; race conditions in lookups worden getest met `deferred()`.
