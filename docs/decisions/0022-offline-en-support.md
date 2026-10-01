# 0022. Offline-wachtrij en supportlog

**Status:** gebouwd voor de mutaties die de app nu zelf verstuurt. Monitoring (open vraag 15) en store-release (open vraag 10, ADR 0009) niet.

## Context

Een berger rondt werk af op plekken zonder bereik. De oude app bewaarde foto's wel in een wachtrij, maar een bevestigde mutatie die de server niet haalde was weg. Support kreeg logs via een debugscherm en mail, soms met persoonsgegevens.

## Besluit

- Domein `outbox`: bevestigde mutaties in volgorde. Een tijdelijke fout (`isRetryable`: netwerk, timeout, 408, 429, 5xx) blijft aan het hoofd en gaat later opnieuw. Een harde 4xx markeert dat item als mislukt; het volgende mag wel weg. Een gewone fout (geen HTTP-status) wordt niet in de wachtrij gezet.
- In de wachtrij: opdracht afronden, opdracht afwijzen, opdracht accepteren (alleen nadat de eenheid-check slaagde en de POST daarna tijdelijk faalde) en dienst accepteren.
- De Query-cache van geslaagde queries wordt bewaard (`query.cache`) en bij een herstelde sessie teruggezet. Uitloggen wist de wachtrij en die cache, net als de foto's.
- Domein `support`: `supportLogText` is `formatLogExport` over de laatste 24 uur, maximaal 200 regels, kop "Van Eijck Berger — supportlog". Het scherm deelt die tekst via het systeem. De regels zijn al door `redact` gegaan.
- Geen Sentry, geen store-listing, geen `jest-expo` en geen Maestro. Het verwerkingsformulier blijft van het team; zonder dat formulier is "afronden" de bestaande afrond-aanroep.

## Gevolgen

- De berger ziet bij een tijdelijke fout dat het later verstuurd wordt. De lijst wordt pas ververst als de server de mutatie echt heeft.
- Een productiebuild op acceptatie is niet gedaan.
