# 0007. Styling: StyleSheet met tokens

**Status:** voorgesteld, ter bevestiging. Open keuze: NativeWind.

## Besluit

`StyleSheet.create` met design-tokens uit `src/shared/ui/theme.ts` (kleuren, spacing, radius) en kleine primitieven in `src/shared/ui/` (`Button`, `TextField`, `Screen`). Geen losse kleuren of maten in schermen.

## Waarom

De web-boilerplate gebruikt Tailwind. NativeWind brengt dat naar React Native, maar voegt een Babel/Metro-laag en een tweede stijlsysteem toe. Voor een app met een beperkt aantal schermen is een kleine tokenlaag genoeg en heeft hij geen build-afhankelijkheid.

## Heroverwegen als

Er veel schermen bijkomen die dezelfde web-ontwerpsysteem delen, of het team liever met utility-classes werkt. De tokens in `theme.ts` zijn dan de bron voor de NativeWind-configuratie; schermen veranderen niet fundamenteel.
