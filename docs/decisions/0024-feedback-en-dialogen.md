# 0024. Feedback en dialogen

**Status:** deels vervangen door [0025](0025-statusscherm-bij-acties.md) — bezig/gelukt/queued/mislukt bij verzend-acties gaat via het statusscherm. Bevestigingen, sheets, validatie en toasts voor niet-blokkerende meldingen blijven hieronder.

## Context

De oude app mengde vier soorten meldingen zonder vaste regel: een volle-scherm overlay
(`IncidentFeedbackModal` via een globale `showModal(ReactElement)`), native `Alert.alert` voor
bevestigingen én fouten én validatie, bottom sheets voor keuzes, en aparte schermen voor
meer-staps-invoer. De succes-overlay bij accepteren was in de praktijk nooit zichtbaar (het
`finally`-blok sloot hem meteen), een fout bij het accepteren van een dienst verdween stil, en een
dienst weigeren ging bij één tik.

De nieuwe app had tot deze beslissing vooral `Alert.alert` (ook voor `queued`, waar een blokkerende
dialoog verkeerd is) en laadstatus op knoppen. Er was nog geen toast, geen gedeelde bevestiging, en
geen afspraak wanneer welk patroon hoort.

## Besluit

Eén vaste set, met de regel: **kies het lichtste patroon dat past.** Alleen een beslissing blokkeert
de app. Voortgang en resultaat blokkeren niet.

| Situatie                        | Patroon                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| Bezig met versturen             | Laadstatus op de knop; na ~10 s tekst "duurt langer" onder de knop                     |
| Gelukt, of in de wachtrij gezet | Toast (verdwijnt vanzelf) + eventueel blijvend label "wacht op verbinding" op de kaart |
| Onomkeerbaar of riskant         | Bevestigingsdialoog (`confirm()` / `choose()` achter native `Alert`)                   |
| Keuze uit meerdere opties       | Bottom sheet; bij onomkeerbare keuze een bevestiging in dezelfde sheet                 |
| Invoer van meer dan één ding    | Eigen scherm (weigerredenen, formulier)                                                |
| Validatie                       | Inline bij het veld                                                                    |
| Versturen mislukt (formulier)   | Dialoog met "Opnieuw proberen"                                                         |

- **Geen globale `showModal(ReactElement)`.** De oude overlay (`IncidentFeedbackModal` /
  `useSlowProcessingModal`) komt niet terug.
- **Welke melding bij welk resultaat** is een pure functie per domein (bijvoorbeeld
  `feedbackFor(result)`). `shared` kent alleen de vorm van een toast of bevestiging.
- **ToastQueue** in `shared/feedback`: Zustand-store, één toast tegelijk, auto-dismiss via de
  `Scheduler`-poort, tril via de `Haptics`-poort. De host hangt in de root-layout zodat hij navigatie
  overleeft.
- **Haptics** als poort (`notify('success' | 'warning' | 'error')` voor uitkomsten, `tap()` voor
  knopfeedback), met `expo-haptics` als adapter.

## Gevolgen

- Bestaande `Alert`-meldingen voor succes en `queued` worden toasts. Dialogen blijven waar de berger
  moet kiezen (`reregister-required`, `blocked`, locatiebevestiging, concept bewaren, foto's
  overslaan).
- Dienst weigeren (vergeefse rit / terug naar dispatch) krijgt een sheet met bevestiging vóór
  versturen — bewust anders dan de oude app (één tik = direct).
- Versturen zonder foto's: één bevestiging met "Foto's toevoegen" / "Toch versturen"; de oude
  schakelaar "ik bevestig" na "Nee" komt niet terug.
- Concept-opslag van het serviceformulier is aangesloten (bewaren / weggooien / hervatten).
