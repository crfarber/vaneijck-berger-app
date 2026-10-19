# 0017. Push-notificaties

**Status:** gebouwd; native koppeling via Firebase + Notifee. Echt bericht op een fysiek toestel
nog niet gecontroleerd.

## Context

De regels (payload lezen, type, effecten, ontdubbelen, handler) stonden al. Wat ontbrak was het
apparaat: toestemming, een token naar de backend, ontvangst in voorgrond, achtergrond en bij een
koude start, een banner, en navigatie bij een tik.

Open vraag 17 koos eerst `expo-notifications`. De live code en de backend verwachten echter het
zelfde pad als de oude app: **Firebase Cloud Messaging** voor het token en ontvangst, **Notifee**
voor het Android-kanaal en de voorgrondbanner. Dat is opnieuw vastgelegd in
[open-vragen 17 en 21](../functioneel/open-vragen.md).

De oude app gebruikte FCM plus Notifee. De live hook (`usePushNotifications`) postte het token bij
elke aangemelde start en opnieuw als het token wisselde. Een 24-uursgrens stond alleen in de
documentatie van die app, niet in die hook.

## Besluit

- **Token:** FCM-token via `@react-native-firebase/messaging` (`getToken`), geregistreerd als
  `{ notificationtoken }` op `POST /api/workers/register` (lege response, zoals de gegenereerde
  client). De backend stuurt via FCM, niet via de Expo-pushdienst
  ([open vraag 21](../functioneel/open-vragen.md)). Zonder Firebase-configbestanden of toestemming
  levert het apparaat geen token; de app gaat gewoon door.
- **Native:** `@react-native-firebase/app` en `@react-native-firebase/messaging` als Expo
  config-plugins; `google-services.json` / `GoogleService-Info.plist` via `googleServicesFile`
  (gitignored, lokaal of via EAS-bestandsvariabelen). Notifee’s Android-AAR via
  `expo-build-properties` `extraMavenRepos` naar
  `node_modules/@notifee/react-native/android/libs`.
- **Permissie geweigerd** is een afgeronde staat. Er komt geen foutscherm en er wordt niet
  geregistreerd. De uitleg vooraf en het instellingenscherm blijven slice 10.
- **Ontvangst** loopt door dezelfde `decideIncoming`-regels als de oude dispatcher: een herhaling
  wordt genegeerd, behalve een tik (die opent alsnog de opdrachtenlijst). `StandbyLocationAdvice`
  hoort bij [ADR 0030](0030-standby-locatieadvies.md) (niet meer uitgeschakeld). De voorgrondbanner
  gebruikt Notifee met de tekst van het
  bericht, of de vaste zin uit i18n als die ontbreekt. De payload wordt niet gelogd.
- **Cache:** `NotificationActions` schrijft in de Query-cache van de opdrachtenlijst (één opdracht
  ophalen, alles verversen, verwijderen, voertuigafgifte verversen). `WorkerStatus` invalidert de
  sleutel `['worker']`; er is nog geen scherm dat die leest.
- De FCM-achtergrondhandler staat in het JS-entry (`index.js`) vóór `expo-router/entry`, zodat een
  bericht de app kan wekken. Berichten die binnenkomen vóór er een sessie is, worden bewaard tot
  het luisteren start en weggegooid bij uitloggen.

## Gevolgen

`aps-environment` is `production` alleen bij variant `production`, anders `development`.
Achtergrondmodus `remote-notification` staat aan. Android krijgt `POST_NOTIFICATIONS` via
React Native Firebase / Notifee.

Een echt bericht vraagt een fysiek toestel, geldige Firebase-configbestanden per variant, en een
backend die FCM-tokens verstuurt ([open vraag 21](../functioneel/open-vragen.md)). Het EAS-project-id
in `app.config.ts` blijft voor projectkoppeling; het is geen geheim en geen pushtokenbron meer.
