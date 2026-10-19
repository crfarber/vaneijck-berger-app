# 0020. Nieuwe fotostroom

**Status:** gebouwd; herzien op 2026-10-07 voor expliciete batchverzending en overrides.

## Context

De oude fotostroom (`photo.store`, `photo-session.store`, `kind` versus `isExtra`, een
positioneerscherm, fase-2-tegels die vlaggen kopiëren) was breekbaar: de chauffeur moest een
backend-regel bijhouden die de app zelf kan bepalen. Slice 8 bouwt die stroom opnieuw, zonder de
oude stores of schermen over te nemen.

## Besluit

- Nieuw domein `photos`: één lijst van foto's per apparaat (metadata in `KeyValueStore`, JPEG via
  de poort `PhotoFiles`). Status `draft` | `queued` | `sent` | `failed`; de rol is `mandatory` of
  `additional`.
- Capture bewaart alleen een lokaal `draft`. `submitBatch` zet gewone concepten van één dienst en
  fase samen op `queued`. Een vervangingsconcept blijft buiten die batch en gaat afzonderlijk via
  `submitOverride`.
- `isExtraForUpload` telt foto's van dezelfde dienst, fase en type, inclusief gecachete serverfoto's
  voor nieuwe extra's. Een override behoudt de `isExtra`-waarde van zijn doel.
- Upload: `POST /api/binary/upload?content=photo` als multipart, velden zoals
  `UploadPhotoAndPosition` (inclusief `ImagePosition` als `{ name, position? }` met Nederlandse
  labels en exact veld `Comment`). `overrideExisting` is een queryparameter. Netwerk/5xx: blijft
  `queued` en wordt hervat. Andere 4xx: `failed`, bestand blijft.
- Geen bruikbare locatie: foto blijft in de wachtrij; bij drain wordt `LocationReader` opnieuw
  gevraagd.
- In een development-simulator gebruikt alleen de fotoservice bij een ontbrekende of ongeldige fix
  de vaste testlocatie Den Haag Centraal. De gedeelde locatielezer blijft ongewijzigd voor GPS-status
  en nabijheidscontrole; fysieke apparaten en releasebuilds krijgen geen fallback.
- Het overzicht haalt serverfoto's ook naast lokale concepten op. Verplichte verzonden foto's zijn
  vervangbaar; verzonden extra's zijn locked. Fase 2 toont alle fase-1-foto's als aanklikbare
  history en maakt iedere occurrence verplicht. Een eenfasige afgifte toont geen history.
- Afronden/afwijzen wist foto's van die dienst; uitloggen wist alles. Handtekening
  (`POST /api/signatures`) hoort niet bij deze stap.

## Gevolgen

- Camera vraagt een nieuwe development build (`expo-camera` + `expo-file-system`).
- Het verwerkingsformulier gebruikt dezelfde server/local-reconciliatie en uploadt niets zelf.
