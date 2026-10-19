# 0030. Standby-locatieadvies

**Status:** gebouwd (slice 20).

## Context

De centrale kan een berger een standby-locatie adviseren via push type `StandbyLocationAdvice`.
Op main van de oude app stond dat token op `disabled` (“nog geen handler”). Op branch
`40430-toon-standby-locatie-advies-in-app` stond wel gedrag: banner, navigatie naar de locatie,
vervallen bij opdracht of einde dienst, wissen bij aankomst of uitloggen.

Open vraag 13 koos eerder voor “blijft genegeerd”. Product wil dit alsnog in de herbouw, opnieuw
geschreven (geen code uit de salvageapp).

## Besluit

- Eigen domein `standby-location`: parse, state machine, persist, banner en navigatie-sheet.
- Push-ingang blijft `notifications`: display mode `default`; effect `apply-standby-advice` of
  `expire-standby-advice` (bij allocation-gerelateerde pushes en bij onbekend type dat alles
  ververst; niet bij dissolve).
- Gedragsparity met `StandbyLocation.md` op branch 40430: 500 m aankomst, blocking allocations /
  vehicle releases, einde werkdienst, persist, clear bij logout.
- Kaart: BottomSheet met Apple Maps, Google Maps en Waze (zoals PLTR; geen OSM-widget).
- Geen achtergrond-GPS voor standby; checks alleen bij focus / app voorgrond terwijl de banner
  zichtbaar is.

## Gevolgen

`StandbyLocationAdvice` verschijnt weer in de meldingshistorie (status-tab). Uitloggen wist
`standbyLocation.pending`. De oude open vraag 13 is bijgewerkt.
