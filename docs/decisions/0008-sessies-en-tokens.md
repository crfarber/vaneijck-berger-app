# 0008. Sessies en tokens

**Status:** uitgevoerd; het beleid is testbaar vastgelegd.

## Context

De oude token-manager had module-globals (`isRefreshing`, `refreshPromise`, een `dispatch`, een `navigationRef`) en meerdere bugs (zie [bekende fouten](../functioneel/bekende-fouten-oude-app.md)):
na drie mislukte pogingen (ook bij netwerkproblemen) werd de status gereset terwijl tokens deels bleven staan, een tweede poging na terugkeer naar de voorgrond logde ook bij een netwerkfout uit, en de refresh-token werd niet URL-geëncodeerd.

## Besluit

Eén `TokenProvider` met vaste garanties (zie [architectuur](../architecture.md)): single flight, tijdelijk is niet definitief, uitloggen wint, geordende opslag. Het beleid staat als pure functies in `refresh-policy.ts`: 3 pogingen met 2 s en 4 s pauze, definitief bij 401/403 of een OAuth-fout als `invalid_grant`, en bij twijfel tijdelijk.

`SessionLifecycle` regelt de timers achter een `Scheduler`-poort: vernieuwen vijf minuten voor het verlopen, herhalen na 5 s, 15 s, 60 s en 300 s, nooit vaker dan elke 30 s.

## Gevolgen

- De HTTP-client vraagt bij 401 één keer `refreshNow()` en probeert opnieuw; een tweede 401 wordt een gewone `HttpError`.
- Een sessie die niet te redden is, is een statuswijziging; er is geen `navigationRef` meer.
- Azure AD (interne gebruikers) volgt in dezelfde vorm: een `InternalAuth`-adapter die `signIn` en `refresh` levert. De keuze tussen `react-native-app-auth` en `expo-auth-session` staat open (zie roadmap, slice 1).
