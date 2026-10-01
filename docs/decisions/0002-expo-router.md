# 0002. Expo Router

**Status:** voorgesteld, ter bevestiging.

## Context

De oude app gebruikt React Navigation met een `Route`-enum, imperatieve `navigate()`-aanroepen in stores en hooks, en een `navigationRef` in de token-manager om na een verlopen sessie te navigeren.

## Besluit

Expo Router (bestandsgebaseerd, bovenop React Navigation). Routes in `src/app/` zijn dun: ze geven een scherm uit een domein door. Ingelogd of niet wordt **niet** genavigeerd maar bepaald met `Stack.Protected` op de sessiestatus.

## Gevolgen

- Een verlopen sessie hoeft niemand te weten: de status verandert en het loginscherm verschijnt. Daarmee verdwijnt de `navigationRef` uit het sessiebeheer.
- Deep links (notificaties) worden routes; getypeerde routes (`typedRoutes`) vangen kapotte paden bij het compileren.
- De domeinlogica beslist over bestemmingen als data (`ExitTarget`), niet als route-naam; het scherm vertaalt dat naar een route. Zo blijft `getExitTarget` testbaar zonder router.

## Alternatieven

React Navigation direct: meer handwerk, dezelfde onderliggende bibliotheek. Bij bezwaar valt er weinig te verliezen: de domeinlagen weten niets van de router.
