# 0029. Experimentdefinities in de internal-build

**Status:** geaccepteerd en geïmplementeerd.

## Context

De nieuwe formuliergroepen (adres, kenteken, persoonsnaam; ADR
[0026](0026-adresgroepen-in-serviceform.md), [0027](0027-kentekengroepen-in-serviceform.md),
[0028](0028-persoonsnaamgroepen-in-serviceform.md)) hangen af van metadata in de formulierdefinitie.
Die metadata staat in `docs/diensten/experiment`, maar nog niet in de definities die de
testomgeving synchroniseert. Tot nu toe las alleen een ontwikkelbuild (`__DEV__`) die map. De
internal-build is een testbuild voor gebruikers en toonde daardoor de oude, losse velden.

## Besluit

- Ook de internal-build leest formulierdefinities uit `docs/diensten/experiment`. De vlag is
  `EXPO_PUBLIC_ENVIRONMENT === 'internal'`, die de EAS-omgeving `development` al zet voor
  `eas build --profile internal` en `eas update --channel internal --environment development`.
- Keuzelijsten blijven uit de gesynchroniseerde referentiedata komen.
- Het opnieuw inlezen via de Metro-devserver (twee tikken op de voortgangscirkel) blijft
  `__DEV__`-only; een internal-build heeft geen devserver.
- Acceptatie en productie blijven de gesynchroniseerde definities gebruiken. De voorwaarde staat
  letterlijk in de code, zodat Metro de JSON-bestanden uit die bundels weglaat.

## Gevolgen

- Een wijziging in de experimentmap bereikt de internal-app pas na een nieuwe update op channel
  `internal`. Wijzigingen in het CRM ziet de internal-app niet in het formulierschema.
- Een diensttype zonder bestand in de experimentmap krijgt in de internal-app geen formulier;
  er is geen terugval naar de gesynchroniseerde definitie.
- De internal-app test niet meer welke definitie het CRM echt levert. Of het CRM de groepsmetadata
  ongemoeid laat, blijft [open vraag 37](../functioneel/open-vragen.md) en wordt pas op acceptatie
  zichtbaar.
