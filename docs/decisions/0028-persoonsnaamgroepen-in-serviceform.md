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
- Snelle naaminvoer: één vrij tekstveld → lokale NL-parser → bevestigingsdialoog → batch
  `updateAnswers` op de gemapte naamrollen. Aanhef wordt alleen gezet als de geparsede alias een
  optie in `dn_salutation` (of de tabel van het veld) matcht.
- Compacte handmatige velden blijven altijd beschikbaar. Afwijzen van de bevestiging schrijft niets
  weg. Wijzigen van het vrije veld wist afgeleide naamrollen opnieuw.
- Zonder `person_group` of bij incomplete mapping (geen `lastName`-veld aanwezig) rendert de app de
  velden los.
- Of het CRM `person_group` ongemoeid laat staat in
  [open vraag 41](../functioneel/open-vragen.md).

## Gevolgen

- Geen nieuw CRM-veldtype en geen wijziging aan de submit-payload.
- Oudere apps negeren de metadata.
- Buitenlandse namen worden conservatief geparsed; de berger corrigeert handmatig.
