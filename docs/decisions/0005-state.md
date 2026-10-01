# 0005. State: TanStack Query voor server-data, Zustand alleen voor client-state

**Status:** voorgesteld.

## Context

De oude app had zes Zustand-stores, één grote `AppContext` en 44 AsyncStorage-sleutels die overlappende data bevatten (opdrachten in een store én in opslag, tokens in context én opslag). TanStack Query stond erin maar werd nauwelijks gebruikt. Wie de bron van waarheid was, hing af van het scherm.

## Besluit

- **Server-data** (opdrachten, diensten, referentiedata) staat in TanStack Query. Sleutels per domein (`allocationKeys`). Een lijst en een detail zijn aparte cache-items; er is geen samengevoegde entiteit in een store meer.
- **Client-state** in Zustand (vanilla, via een fabriek), alleen voor wat echt client-state is, zoals de sessiestatus.
- **Sessie** in de `TokenProvider`; de UI ziet alleen `status`, `userType` en `signedOutReason`.

## Gevolgen

- Het "zachte samenvoegen" van een dunne lijstpayload met rijke details (`mergeService`, `mergeHydratedServices`) is bewaard als pure functie in `hydrateServices`, maar er is geen `mergeAllocation` meer nodig: lijst en details botsen niet.
- Uitloggen wist de Query-cache (`queryClient.clear()`), zodat de volgende gebruiker niets van de vorige ziet. Ook de bewaarde cache op schijf gaat mee weg.
- Geslaagde queries worden bewaard en bij een herstelde sessie teruggezet. Bevestigde mutaties die de server niet haalden staan in de outbox (ADR 0022).
