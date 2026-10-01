# Instructies

Volg [CLAUDE.md](../CLAUDE.md), [docs/conventions.md](../docs/conventions.md) en [docs/architecture.md](../docs/architecture.md). Kort:

- Code en commentaar in het Engels, documentatie in het Nederlands.
- `domain/`, `api/` en `service/` zijn pure TypeScript zonder React Native. Buitenwereld via poorten.
- Domeinen praten alleen via `index.ts` (puur) of `ui.ts` (React Native) met elkaar.
- Alle API-antwoorden door een zod-schema. Server-state in TanStack Query, tokens alleen in de `TokenProvider`.
- Geen `enum`, `any`, `console.*` of hardcoded UI-tekst. Elke wijziging heeft een test; `pnpm run ci` moet slagen.

## Skills

- Wiki als specificatie: skill `wiki` in [`.agents/skills/wiki/`](../.agents/skills/wiki/). Gebruik bij `/wiki`, "wiki", of vragen over documentatie controleren/bijwerken.
