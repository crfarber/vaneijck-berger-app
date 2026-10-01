# 0009. Varianten en bundle-ID's

**Status:** **te bevestigen voordat er een productiebuild komt.**

## Besluit

Eén codebase, drie varianten (`internal`, `acceptance`, `production`) via `APP_VARIANT`, per EAS-buildprofiel gezet in `eas.json` en uitgelezen in `app.config.ts`. Geen native flavors, geen `react-native-config`. Elke variant heeft eigen naam, bundle-ID en URL-scheme, zodat ze naast elkaar op een toestel staan. Runtime-configuratie (`EXPO_PUBLIC_*`) wordt met zod gevalideerd (`parseRuntimeConfig`): de app start niet met een ontbrekende of ongeldige waarde.

## Bundle-ID's

Overgenomen van de oude app: `com.vrscloud` (productie), `com.vrscloud.acceptance`, `com.vrscloud.internal`. **Vraag:** moet de nieuwe app de bestaande store-listing vervangen (dan dezelfde ID's en een hogere versie), of komt er een nieuwe listing? Dit bepaalt ook of gebruikers hun sessie behouden (nee, zie [0006](0006-opslag.md)) en of push-registraties (Firebase-project, `google-services.json`) hergebruikt worden.

## Gevolgen

- Secrets (`google-services.json`, `GoogleService-Info.plist`) staan in `.gitignore` en komen via EAS-bestandsvariabelen.
- `EXPO_PUBLIC_*` is niet geheim; zie [conventies](../conventions.md).
