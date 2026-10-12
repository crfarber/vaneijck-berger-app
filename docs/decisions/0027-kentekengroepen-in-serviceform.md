# 0027. Versiegebonden kentekengroepen bovenop bestaande formuliervelden

**Status:** geaccepteerd en geïmplementeerd in app en managementportal.

## Context

Formulierdefinities bevatten voertuiggegevens als losse CRM-velden: gemeld kenteken, aangetroffen
kenteken, land, RDW-tekstvelden en CRM-merk/type-selecties. De vaste veldnamen-lijst in
`rdw-autofill` werkte alleen voor het Van Eijck-schema en vroeg de berger soms merk en type opnieuw
nadat RDW die al had geleverd. Adresgroepen ([ADR 0026](0026-adresgroepen-in-serviceform.md))
toonden al een patroon: metadata op een markerveld, flat CRM-velden voor oudere clients.

## Besluit

- Een bestaand kentekenveld (meestal `dn_vehicleregistrationno`) is het anker. Optionele metadata
  staat op het anker onder `license_plate_group`. Alleen `flow: "nl_rdw_lookup"` wordt
  geïnterpreteerd.
- De mapping koppelt rollen (`foundPlate`, `reportedPlate`, `country`, `rdwBrand`, `rdwType`,
  `rdwColor`, `brand`, `type`) aan CRM-veldnamen. Verplicht zijn `foundPlate` en `brand`.
- Flags: `confirmVehicle` (dialoog na RDW), `allowManual` ("Niet correct?" / handmatig merk-type),
  `allowForeignManual` (buitenlands kenteken zonder RDW).
- Zonder `license_plate_group` blijft de bestaande vaste kentekengroep
  (`ServiceFormVehicleRegistrationGroup` + vaste veldnamen) als vangnet.
- De managementportal schrijft `license_plate_group` op het markerveld; oudere apps blijven dezelfde
  losse veldnamen verwerken.
- De berger bevestigt een bekend gemeld kenteken met "Dit klopt" of "Ander kenteken"; opnieuw
  overtypen is geen standaardpad.

## Gevolgen

- Nieuwe kentekengroepen vereisen geen nieuw veldtype of wijziging aan de CRM-payload.
- Onbekende `flow`-waarden of incomplete mapping degraderen naar het legacy-vangnet of losse velden.
- RDW-autofill werkt via een rol-naar-veldnaam-mapping; de legacy-mapping bewaart het oude gedrag.
- Of het CRM `license_plate_group` ongemoeid laat (zoals `address_group`) staat in
  [open vraag 37](../functioneel/open-vragen.md).
