# 0012. Azure AD voor interne gebruikers

**Status:** werkt op een toestel, inclusief een echte aanmelding (zie "Gecontroleerd").

## Besluit

`react-native-app-auth` 8.4.1, dezelfde bibliotheek als de oude app. Alternatief was `expo-auth-session`
(open vraag 16); `react-native-app-auth` wint omdat de oude app hem al gebruikt met dezelfde Azure
AD-app-registraties (`ad.config.ts`), inclusief scopes en het redirect-scheme — hergebruiken is minder
risico dan een nieuwe library tegen dezelfde tenants uitproberen. De library heeft bovendien een
Expo-config-plugin die specifiek SDK 57's Swift-`AppDelegate` herkent.

## Opbouw

- `domain/azure-ad-configuration.ts`: bouwt de AppAuth-configuratie (issuer, endpoints, scopes) uit
  `RuntimeConfig.azureAd`. Scopes zijn letterlijk overgenomen van de oude app: `openid profile email
offline_access` plus `https://mobileapp.vrscloud.org/user_impersonation` — dezelfde App-ID-URI voor
  elke tenant, dus geen variant-specifieke waarde.
- `domain/login-failures.ts` (`classifyInternalAuthError`): annulering versus een echte fout, puur op
  de foutcode — **niet** op de boodschap: op een toestel gaf een annulering iOS' generieke
  `authentication_failed` met een boodschap van Foundation zelf, niet van AppAuth, en die bevat geen
  "cancel". Zie het commentaar in de code voor de afleiding per platform.
- `platform/rn/internal-auth.ts`: de dunne adapter. Herbruikt `classifyRefreshFailure` (bestond al
  voor precies dit doel, zie het commentaar bij `RefreshFailure.message` in `refresh-policy.ts`) voor
  een geweigerde refresh.
- `app.config.ts`: plugin `react-native-app-auth` met `redirectUrls: ['com.vaneijck.auth://login/']`
  — hetzelfde vaste scheme als de oude app, in elke omgeving (geverifieerd: `AZURE_AD_REDIRECT_URL` is
  in `.env`, `.env.acceptance`, `.env.internal` en `.env.production` van de oude app identiek).
  **Moet vóór** de `expo-build-properties`-plugin staan: beide passen `AppDelegate.swift` aan, en de
  mods draaien in de omgekeerde volgorde van deze lijst (leeg getest tegen
  `expo-build-properties@57.0.21` / Expo 57.0.24 — nog niet uitgezocht wélk onderdeel van Expo's
  config-plugin-systeem dat veroorzaakt).

## Gevolgen

- Elke wijziging aan de plugin-configuratie: `expo prebuild --platform ios` (en `--platform android`
  zodra Android meedoet) en opnieuw bouwen.
- De redirect-URL is geen geheim (het is een URL-scheme, geen credential) en staat daarom ook in dit
  document; `AZURE_AD_CLIENT_ID`/`AZURE_AD_TENANT_ID` blijven per omgeving in EAS/`.env.local`.
- `InternalLoginFailure` heeft geen `network`-variant (anders dan de SMS-login): een offline poging
  toont dezelfde generieke melding als een echte fout. Zo deed de oude app het ook.

## Gecontroleerd

Op 22 september 2026, iOS 27.0-simulator (iPhone 18 Pro), tegen de tenant uit `.env.internal` van de
oude app:

- prebuild en build slagen, `AppDelegate.swift` combineert beide plugins correct
  (`ExpoReactNativeFactoryProvider` én `RNAppAuthAuthorizationFlowManager`), `com.vaneijck.auth` staat
  als URL-scheme in `Info.plist`;
- "With Van Eijck account" opent de echte Microsoft-aanmeldpagina met de tenant-branding (bevestigt
  tenant-id, client-id, redirect-URL en de native koppeling kloppen);
- **annuleren op twee verschillende momenten** geeft allebei stil de opdrachtenlijst — geen melding —
  zoals bedoeld: bij het systeemvenster ("␣ wil login.microsoftonline.com gebruiken") vóór de
  aanmeldpagina, én bij het sluiten (✕) van de aanmeldpagina zelf. De eerste gaf in een eerste versie
  van `classifyInternalAuthError` nog de foutmelding "That did not work" — de fix (foutcode alleen,
  geen boodschap) is direct daarna herbevestigd;
- **een echte aanmelding met een Van Eijck-account slaagt**: de gebruiker rondde de Microsoft-flow af
  in dezelfde simulator, en de app kwam op het opdrachtenscherm met een "Sign out"-knop (dus
  `signInInternal` → `TokenProvider.signIn` → navigatie naar de beveiligde stack werkten allemaal). De
  lijst toonde "There are no assignments" — geen foutstaat, dus ook de opdrachten-fetch met het echte
  token slaagde.

**Nog niet getest:** een geweigerde refresh-token, en Android (niet gebouwd).
