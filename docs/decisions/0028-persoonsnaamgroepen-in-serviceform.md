# 0028. Persoonsnaamgroepen bovenop bestaande formuliervelden

**Status:** geaccepteerd; v1 geïmplementeerd in de app (alleen naamrollen).

## Context

Formulierdefinities bevatten personen als losse CRM-velden (aanhef, voorletters, voornaam,
tussenvoegsel, achternaam, contact, adres). Adres- en kentekengroepen
([ADR 0026](0026-adresgroepen-in-serviceform.md), [ADR 0027](0027-kentekengroepen-in-serviceform.md))
toonden al: metadata op een markerveld, flat CRM-velden voor oudere clients, snelle invoer met
bevestiging.

## Besluit

- Optionele metadata staat op een markerveld onder `person_group` met `flow: "person_v1"`.
- De mapping koppelt rollen aan CRM-veldnamen. Voor de naamflow is alleen `lastName` verplicht;
  `salutation`, `initials`, `firstName` en `middleName` zijn optioneel.
- Overige rollen in de metadata (`phone1`, `phone2`, `email`, `company`, `gate`, `addressGroupId`,
  `copyFrom`) mogen in de definitie staan; de app v1 consumeert die **niet** in de persoonskaart.
  Die velden blijven gewone losse velden tot een latere slice.
- Snelle naaminvoer: optionele **aanhef**-dropdown boven het vrije tekstveld (handmatig te
  kiezen, niet uit free text afgeleid) → knop **Verdelen** → lokale NL-parser →
  bevestigingsdialoog → batch `updateAnswers` op voorletters, voornaam, tussenvoegsel en
  achternaam. Bekende aanhef-prefixen (`Dhr.`, `Mevr.`, …) worden nog steeds van de vrije tekst
  gestreept zodat de rest netjes splitst, maar niet als aanhef-antwoord weggeschreven of in
  preview/samenvatting getoond. De overige naamrollen blijven standaard verborgen achter
  **Naam handmatig invullen** (zelfde patroon als adresgroep). Na accepteren (of bij al gevulde
  naamrollen uit CRM/concept) verdwijnen het vrije veld en die rolvelden; de app toont één
  groene samenvattingsregel (aanhef blijft zichtbaar erboven). **Naam handmatig invullen** opent
  de velden opnieuw; **Opnieuw** wist de afgeleide naamrollen (niet de aanhef) en toont opnieuw
  de snelle invoer. Tijdens handmatige modus: **Gebruik snelle invoer** / **Terug naar
  samenvatting**.
- Afwijzen van de bevestiging schrijft niets weg en opent de handmatige velden. Wijzigen van het
  vrije veld (terwijl dat zichtbaar is) wist afgeleide naamrollen opnieuw.
- Zonder `person_group` of bij incomplete mapping (geen `lastName`-veld aanwezig) rendert de app de
  velden los.
- Of het CRM `person_group` ongemoeid laat staat in
  [open vraag 41](../functioneel/open-vragen.md).

## Gevolgen

- Geen nieuw CRM-veldtype en geen wijziging aan de submit-payload.
- Oudere apps negeren de metadata.
- Buitenlandse namen worden conservatief geparsed; de berger corrigeert handmatig.
