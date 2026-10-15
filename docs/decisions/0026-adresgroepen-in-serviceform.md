# 0026. Versiegebonden adresgroepen bovenop bestaande formuliervelden

**Status:** geaccepteerd en geïmplementeerd in app en managementportal.

## Context

Formulierdefinities bevatten adressen als losse CRM-velden. Bestaande appversies kennen alleen die
velden en het bestaande veldtype `address`. De nieuwe app moet postcode/huisnummer kunnen opzoeken,
de bestaande Places-zoeker behouden en handmatige invoer aanbieden, zonder oude clients of
bestaande definities te breken. Dezelfde aanpak moet bruikbaar zijn voor bestuurder, afleveradres
en toekomstige adressen zoals een buurmanadres.

## Besluit

- Een bestaand veld van type `address` is het anker. `address_components` blijft de enige mapping
  van adresrollen naar CRM-veldnamen.
- Optionele UI-metadata staat op het anker onder `ui_extensions.address_entry`. Alleen versie `1`
  wordt geïnterpreteerd. De flags bepalen postcode/huisnummer-lookup, adreszoeken, handmatige invoer
  en het aanvankelijk verbergen van opgeloste velden.
- Een groep wordt alleen opgebouwd als `postalcode`, `houseno`, `street` en `city` allemaal naar
  aanwezige velden verwijzen. Bij onbekende metadata of een incomplete mapping rendert de app de
  velden los.
- De managementportal voegt ontbrekende componenten als gewone velden toe en schrijft daarna de
  mapping en metadata op het anker. Daardoor blijven oudere apps dezelfde losse veldnamen en
  veldtypen verwerken.
- De postcode-API blijft `POST /api/check/zipcode` met `{ zipcode, housenumber }`. De app
  normaliseert zowel de huidige geformatteerde string als de aangetroffen legacy JSON-string naar
  één gestructureerd adres.
- `Volgende` gebruikt de gemeten schermvolgorde en kiest het direct volgende zichtbare bewerkbare
  veld, ook als dat optioneel of al ingevuld is. Alleen-lezen, informatieve en niet-gerenderde velden
  worden overgeslagen.

## Gevolgen

- Nieuwe adresgroepen vereisen geen nieuw verplicht veldtype of wijziging aan de CRM-payload.
- Onbekende toekomstige versies degraderen naar de bestaande losse invoer.
- Het wijzigen van postcode, huisnummer of toevoeging wist alleen afgeleide adresantwoorden; andere
  antwoorden blijven staan.
- De postcodeflow en schermnavigatie zijn geautomatiseerd getest, maar de volledige combinatie met
  een echte gesynchroniseerde definitie moet nog op een toestel worden geaccepteerd.

## Aanvulling (2026-10-12)

- Op het markerveld staat naast de oudere `ui_extensions`/`address_components`-paden ook
  `address_group` (plat, met `fields.postalCode` enz.). Alleen postcode en huisnummer zijn daar
  verplicht; straat en plaats zijn optioneel (taxi-route). Legacy `address_components` blijft
  straat én plaats eisen.
- De definition builder herkent adresblokken op CRM-achtervoegsel en kan een groep in alle fases
  zetten waar de gekoppelde velden bestaan. Zie
  [docs/specs/speed-up-address-locations-in-form.md](../specs/speed-up-address-locations-in-form.md).
