# Statussen en regels

De getallen zijn CRM-optiesetwaarden (`statuscode`). De namen zijn de Nederlandse labels uit de oude code. Bron in de nieuwe app: `src/domeinen/services/domain/status.ts` en `src/domeinen/allocations/domain/status.ts`. Alles wat hier staat heeft een test.

## Dienststatussen

| Code      | Naam                          | Verzenden mag | Open werk | Fase       |
| --------- | ----------------------------- | :-----------: | :-------: | ---------- |
| 875920014 | NOG_AANSTUREN                 |      ja       |    ja     | laden      |
| 1         | WACHT_OP_ACCEPTATIE_TP        |      ja       |    ja     | accepteren |
| 875920000 | IN_UITVOERING (fase 1)        |      ja       |    ja     | laden      |
| 875920004 | HULPVERLENING_AKKOORD         |      ja       |    ja     | afleveren  |
| 875920005 | HULPVERLENING_AFGEROND        |      ja       |  **nee**  | -          |
| 875920003 | LAATSTE_BERICHT               |      ja       |  **nee**  | afgerond   |
| 875920006 | VERGEEFSE_RIT                 |      nee      |    nee    | -          |
| 875920007 | NACONTROLE                    |      nee      |    nee    | -          |
| 875920017 | AFMELDING_GEWEIGERD           |      nee      |    nee    | -          |
| 875920009 | OPSLAG                        |      nee      |    nee    | -          |
| 875920010 | WACHT_OP_ORDERNUMMER          |      nee      |    nee    | -          |
| 875920018 | DOORBROEP_CONTROLE            |      nee      |    nee    | -          |
| 875920016 | GECONTROLEERD                 |      nee      |    nee    | -          |
| 875920019 | NOG_ONDERWEG                  |      nee      |    nee    | -          |
| 875920008 | FACTUREERBAAR                 |      nee      |    nee    | -          |
| 875920012 | GEFACTUREERD                  |      nee      |    nee    | -          |
| 875920013 | FACTUUR_OP_VERVOLGDIENST      |      nee      |    nee    | -          |
| 875920011 | DUPLICAATMELDING              |      nee      |    nee    | -          |
| 875920020 | COULANCE                      |      nee      |    nee    | -          |
| 875920021 | GECORRIGEERD_OP_ANDERE_DIENST |      nee      |    nee    | -          |

- **VERVALLEN** ontbreekt bewust: de oude code gaf het dezelfde waarde als DOORBROEP_CONTROLE (875920018, met de opmerking "controleer waardes"). Zie [open vragen](open-vragen.md).
- **Onbekende status:** verzenden mag niet, maar de dienst telt wel als open werk (liever een dienst te veel tonen dan een verbergen). 875920001 staat niet in de lijst maar hoort volgens de oude code bij "actief".
- **Lijstindeling** (`getServiceBucket`): actief = 875920000, 875920001, 875920004; afgerond = 875920005; al het andere is "wachtend".

## Vroeg afronden

Sommige diensten worden na fase 1 in het CRM afgesloten en krijgen nooit een fase 2. De regels (`early-complete.ts`), gekoppeld aan het dienstentype:

| Type (code)       | Vroeg afgerond als                                                            |
| ----------------- | ----------------------------------------------------------------------------- |
| Assistance (1002) | `dn_assisistancetypeofbreakdowncode` is ingevuld                              |
| Pechhulp (1007)   | `dn_breakdownsettlementcode` is ingevuld en niet 1004 of 1005 (die gaan door) |
| Berging (1004)    | `dn_ekv` is `true` of optiecode `1`                                           |

## Na het verzenden (`resolveProcessingExit`)

| Situatie                                                                                         | Uitkomst           |
| ------------------------------------------------------------------------------------------------ | ------------------ |
| Verzenden in een status waarin het niet mag                                                      | `blocked`          |
| Vroeg afgerond, of type Afgifte (9000), of status NACONTROLE gepost, of afgifte-item met locatie | `terminal`         |
| Huidige status HULPVERLENING_AKKOORD                                                             | `processingFinish` |
| Anders                                                                                           | `continueIncident` |
| Afwijzen met VERGEEFSE_RIT                                                                       | `terminal`         |
| Afwijzen anders                                                                                  | `continueIncident` |
| Afronden                                                                                         | `terminal`         |

`isLcmh` is waar bij `dn_imactionstatuscode` 1002 of 1005. Daarna bepaalt `getExitTarget` waar de gebruiker heen gaat: terug naar de opdrachtenlijst als er geen open diensten meer zijn, anders naar de diensten van het incident (PLTR- of gewone variant). Een PLTR-dienst die vanaf het afsluitscherm klaar is, gaat altijd naar de opdrachtenlijst.

## Opdrachten (allocations)

- **Wacht op acceptatie** (`pending`): status 1 ("Aangestuurd").
- **Actief** (`active`): 875920000, 875920001, 875920002, 875920003, 875920004, 875920005, 875920006, 875920007, 875920008, 875920010, 875920011, 875920012, 875920013, 875920015, 875920016 en 2.
- **Verborgen:** afgesloten opdrachten (`statecode` niet 0), tenzij status 875920007 ("ander incident met PRIO", wacht op overdracht), en alles met een andere status.
- **Volgorde:** actief nieuwste eerst (omgekeerd aan de serverlijst), wachtend op incidentnaam.

## Incidenten

`INCIDENT_STATUS`: NIEUW 1, AANGESTUURD 875920007, GEACCEPTEERD 875920000, IN UITVOERING 875920001, AANKOMST 875920002, LAATSTE VERTREK (afgerond) 875920003, GESLOTEN 2, GEANNULEERD 875920004, SAMENGEVOEGD 875920005. Alleen 875920003 telt als afgerond (`isIncidentFinished`).

Een opdracht is **afgerond** (`isAllocationFinished`) als het incident afgerond is of alle diensten 875920005 of 875920003 hebben. Een opdracht zonder (geladen) diensten is niet afgerond.

## Types (`dn_servicetypecode` van de eerste dienst)

1001 achtergelaten voertuig, 1002 assistance, 1003 belastingdienst, 1004 berging, 1005 direct transport, 1006 incidentmanagement, 1007 pechhulp, 1008 politietakel, 1009 wegsleepverordening, 1010 zware berging, 1011 ontruiming, **1012 planbaar transport (PLTR)**, 1013 traject, 1014 verzekeringsdienstverlening, 1017 truckberging, **1030 planbaar transport van Ven (ook PLTR, zie [open vragen](open-vragen.md))**, 9000 voertuigafgifte.

## Doellocatie en de 500 m-controle

Bij het accepteren van een dienst kijkt de app of de berger dichtbij genoeg is. Doel (`getTargetLocation`): PLTR in de afleverfase: afleverlocatie; anders PLTR: laadlocatie; anders een afleverlocatie; anders het incident. Een locatie telt alleen als beide coördinaten bruikbaar zijn (niet (0, 0)). Bij minder dan 500 m is er geen bevestiging nodig; onbekende positie, onbekend doel of 500 m of meer vraagt de berger te bevestigen (`decideProximity`).

Het PLTR-scherm toont die twee adressen als kaarten. De laadkaart krijgt een vinkje bij HULPVERLENING_AKKOORD; beide kaarten bij HULPVERLENING_AFGEROND. Navigeren en bellen staan op de fase die aan de beurt is (laden, daarna afleveren). De knop onderaan is accepteren, starten met laden, starten met afleveren, afronden, of "afgerond" bij LAATSTE_BERICHT.
