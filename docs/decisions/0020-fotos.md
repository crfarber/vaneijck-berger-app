# 0020. Nieuwe fotostroom

**Status:** gebouwd (scherm + wachtrij). Handtekening volgt later.

## Context

De oude fotostroom (`photo.store`, `photo-session.store`, `kind` versus `isExtra`, een
positioneerscherm, fase-2-tegels die vlaggen kopiëren) was breekbaar: de chauffeur moest een
backend-regel bijhouden die de app zelf kan bepalen. Slice 8 bouwt die stroom opnieuw, zonder de
oude stores of schermen over te nemen.

## Besluit

- Nieuw domein `photos`: één lijst van foto's per apparaat (metadata in `KeyValueStore`, JPEG via
  de poort `PhotoFiles`). Status `queued` | `sent` | `failed`.
- `isExtra` wordt niet opgeslagen. Bij uploaden telt `isExtraForUpload` alleen foto's van dezelfde
  dienst, fase en type, op volgorde van `takenAt`. Een laadfoto maakt een afleverfoto nooit
  "extra".
- Upload: `POST /api/binary/upload?content=photo` als multipart, velden zoals
  `UploadPhotoAndPosition` (inclusief `ImagePosition` als `{ name, position? }` met Nederlandse
  labels). Netwerk/5xx: blijft `queued` en wordt hervat. Andere 4xx: `failed`, bestand blijft.
- Geen bruikbare locatie: foto blijft in de wachtrij; bij drain wordt `LocationReader` opnieuw
  gevraagd.
- Scherm tijdelijk vanaf dienst- en PLTR-scherm (`…/photos`). Type kiest de berger zelf tot het
  formulier verplichte types meegeeft. Fase afleveren toont laadfoto's read-only.
- Afronden/afwijzen wist foto's van die dienst; uitloggen wist alles. Handtekening
  (`POST /api/signatures`) hoort niet bij deze stap.

## Gevolgen

- Camera vraagt een nieuwe development build (`expo-camera` + `expo-file-system`).
- Het verwerkingsformulier opent later hetzelfde scherm; het formulier uploadt niets zelf.
