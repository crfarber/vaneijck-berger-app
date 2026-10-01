# 0025. Statusscherm bij acties

**Status:** aangenomen.

## Context

ADR [0024](0024-feedback-en-dialogen.md) koos het lichtste patroon: laadstatus op de knop,
"duurt langer" onder de knop, en een toast voor het resultaat. In de praktijk tikten bergers
door tijdens het versturen — andere kaarten, terug, header-acties bleven bruikbaar. De toast
blokkeerde niets (`pointerEvents="box-none"`).

## Besluit

Verzend-acties (accepteren, afronden, weigeren, doorsturen, formulier versturen, beschikbaarheid,
eenheid registreren) gebruiken één blokkerend **statusscherm** over de hele app:

| Fase        | Kleur         | Gedrag                                                                        |
| ----------- | ------------- | ----------------------------------------------------------------------------- |
| Verwerken   | `brandAction` | Spinner + tekst; na 10 s "duurt langer"; blokkeert aanraking en Android-terug |
| Gelukt      | `success`     | Vinkje + tekst; sluit na 1,5 s (tik eerder)                                   |
| In wachtrij | `warning`     | Tekst `common.willRetry`; sluit na 2,5 s (tik eerder)                         |
| Mislukt     | `danger`      | Tekst + "Sluiten"; bij formulier ook "Opnieuw proberen"; blijft tot tik       |

- **`StatusOverlay`** in `shared/feedback`: Zustand-store, `run(message, task)` met de eindstand
  als returnwaarde van `task` (zodat het scherm niet dichtgaat tussen klaar en gelukt — oude
  fout #36). Een tweede `run` terwijl er één loopt wordt genegeerd (dubbel-tik).
- Bevestigingsvragen en bottom sheets komen **vóór** `run`. Uitkomsten die een dialoog vragen
  (`reregister-required`, `blocked`) geven `tone: 'none'` en openen daarna de bestaande `Alert`.
- Toasts blijven voor niet-blokkerende meldingen. ADR 0024 blijft gelden voor bevestigingen,
  sheets, validatie en schermen met meerstaps-invoer.

## Gevolgen

- Laadstatus op knoppen en `useSlowHint` voor deze acties verdwijnen; de "duurt langer"-tekst
  zit in het statusscherm.
- `action-feedback` mapt naar `kind: 'status'` met `success` / `queued` / `error` (was `toast`
  met `info` voor queued).
- Host hangt in de root-layout naast `ToastHost`, zodat hij navigatie overleeft.
