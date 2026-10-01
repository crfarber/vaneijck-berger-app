# 0006. Opslag: beveiligde opslag in stukken, gewone opslag met SQLite

## Context

De oude app bewaarde tokens onbeveiligd in AsyncStorage. De sessie bestond uit vier sleutels; de SMS-login schreef de vervaltijd onder een andere sleutel (`VRSDriver_Time`) dan waar hij gelezen werd (`Token_Time`).

## Besluit

- Tokens gaan in **Keychain/Keystore** (`expo-secure-store`) achter de `SecretStore`-poort, als **één** JSON-waarde op één sleutel (`auth.session`), gevalideerd bij het lezen. Beschadigde data geldt als geen sessie en wordt verwijderd.
- Beveiligde opslag heeft een groottelimiet (Expo adviseert 2048 bytes; een Azure AD-token kan groter zijn). `createChunkedSecretStore` verdeelt een waarde over stukken van 1800 tekens; het aantal wordt als laatste geschreven zodat een halve waarde nooit zichtbaar is.
- Voorkeuren zonder geheimen komen achter de `KeyValueStore`-poort, met `expo-sqlite/kv-store` als device-adapter (`shared/platform/rn/key-value-store.ts`). Gekozen boven MMKV: het is een Expo-eigen package (eigen config-plugin, geen extra AppDelegate-aanpassing zoals bij `react-native-app-auth`, zie [ADR 0012](0012-azure-ad-inloggen.md)) en de API is al gelijk aan de `KeyValueStore`-poort. Sinds slice 2 (referentiedata) is dit de eerste plek met "veel" data.

## Gevolgen

- Opgeslagen sessies van de oude app worden niet overgenomen: gebruikers loggen eenmalig opnieuw in.
- Wat er bij uitloggen gewist wordt, is bewust een lijst: sessie en Query-cache nu; de oude app wiste ook taalkeuze en sync-datum (zie [open vragen](../functioneel/open-vragen.md)).
