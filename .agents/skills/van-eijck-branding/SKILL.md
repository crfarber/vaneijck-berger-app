---
name: van-eijck-branding
description: Brand and UI rules for the Van Eijck mobile app (internal staff). Use when building or reviewing screens, components or styles for this app — colors, typography, spacing, components, copy (Dutch) and UX patterns.
---

# Van Eijck — Branding & UI rules

Apply these rules to all UI code (screens, components, styles). App language is **Dutch**; users are internal field staff (roadside assistance, transport, incident management), often working outdoors, one-handed, in a hurry.

## Principles

1. **Snelheid boven alles** — the most common action takes 1 tap. Prefill from the previous shift/session; sensible defaults (e.g. "volledig beschikbaar", "geen aanhanger").
2. **Direct zichtbaar** — show lists immediately on a full screen. No bottom sheets for primary selections.
3. **Eén tik = keuze** — tapping a list item selects and returns/advances; no extra confirm button.
4. **Rustig** — white/light-grey surfaces, yellow only for the primary action and selected state. No gradients, no emoji, no decorative icons.

## Colors

| Token          | Hex                        | Use                                                         |
| -------------- | -------------------------- | ----------------------------------------------------------- |
| `brand-yellow` | `#FFCE00`                  | Primary button, active state, license plate, progress       |
| `yellow-soft`  | `#FFFBE8`                  | Info notes, subtle selected background                      |
| `yellow-hit`   | `#FFF3B0`                  | Search match highlight                                      |
| `ink`          | `#16181C`                  | Text, secondary filled button, toggles on, selected borders |
| `text-2`       | `#5A6066`                  | Body/secondary text                                         |
| `text-3`       | `#8B9198`                  | Labels, meta, placeholders                                  |
| `border`       | `#E4E6E9`                  | Card/button outlines, toggle off                            |
| `divider`      | `#EEF0F2`                  | List row separators                                         |
| `surface-2`    | `#F2F3F5` / `#F4F5F7`      | Inputs, grouped cards, page background                      |
| `white`        | `#FFFFFF`                  | Main surface                                                |
| `success`      | `#2E9E5B` (text `#2E7A4B`) | "Geregistreerd"/active status dot                           |
| `danger`       | `#E23A2E`                  | Required marker, errors                                     |

Rules: text on yellow is always `ink`. Never put light grey text on yellow. Yellow is never used for large background areas except the plate chip and primary button.

## Typography

- UI font: **Manrope** (400–800). Fallback: `system-ui, sans-serif`.
- License plates and unit codes: **JetBrains Mono** 700. Those sizes stay on the component, outside this scale.
- Scale in `src/shared/ui/theme.ts` (`type`), matched to iOS Dynamic Type at the default Large size. Sizes are points. Spread a token, then set color. Override `fontWeight` only for emphasis on `body` (600 or 700).

| Token    | iOS style   | Size | Line height | Weight | Use                               |
| -------- | ----------- | ---- | ----------- | ------ | --------------------------------- |
| `small`  | Caption 1   | 12   | 16          | 400    | meta, time, version               |
| `label`  | Subheadline | 15   | 20          | 600    | field label, hint                 |
| `body`   | Body        | 17   | 22          | 400    | reading text, list, input, button |
| `header` | Title 3     | 20   | 25          | 600    | section and card title            |
| `large`  | Title 2     | 22   | 28          | 700    | screen title                      |

## Shape & spacing

- Radius: buttons/cards 12–14px · inputs 10–12px · chips 16–20px (pill) · plate 5–6px.
- Screen padding 16px; card padding 12–14px; gap between cards 8px.
- Min touch target **44px**; list rows 48–52px; primary button 52px high, full width.
- Shadows: at most `0 1px 3px rgba(0,0,0,.05)`. Prefer borders/surface contrast.

## Components

- **Kentekenplaat (plate chip)**: `background #FFCE00; color ink; font JetBrains Mono 700 14px; padding 3px 7px; radius 5px`. Format with dashes: `01-BXP-6`. Display only — never a large fake plate as input field.
- **Primary button**: yellow, ink text, 800 weight. One per screen.
- **Secondary button**: `ink` filled with white text (for strong alternatives like "Nee, geen aanhanger") or white with 1.5px `border` outline.
- **List row**: code left (mono 700), unit number right (`text-3`, 600), 1px `divider` bottom.
- **Search field**: `surface-2` background, no border; when focused 1.5px `ink` border. Highlight matched part with `yellow-hit`.
- **Summary row**: small label (`text-3`, 11px/700) above value (14px/700), chevron `›` right when tappable.
- **Toggle**: 40×24, off `border` track + white knob; on `ink` track + yellow knob.
- **Segmented / choice**: container `surface-2` with 6px padding; options white; active option yellow with ink text.
- **Chips (multi-select)**: pill, 1.5px `border`; selected = `ink` background, white text.
- **Progress (steps)**: 4px bars, done = yellow, todo = `border`.
- **Status**: 8px dot + label, e.g. green "Geregistreerd".

## UX patterns

- **Eenheid registreren**: voertuig → aanhanger (optioneel) → beschikbaarheid → einde dienst. Returning users get a prefilled overview ("Overgenomen van je vorige dienst") and register in one tap; new users get the step flow with "Stap x van 4".
- Most-used option first: "Laatst gebruikt" vehicle pinned on top; "Geen aanhanger" as first button.
- Availability: default "volledig beschikbaar"; show restrictions only when the user chooses "met beperkingen".
- End time: quick pick (+9 uur, incl. pauze) plus manual date/time; show remaining time ("nog 6 u 16 min").
- Overview screens: every row is directly editable (tap → the right screen).

## Copy (Dutch)

- Address the user as **je/jij**, short and direct. Questions as titles: "In welk voertuig rijd je vandaag?"
- Buttons are verbs: "Registreren", "Dienst starten", "Eenheid wijzigen", "Klaar".
- Terms: voertuig, aanhanger, eenheid, beschikbaarheid, einde dienst, incidentmanagement (IM), pechhulp, transport, opdrachten.
- No exclamation marks, no emoji, no jargon beyond these terms.

## Don'ts

- No bottom sheets for vehicle/trailer selection.
- No large yellow plate-shaped input fields.
- No gradients, heavy shadows, emoji, or left-border accent cards.
- Don't use yellow for text, or grey text on yellow.
- Don't add confirm dialogs for reversible choices.
