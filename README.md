# JLU Design System

Gemeinsame Design-Tokens, Theming und React-UI-Komponenten für JLU-Projekte.
Ziel: **ein** einheitliches Look & Feel, konsumiert als Dependency
(`@ki4jlu/design-system`) statt pro Projekt kopiert.

- **Tokens** (`tokens.css`): zweischichtig — Primitive (`--p-*`) → semantische
  Tokens (`--color-primary`, `--color-surface-container-*`, Status-,
  Interaktions-, Elevation-, Typo-/Spacing-/Radius-Tokens), hell + dunkel.
- **Komponenten**: Button, Card, Input, Label, Dialog, Form-Feld-Primitives,
  SettingsDialog — shadcn/ui-basiert (Radix + Tailwind 4), ausschließlich über
  semantische Tokens gestylt.
- **Theming**: `ThemeProvider` (hell / dunkel / system, `data-theme` auf
  `<html>`), `useTheme`, `AppearanceSettings`.
- **Enforcement**: ESLint-Plugin (`no-hardcoded-colors`, `no-raw-ui-elements`).

Dokumentation & Beispiele: **Storybook** — `npm run storybook`
(Komponenten-Referenz mit Props-Tabellen, Token-Spickzettel, Theming-Guide).
Governance & Beitragsprozess: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md),
Nutzungsregeln: [docs/COMPONENT_GUIDELINES.md](docs/COMPONENT_GUIDELINES.md).

## Installation im Projekt

### Empfohlen: direkt aus git (ohne Token)

Das Repo ist öffentlich, dieser Weg braucht **keine Registry und keinen Token** —
weder lokal noch in CI noch im Docker-Build:

```bash
npm install github:KI4JLU/JLU-Design-System#v0.21.0
```

Immer auf einen **Tag** pinnen, nicht auf `main`. Beim Installieren baut das
`prepare`-Script `dist/` (inkl. `tokens.css`); npm holt dafür kurzzeitig die
devDependencies, führt deren Install-Scripts aber nicht aus — es landet also
weder Storybook noch ein Playwright-Browser im Consumer-Baum.

Einzige Voraussetzung: `git` muss in der Build-Umgebung verfügbar sein (in
schlanken Docker-Images ggf. nachinstallieren).

### Alternativ: GitHub Packages Registry

`npm.pkg.github.com` verlangt einen Token — **auch für öffentliche Packages**;
das ist eine Einschränkung der npm-Registry von GitHub Packages. Einmalig
`.npmrc` im Projekt:

```ini
@ki4jlu:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Token mit `read:packages`-Scope, lokal z. B.:

```bash
gh auth refresh -h github.com -s read:packages
export NODE_AUTH_TOKEN=$(gh auth token)
npm install @ki4jlu/design-system
```

(In GitHub Actions reicht das eingebaute `GITHUB_TOKEN`.)

## Einbindung (Tailwind-4-App)

Zentrales CSS:

```css
@import "tailwindcss";
@import "@ki4jlu/design-system/tokens.css";
@source "../node_modules/@ki4jlu/design-system";
```

App-Wurzel + `index.html`:

- `<ThemeProvider>` um die App mounten.
- No-Flash-Skript in den `<head>` übernehmen (siehe Storybook „Theming“).
- Fonts lädt die App selbst: **Inter, Manrope**. Monospace (`font-mono`) nur für Code, über die System-Schriften — kein Webfont.

```tsx
import { ThemeProvider, Button, Card } from "@ki4jlu/design-system";
```

## Entwicklung

```bash
npm install
npm run storybook        # Workbench + Doku (Port 6006)
npm test                 # Vitest (jsdom)
npm run lint             # inkl. dogfooded design-system-Regeln
npm run build            # dist/: ESM + d.ts + tokens.css
```

> **Hinweis (npm-Bug):** `@emnapi/*` steht absichtlich in den devDependencies.
> npm auf macOS wirft diese Linux/WASI-only Optional-Deps sonst bei jedem
> inkrementellen `npm install` aus dem Lockfile, woraufhin `npm ci` in der CI
> fehlschlägt (npm/cli#4828). Nicht entfernen.

## Release

Version in `package.json` erhöhen (semver), Changelog in
`docs/DESIGN_SYSTEM.md` pflegen, dann Tag pushen — GitHub Actions
veröffentlicht nach GitHub Packages:

```bash
npm version 0.2.0
git push --follow-tags
```
