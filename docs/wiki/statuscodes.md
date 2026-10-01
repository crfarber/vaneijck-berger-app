# Statuscodes

> Gecontroleerd op: `ba1383c` (2026-09-23)
> Bronnen: `src/domeinen/allocations/domain/status.ts`, `src/domeinen/services/domain/status.ts`, `src/domeinen/worker/domain/availability.ts`, `src/shared/i18n/resources.ts`, `docs/functioneel/statussen.md`
> Zie ook: [statussen en regels](../functioneel/statussen.md), [bekende fouten](../functioneel/bekende-fouten-oude-app.md), [open vragen](../functioneel/open-vragen.md)

## Waarvoor

Deze pagina legt de CRM-statuscodes vast waarmee de app opdrachten, incidenten, diensten en de
beschikbaarheid van de berger interpreteert. De tabellen zijn zelf de specificatie; waarden en namen
zijn uitsluitend overgenomen uit de actuele code en `docs/functioneel/statussen.md`.

## Hoe het werkt

Statuscodes komen als getallen uit API-antwoorden binnen. De API-schema's behouden die getallen,
waarna pure domeinfuncties bepalen wat zichtbaar, open, verzendbaar of wijzigbaar is. De UI toont
het resultaat van die domeinregels; er is geen algemene statusservice of apart statusendpoint.

## Opdrachtstatussen

Bron: `src/domeinen/allocations/domain/status.ts`. De lijstcategorie is de uitkomst voor een open
CRM-record (`statecode` is `0`).

|        Code | Betekenis                                    | Lijstcategorie |
| ----------: | -------------------------------------------- | -------------- |
|         `1` | Aangestuurd                                  | wachtend       |
|         `2` | Abusievelijk aangestuurd                     | actief         |
| `875920000` | Aanrijdend                                   | actief         |
| `875920001` | Ter plaatse                                  | actief         |
| `875920002` | Vervoer                                      | actief         |
| `875920003` | Reeds voldoende aansturing op incident       | actief         |
| `875920004` | Andere eenheid sneller op incidentlocatie    | actief         |
| `875920005` | In overleg met planning geweigerd            | actief         |
| `875920006` | Medewerker niet beschikbaar                  | actief         |
| `875920007` | Ander incident met PRIO; wacht op overdracht | actief         |
| `875920008` | Geen diensten meer in incident               | actief         |
| `875920010` | Medewerker met pauze                         | actief         |
| `875920011` | Medewerker einde dienst                      | actief         |
| `875920012` | Zelf met pech/schade gestrand                | actief         |
| `875920013` | Geen geschikt hulpverleningsvoertuig         | actief         |
| `875920015` | Ondersteuning verleend                       | actief         |
| `875920016` | Van voertuig gewisseld                       | actief         |

Vaste statuscodes voor opdrachtacties:

|        Code | Gebruik                                |
| ----------: | -------------------------------------- |
| `875920000` | opdracht accepteren                    |
| `875920014` | opdracht afronden via de afwijsaanroep |

## Incidentstatussen

Bron: `src/domeinen/allocations/domain/status.ts`.

|        Code | Identifier       | Betekenis       |
| ----------: | ---------------- | --------------- |
|         `1` | `NEW`            | nieuw           |
| `875920007` | `FORWARDED`      | aangestuurd     |
| `875920000` | `ACCEPTED`       | geaccepteerd    |
| `875920001` | `IN_PROGRESS`    | in uitvoering   |
| `875920002` | `ARRIVED`        | aankomst        |
| `875920003` | `LAST_DEPARTURE` | laatste vertrek |
|         `2` | `CLOSED`         | gesloten        |
| `875920004` | `CANCELLED`      | geannuleerd     |
| `875920005` | `MERGED`         | samengevoegd    |

## Dienststatussen

Bron: `src/domeinen/services/domain/status.ts`. `—` betekent dat geen stap van de dienstflow van
toepassing is.

|        Code | Identifier                      | Verzenden | Open werk | Lijst    | Fase       |
| ----------: | ------------------------------- | :-------: | :-------: | -------- | ---------- |
| `875920014` | `NOG_AANSTUREN`                 |    ja     |    ja     | wachtend | laden      |
|         `1` | `WACHT_OP_ACCEPTATIE_TP`        |    ja     |    ja     | wachtend | accepteren |
| `875920000` | `IN_UITVOERING`                 |    ja     |    ja     | actief   | laden      |
| `875920004` | `HULPVERLENING_AKKOORD`         |    ja     |    ja     | actief   | afleveren  |
| `875920005` | `HULPVERLENING_AFGEROND`        |    ja     |    nee    | afgerond | —          |
| `875920003` | `LAATSTE_BERICHT`               |    ja     |    nee    | wachtend | afgerond   |
| `875920006` | `VERGEEFSE_RIT`                 |    nee    |    nee    | wachtend | —          |
| `875920007` | `NACONTROLE`                    |    nee    |    nee    | wachtend | —          |
| `875920017` | `AFMELDING_GEWEIGERD`           |    nee    |    nee    | wachtend | —          |
| `875920009` | `OPSLAG`                        |    nee    |    nee    | wachtend | —          |
| `875920010` | `WACHT_OP_ORDERNUMMER`          |    nee    |    nee    | wachtend | —          |
| `875920018` | `DOORBROEP_CONTROLE`            |    nee    |    nee    | wachtend | —          |
| `875920016` | `GECONTROLEERD`                 |    nee    |    nee    | wachtend | —          |
| `875920019` | `NOG_ONDERWEG`                  |    nee    |    nee    | wachtend | —          |
| `875920008` | `FACTUREERBAAR`                 |    nee    |    nee    | wachtend | —          |
| `875920012` | `GEFACTUREERD`                  |    nee    |    nee    | wachtend | —          |
| `875920013` | `FACTUUR_OP_VERVOLGDIENST`      |    nee    |    nee    | wachtend | —          |
| `875920011` | `DUPLICAATMELDING`              |    nee    |    nee    | wachtend | —          |
| `875920020` | `COULANCE`                      |    nee    |    nee    | wachtend | —          |
| `875920021` | `GECORRIGEERD_OP_ANDERE_DIENST` |    nee    |    nee    | wachtend | —          |
| `875920001` | geen naam in `SERVICE_STATUS`   |    nee    |    ja     | actief   | —          |

## Medewerkerstatussen

Bronnen: `src/domeinen/worker/domain/availability.ts` en `src/shared/i18n/resources.ts`. De labels
zijn de Nederlandse fallbackteksten; een label uit gesynchroniseerde referentiedata heeft voorrang.

|        Code | Identifier          | Nederlandse fallback    | Kleurtoon    | Kiesbaar extern | Kiesbaar intern |
| ----------: | ------------------- | ----------------------- | ------------ | :-------------: | :-------------: |
| `875920000` | `AVAILABLE`         | Beschikbaar             | succes       |       ja        |       ja        |
| `875920001` | `UNAVAILABLE`       | Niet beschikbaar        | gevaar       |       ja        |       ja        |
| `875920002` | `NOT_ON_DUTY`       | Niet in dienst          | gevaar       |       nee       |       ja        |
| `875920003` | `BREAK`             | Pauze                   | waarschuwing |       nee       |       ja        |
| `875920004` | `TRAINING`          | Training/opleiding      | waarschuwing |       nee       |       ja        |
| `875920005` | `MEETING`           | In vergadering          | gevaar       |       nee       |       ja        |
| `875920006` | `AVAILABLE_ON_CALL` | Beschikbaar piketdienst | succes       |       nee       |       ja        |
| `875920007` | `BACKUP`            | Als back-up beschikbaar | waarschuwing |       nee       |       ja        |
| `875920008` | `BUSY`              | Bezig met opdracht(en)  | gevaar       |       nee       |       nee       |

## Beweringen

| ID        | Bewering                                                                                                                                     | Code                                                                                                        | Test                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| STATUS-01 | Een gesloten opdracht is verborgen, behalve wanneer status `875920007` aangeeft dat overdracht nog loopt.                                    | `src/domeinen/allocations/domain/status.ts`                                                                 | `src/domeinen/allocations/domain/status.test.ts`        |
| STATUS-02 | Een onbekende opdrachtstatus wordt verborgen.                                                                                                | `src/domeinen/allocations/domain/status.ts`                                                                 | `src/domeinen/allocations/domain/status.test.ts`        |
| STATUS-03 | Alleen incidentstatus `875920003` geldt als afgerond.                                                                                        | `src/domeinen/allocations/domain/status.ts`                                                                 | `src/domeinen/allocations/domain/status.test.ts`        |
| STATUS-04 | Een onbekende dienststatus is niet verzendbaar, staat in de wachtende lijst en telt wel als open werk.                                       | `src/domeinen/services/domain/status.ts`                                                                    | `src/domeinen/services/domain/status.test.ts`           |
| STATUS-05 | Een dienst zonder status telt niet als open werk.                                                                                            | `src/domeinen/services/domain/status.ts`                                                                    | `src/domeinen/services/domain/status.test.ts`           |
| STATUS-06 | De dienstfase is alleen accepteren voor `1`, laden voor `875920014` en `875920000`, afleveren voor `875920004` en afgerond voor `875920003`. | `src/domeinen/services/domain/status.ts`                                                                    | `src/domeinen/services/domain/status.test.ts`           |
| STATUS-07 | De medewerkerstatus gebruikt eerst het label uit referentiedata, daarna de Nederlandse fallback voor een bekende code en anders “onbekend”.  | `src/domeinen/worker/domain/availability-label.ts`, `src/domeinen/worker/components/worker-status-pill.tsx` | `src/domeinen/worker/domain/availability-label.test.ts` |
| STATUS-08 | Een externe berger kan alleen `875920000` en `875920001` kiezen.                                                                             | `src/domeinen/worker/domain/availability.ts`                                                                | `src/domeinen/worker/domain/availability.test.ts`       |
| STATUS-09 | Een interne berger kan alle aangeleverde medewerkerstatussen kiezen behalve `875920008`.                                                     | `src/domeinen/worker/domain/availability.ts`                                                                | `src/domeinen/worker/domain/availability.test.ts`       |
| STATUS-10 | Medewerkerstatus `875920008` wordt alleen getoond en kan niet vanuit de statuspill worden gewijzigd.                                         | `src/domeinen/worker/domain/availability.ts`, `src/domeinen/worker/components/worker-status-pill.tsx`       | `src/domeinen/worker/domain/availability.test.ts`       |

## Randgevallen en bewuste keuzes

- `VERVALLEN` staat niet in `SERVICE_STATUS`, omdat daarvoor dezelfde code `875920018` was
  vastgelegd als voor `DOORBROEP_CONTROLE`. Dit voorkomt regressie 1 uit
  [bekende fouten](../functioneel/bekende-fouten-oude-app.md).
- De app gebruikt één actuele statusbron per begrip en neemt de overlappende historische
  incidentlijsten niet over. Dit voorkomt regressie 18 uit
  [bekende fouten](../functioneel/bekende-fouten-oude-app.md).
- De onderwerpkaart noemt `worker/domain/status.ts` als bron voor medewerkerstatussen; de
  beschikbaarheidscodes staan daadwerkelijk in `worker/domain/availability.ts`.

## Open vragen

- [Open vraag 1](../functioneel/open-vragen.md): de echte code van `VERVALLEN` is onbekend; de status
  ontbreekt daarom bewust.
- [Open vraag 5](../functioneel/open-vragen.md): een onbekende dienststatus telt voorlopig als open
  werk, maar mag niet worden verzonden.
- [Open vraag 7](../functioneel/open-vragen.md): `875920003` en `875920005` tellen voorlopig beide
  niet als open werk.
- De volledige set actieve opdrachtcodes, alle incidentconstanten en alle medewerkerconstanten
  worden niet tabelgedreven op hun exacte waarden getest. De gedragstests dekken representatieve
  waarden en beslisregels, maar niet iedere tabelrij.
