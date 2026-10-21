# 0031. Allocations-overzichtskaart

**Status:** gebouwd.

## Context

Bergers willen op één scherm zien waar zij zelf staan en waar hun opdrachten (incidenten)
liggen. Tot nu toe opende de app alleen externe kaarten (Apple Maps, Google Maps, Waze) voor
navigatie naar één punt ([ADR 0019](0019-pltr.md), [ADR 0030](0030-standby-locatieadvies.md)).
Een in-app overzicht ontbrak.

`expo-maps` (SDK 57, alpha) biedt Apple Maps op iOS. Op Android vereist die library de Google
Maps SDK met een sleutel en Google-factureringaccount — ook als de Maps SDK-SKU zelf gratis is.
Voor Android kiezen we daarom OpenStreetMap via Leaflet in een WebView: geen API-sleutel, geen
billing.

## Besluit

- In-app overzichtskaart, te openen vanuit de allocations-toolbar (`/allocations-map`).
  GPS-status zit op de kaart (banner + sheet), niet meer als aparte toolbartegel.
- **iOS:** Apple Maps via `expo-maps`.
- **Android:** OpenStreetMap-tegels via Leaflet in `react-native-webview` (geen Google Maps
  SDK, geen `GOOGLE_MAPS_ANDROID_API_KEY`).
- Markers komen uit incidentcoördinaten (`dn_latitude` / `dn_longtitude`); laad- en
  aflevercoördinaten blijven buiten scope. PLTR-opdrachten krijgen een paarse pin; overige
  diensten blauw. Nummers 1…n staan altijd zichtbaar op de pin.
- Live positie: iOS via `isMyLocationEnabled`; Android als circle marker gevoed vanuit
  `gps.coordinate` (geen native blauwe stip in WebView).
- Navigatie naar één adres blijft via de bestaande externe-maps-sheets. Standby (ADR 0030)
  blijft externe apps.
- iOS-minimum via `expo-build-properties`: deployment target 17.0 (eis van `expo-maps`).
- Development build verplicht; Expo Go ondersteunt `expo-maps` niet. OSM-tegels vereisen
  netwerk; attribution blijft zichtbaar (OSM-licentie).

## Gevolgen

- Nieuwe route en toolbarslot. Architectuur: `expo-maps` / WebView alleen in
  `components`/`screens`.
- Marker-tik opent het allocations-detail (Android en iOS 18+); op iOS 17 alleen de
  callout-titel.
- Wiki locatie, builds en componenten documenteren het platformverschil.
