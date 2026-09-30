# Component Usage Guidelines

How to build UI in this app. These are enforceable rules — PRs that violate them
should be sent back. See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for tokens and
governance.

## The three rules

1. **Use shared components.** Reach for `@ki4jlu/design-system` (Button, Card, Input,
   Label, Dialog, Form field primitives) instead of raw `<button>` / `<input>` /
   ad-hoc card `<div>`s. A raw control needs a one-line justification in the PR.
2. **No hardcoded colors.** Every color goes through a semantic token
   (`bg-primary`, `text-on-surface`, `border-outline-variant`, `bg-success`, …).
   Never `bg-blue-500`, `text-gray-700`, `#0052ff`, `green-600`, etc.
3. **No manual `dark:` color variants.** Tokens switch with the theme
   automatically. `dark:` is only for the rare non-color tweak.
4. **`className` on shared components is layout-only** (width, margins, grid
   placement, `ml-auto`). Never re-skin a component at the call site (colors,
   padding, typography) — that makes the app diverge from Storybook. If a
   component doesn't look right, add/change a variant in the design system;
   Storybook and every app then stay 1:1. Enforced by
   `design-system/layout-only-classname` (warn).
5. **Controls are never shrunk to fit.** A button's label must fit at its
   stock size — no `leading-tight`, `break-words`, `truncate`, or crushed
   paddings to squeeze it in. If the space can't hold the actions, reduce the
   number of actions or switch to icon buttons with `aria-label`. (Origin:
   three squeezed footer buttons on the connector cards.)

## Colors → tokens cheat sheet

| Need | Token utility |
|------|---------------|
| Page / app background | `bg-surface` (text `text-on-surface`) |
| Card / raised panel | `bg-surface-container-lowest` + `border-outline-variant` (use `<Card>`) |
| Muted/secondary text | `text-on-surface-variant` |
| Primary action | `bg-primary text-on-primary` (use `<Button>`) |
| Secondary action | `bg-secondary-container text-on-secondary-container` |
| Borders / dividers | `border-outline-variant` (stronger: `border-outline`) |
| Focus ring | `ring-focus-ring` (shared components already do this) |
| Success / online | `bg-success` / `text-success`; soft badge: `bg-success-container text-on-success-container` |
| Info / pending | `text-info` / `bg-info-container text-on-info-container` |
| Warning | `text-warning` / `bg-warning-container text-on-warning-container` |
| Error / destructive | `text-error`; button: `<Button variant="destructive">` |
| Brand wordmark (use `<Logo>`) | `text-brand-wordmark` (prefix) + `bg-brand text-on-brand` (badge); badge is theme-invariant |
| Elevation | `shadow-card`, `hover:shadow-card-hover`, `shadow-overlay` |

If you need a color with no matching token, **don't invent a hex** — propose a new
token via the process in DESIGN_SYSTEM.md §6.

## Generating a component with the shadcn CLI

`npx shadcn@latest add <component>` is the preferred way to start a new
component (wired via [`components.json`](../components.json); it writes flat
into `src/components/`). What it emits is **shadcn's** vocabulary, not ours —
generated files are normalised before merge. This section is the canonical
reference for that normalisation; DESIGN_SYSTEM.md §4/§6 point here rather than
restating it.

### shadcn → JLU token mapping

The CLI styles components against its own Tailwind-4 CSS-variable set
(`bg-background`, `text-muted-foreground`, `border-input`, …). Re-point every
one of them to a JLU semantic token. Every `--color-*` / `--radius-*` /
`--shadow-*` name below was checked to exist in
[`src/tokens.css`](../src/tokens.css); "none" means the concept has **no** JLU
equivalent and needs a token proposal (DESIGN_SYSTEM.md §6), not an invented
name.

**The authoritative list is the CLI's own diff, not this table.** Read what the
run actually injected into `src/tokens.css` (see the next subsection) — any
variable in that diff which is missing below is unmapped: treat it as "no token
yet, open a card" instead of guessing a counterpart.

| shadcn variable → utility | JLU utility | Backing token in `src/tokens.css` + note |
|---|---|---|
| `--background` → `bg-background` | `bg-surface` | `--color-surface`. `--color-background` also exists and holds the same primitive, but `surface` is the documented M3 vocabulary every component uses — keep one name. |
| `--foreground` → `text-foreground` | `text-on-surface` | `--color-on-surface`. |
| `--card` → `bg-card` | `bg-surface-container-lowest` | `--color-surface-container-lowest`. No `--color-card`. A card is a *raised* surface, not the page: pair with `border-outline-variant` + `shadow-card`, as [`card.tsx`](../src/components/card.tsx) does. |
| `--card-foreground` → `text-card-foreground` | `text-on-surface` | `--color-on-surface`. No separate token — `on-surface` is the correct text color on a container. |
| `--popover` → `bg-popover` | `bg-surface-container-lowest` + `shadow-overlay` | `--color-surface-container-lowest`, `--shadow-overlay`. No `--color-popover`. A floating panel is the *same* color as a card; the **elevation** distinguishes it — `popover.tsx`, `dropdown-menu.tsx` and `select.tsx` all use exactly this pair. |
| `--popover-foreground` → `text-popover-foreground` | `text-on-surface` | `--color-on-surface`. |
| `--primary` → `bg-primary` | `bg-primary` | `--color-primary`. Name coincides, value does not: ours is the brand blue and it **inverts in dark** (light accent on dark text), so never pair it with a literal white. |
| `--primary-foreground` → `text-primary-foreground` | `text-on-primary` | `--color-on-primary`. |
| `--secondary` → `bg-secondary` | `bg-secondary-container` | `--color-secondary-container`. **Not** `bg-secondary`: `--color-secondary` exists but has *no* dark-block override and is used by no component, so a control styled on it would not switch theme. The secondary *action* pair is the one in [`button-variants.ts`](../src/components/button-variants.ts). |
| `--secondary-foreground` → `text-secondary-foreground` | `text-on-secondary-container` | `--color-on-secondary-container` (has a dark override). `--color-on-secondary` exists too — same reason not to use it. |
| `--muted` → `bg-muted` | `bg-surface-container` | `--color-surface-container`. No `--color-muted`. If the generated usage is really a row *hover/highlight* fill rather than a quiet panel, use `bg-surface-container-high` — that is what our menu/select/dropdown rows use. |
| `--muted-foreground` → `text-muted-foreground` | `text-on-surface-variant` | `--color-on-surface-variant`. Same role, different naming logic: shadcn names the *surface* ("muted"), we name the *relationship* — text **on** a surface, the quieter variant. Also our placeholder color ([`field-variants.ts`](../src/components/field-variants.ts)). |
| `--accent` → `bg-accent` | `bg-surface-container-high` | `--color-surface-container-high`. No `--color-accent`, and none is wanted: shadcn's `accent` is not a brand accent — it is the hover / keyboard-highlight fill of menu rows, which is `surface-container-high` in `dropdown-menu.tsx`, `select.tsx`, `menu-item-variants.ts` and Button's `ghost`/`outline` hover. |
| `--accent-foreground` → `text-accent-foreground` | `text-on-surface` (i.e. leave the resting text color) | `--color-on-surface`. Our rows do **not** recolor text on hover, only the fill changes — do not invent an `on-accent`. |
| `--destructive` → `bg-destructive` / `text-destructive` | `bg-error` / `text-error` | `--color-error`. Prefer `<Button variant="destructive">` over restyling. If the generated file puts a literal `text-white` on a destructive surface, that is a re-point too → `text-on-error`. |
| `--destructive-foreground` → `text-destructive-foreground` | `text-on-error` | `--color-on-error`. |
| `--border` → `border-border` | `border-outline-variant` | `--color-outline-variant`. No `--color-border`. Stronger line: `border-outline` (`--color-outline`). |
| `--input` → `border-input` | `border-outline-variant` | `--color-outline-variant`. shadcn's `input` is only the field *border* color, not a fill; `field-variants.ts` frames Input/Textarea with exactly this. |
| `--ring` → `ring-ring`, `outline-ring/50` | `ring-focus-ring` | `--color-focus-ring`. Keep our focus recipe: `focus-visible:ring-2 focus-visible:ring-focus-ring` (plus `focus-visible:ring-offset-2 focus-visible:ring-offset-surface` on controls). |
| `--radius` → `rounded-sm` / `rounded-md` | `rounded-action` (buttons, nav rows) · `rounded-field` (Input/Textarea) · `rounded-xl` (cards, popovers, menus) | `--radius-action`, `--radius-field`, `--radius-xl`. **Silent-divergence trap:** `rounded-md`/`rounded-sm` *compile* — `--radius-md: .375rem` and `--radius-sm: .25rem` come from Tailwind's own default theme, verified in the built CSS, **not** from `src/tokens.css`, which defines only `--radius-DEFAULT`, `-lg`, `-xl`, `-full`, `-action`, `-field`. A leftover `rounded-md` therefore looks fine and is not a token. (shadcn centres its radii on a single `--radius`; the exact derivation depends on the CLI version — read the diff, don't assume.) |
| `--chart-1` … `--chart-4` → `fill-chart-1`, `stroke-chart-2`, `bg-chart-3` | same names | `--color-chart-1` … `--color-chart-4`. Names coincide; values are ours and lighten in dark. We additionally have `chart-track` (donut/bar backgrounds), which shadcn has no equivalent for. |
| `--chart-5` | **none — no token yet, open a card** | Our series ramp stops at 4. A 5th series needs a primitive + a light *and* dark value through DESIGN_SYSTEM.md §6 — do not reuse `chart-track` (it is a background, not a series) and do not add a hex. |
| `--sidebar` → `bg-sidebar` | `bg-surface-container-lowest` | **No `sidebar-*` tokens exist, deliberately.** Our [`SidePanel`](../src/components/side-panel-variants.ts) uses the ordinary surface vocabulary. |
| `--sidebar-foreground` | `text-on-surface` | `--color-on-surface`. |
| `--sidebar-primary` / `--sidebar-primary-foreground` | `bg-primary` / `text-on-primary` | `--color-primary` / `--color-on-primary`. This is the active top-level row in [`nav-item-variants.ts`](../src/components/nav-item-variants.ts). |
| `--sidebar-accent` / `--sidebar-accent-foreground` | `bg-secondary-container` / `text-on-secondary-container` | `--color-secondary-container` / `--color-on-secondary-container`. NavItem's hover and its active *sub*-level row. |
| `--sidebar-border` | `border-outline-variant` | `--color-outline-variant`. |
| `--sidebar-ring` | `ring-focus-ring` | `--color-focus-ring`. |

A generated `sidebar` component that wants the whole `sidebar-*` block as its
own palette is a **token proposal** (DESIGN_SYSTEM.md §6), not a local hex and not a new parallel
vocabulary: the sidebar is chrome built from the same surfaces as everything
else, which is why one theme change moves it too.

### The CLI's token injection into `src/tokens.css` is reverted

`components.json` points the CLI at `"css": "src/tokens.css"` with
`cssVariables: true`, so `shadcn add` will **write its own token block into our
token file** (its `--background`, `--card`, `--muted`, `--sidebar-*`, `--radius`
… with literal color values). That injection is always reverted — keep the
component file, drop the CSS. `src/tokens.css` has exactly one vocabulary, and
every semantic token references a primitive (`var(--p-*)`); a second, literal
palette sitting next to it is how the two silently drift apart.

Reviewer guardrail (from DESIGN_SYSTEM.md §2) — must return **nothing**:

```bash
grep -nE '^\s*--(color|shadow)-[a-z-]+:\s*#' src/tokens.css
```

That one catches a literal **hex**. The CLI's block does not necessarily use
hex, so check the injected *names* and non-hex color functions too — both must
also return nothing:

```bash
grep -nE -- '--color-(card|popover|muted|accent|destructive|ring|input|border|sidebar)' src/tokens.css
grep -nE 'oklch\(|@theme inline' src/tokens.css
```

All three are clean on the current file — a hit means a `shadcn add` was merged
without reverting its injection.

### Post-generation checklist

Run these in order on every file `shadcn add` produced, before the PR:

1. **Re-point the tokens.** Replace every shadcn color/radius utility using the
   mapping table above. A concept with no JLU token stops here: propose the
   token (DESIGN_SYSTEM.md §6) or open a card — never a hex, never a raw Tailwind palette class
   (`no-hardcoded-colors` is an ESLint **error**, but `rounded-md` and
   `bg-background` pass lint, so this step is a *read*, not just a lint run).
2. **Revert the `src/tokens.css` injection** and run the three guardrail greps
   above.
3. **Swap the Radix import.** Generated files import from the unified `radix-ui`
   package (`import { Tooltip } from "radix-ui"`). Replace it with the
   individual `@radix-ui/react-*` package this repo already lists in
   `dependencies`, so there is one Radix style and the import stays
   externalised out of the bundle. If the needed `@radix-ui/react-*` package is
   not in `dependencies` yet, add it there (not the unified package).
4. **Move the `cva` variant map into a sibling `*-variants.ts`** — the generator
   puts it inline in the component file. `foo.tsx` + `foo-variants.ts`,
   following [`button-variants.ts`](../src/components/button-variants.ts). This
   is the standing repo rule (rationale in DESIGN_SYSTEM.md §4), not a
   generation detail — it just always needs doing after a generate.
5. **Add a story, an MDX page where the component needs prose, and a test**
   where behaviour is non-trivial: `foo.stories.tsx` next to the component
   (Storybook *is* the documentation — autodocs props table, a11y addon), plus
   `foo.test.tsx` for behaviour. Meet the accessibility bar in
   DESIGN_SYSTEM.md §5.
6. **Both-theme visual QA.** Switch the Storybook theme toolbar to light **and**
   dark and look at the component in each — including hover, active, focus and
   disabled. This is a required pass, not code review (DESIGN_SYSTEM.md §3);
   missing interaction states are the most common theme bug. There is no
   automated visual-regression gate behind it (DESIGN_SYSTEM.md §4), so this
   pass is the only check on rendering. New variants also need owner review.

## Button

```tsx
import { Button } from "@ki4jlu/design-system";

<Button onClick={save}>Speichern</Button>                 // primary
<Button variant="secondary">Abbrechen</Button>
<Button variant="outline" size="sm">Filter</Button>
<Button variant="ghost" size="icon" aria-label="Menü"><Icon name="menu" /></Button>
<Button variant="destructive">Löschen</Button>

// Render a router Link with button styling:
<Button asChild variant="outline">
  <Link to="/widgets/1">Öffnen</Link>
</Button>
```
- Variants: `default` (primary) · `secondary` · `outline` · `ghost` · `destructive` · `link`.
- Sizes: `default` · `sm` · `lg` · `icon`.
- Icon-only buttons **must** have an `aria-label`.
- To style variants elsewhere, import `buttonVariants` from
  `@ki4jlu/design-system-variants` (not from `button.tsx`).

## Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@ki4jlu/design-system";

<Card>
  <CardHeader>
    <CardTitle>Titel</CardTitle>
    <CardDescription>Untertitel</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter>…</CardFooter>
</Card>
```
`Card` has **no padding** by default — use the sub-parts (each `p-6`) or add
`className="p-6"`. It defaults to `rounded-xl`; override with `className="rounded-2xl"`.

## Forms (Input + Label + Form field primitives)

```tsx
import { Input } from "@ki4jlu/design-system";
import { FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@ki4jlu/design-system";

<FormItem error={errors.email}>
  <FormLabel>E-Mail</FormLabel>
  <FormControl>
    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
  </FormControl>
  <FormDescription>Wir teilen sie nicht.</FormDescription>
  <FormMessage />           {/* renders errors.email when set */}
</FormItem>
```
- `FormItem` generates the id and lays out the field (`flex flex-col gap-1`).
- `FormLabel` binds `htmlFor` automatically; `FormControl` injects `id`,
  `aria-invalid`, and `aria-describedby` onto its single child control.
- Pass the current error string to `FormItem error=` — it drives `aria-invalid`,
  the label/error color, and `FormMessage`.
- This is intentionally **not** react-hook-form. If a form needs schema
  validation, adopt RHF + zod behind these same call sites.
- A standalone label (no field wrapper) → `<Label htmlFor="…">`.

## Dialog

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@ki4jlu/design-system";

<Dialog>
  <DialogTrigger asChild><Button>Öffnen</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titel</DialogTitle>
      <DialogDescription>Beschreibung</DialogDescription>
    </DialogHeader>
    …
    <DialogFooter>
      <Button variant="secondary">Abbrechen</Button>
      <Button>Bestätigen</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```
Radix gives focus trap, Escape-to-close, scroll lock, and ARIA roles for free —
**always** use this instead of a hand-rolled modal. Every dialog needs a
`DialogTitle` (screen-reader requirement); a close "X" is included automatically.

## Tooltip

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@ki4jlu/design-system";

<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Aktualisieren"><RefreshCw aria-hidden /></Button>
  </TooltipTrigger>
  <TooltipContent>Daten neu laden</TooltipContent>
</Tooltip>
```
Replaces `title=` attributes and hand-rolled hover hints — `title` is invisible
to keyboard and touch users. No app-level setup: each `Tooltip` mounts its own
provider. The trigger keeps its accessible name (`aria-label`); the tooltip only
*describes* it. Never put essential content or actions in a tooltip (touch can't
reach it), never interactive elements (use `Popover`), and drop any leftover
`title=` on the same control. Disabled triggers need a focusable wrapper —
see the „DisabledTrigger" story.

## Table

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@ki4jlu/design-system";

<Table containerClassName="max-h-72">        {/* Höhe = vertikales Scrollen */}
  <TableCaption>Zugriffsschlüssel</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead className="text-right whitespace-nowrap">Erstellt</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Ingest-Pipeline</TableCell>
      <TableCell className="text-right whitespace-nowrap">01.02.2026</TableCell>
    </TableRow>
  </TableBody>
</Table>
```
Replaces hand-styled `<table style={{…}}>` blocks and the markdown-table
overrides in the apps. **The scroll container belongs to `Table`** — never add
another `overflow-x-auto` at the call site; `containerClassName` is the only
handle on it. `TableHead` defaults to `scope="col"` (that is what makes it a
column header); `TableCaption` is the table's accessible name and must be the
first child of `<table>`. Cells wrap by default — put `whitespace-nowrap` on
the individual cells that must not (dates, amounts, actions). Empty state is
one row with `colSpan` across all columns, header kept. `Table` is the table,
`TableLayout` is the page around it; the normal case is `Table` as
`TableLayout`'s children.

## Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ki4jlu/design-system";

<Tabs defaultValue="einzeln">                 {/* oder value + onValueChange */}
  <TabsList aria-label="Freigabe">
    <TabsTrigger value="einzeln">Einzeln</TabsTrigger>
    <TabsTrigger value="link">Einladungslink</TabsTrigger>
  </TabsList>
  <TabsContent value="einzeln">…</TabsContent>
  <TabsContent value="link">…</TabsContent>
</Tabs>
```
Replaces hand-rolled tab strips — rows of `<button>` carrying `role="tab"`
without a `tabpanel`, or panel switches that never announce themselves as tabs.
**Choose by one question: does the strip name a region of content?** Yes → `Tabs`
(one `TabsContent` per trigger; the panel's accessible name is its tab). No, it
only sets a *value* and what changes is data in a region the strip does not name
(a filtered list, a chart range) → `SegmentedControl`. Switching which view the
viewport shows → `BottomTabBar` (`aria-current="page"`). A `role="tab"` without a
panel is wrong either way. `value` lands in the generated ids — use a slug, not
the label. Inactive panels are **unmounted**, so panel-local state (a half-typed
form) must live at the call site. Arrow keys select as they move; use
`activationMode="manual"` when a panel costs a request. `orientation="vertical"`
turns the strip and swaps the arrow keys.

## Toast

```tsx
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction, ToastClose } from "@ki4jlu/design-system";

<ToastProvider>
  <App />
  {toasts.map((t) => (                      {/* die Liste gehört der App */}
    <Toast key={t.id} variant={t.variant} onOpenChange={(o) => !o && remove(t.id)}>
      <ToastTitle>{t.message}</ToastTitle>
      <ToastClose />
    </Toast>
  ))}
  <ToastViewport />                          {/* genau einer, App-Wurzel */}
</ToastProvider>
```
Ersetzt handgebaute Meldungsstapel (JustRAGs `ToastContainer.tsx` + `Toast.css`).
**Drei Teile müssen stehen** — Provider, *ein* Viewport, ein `Toast` je Meldung;
ohne gemounteten Viewport rendert ein `Toast` still gar nichts. `variant`
(`neutral` · `success` · `error` · `warning` · `info`) steuert Akzentkante, Icon,
Standarddauer **und** Dringlichkeit der Screenreader-Ansage (`error` assertiv,
sonst höflich; `type` übersteuert). Der Toast **stiehlt keinen Fokus**; der Timer
pausiert bei Hover und bei Fokus (F8 springt in den Viewport) — das ist die
Antwort auf WCAG 2.2.1, zusammen mit `ToastClose` und `duration={Infinity}`.
`duration={0}` schaltet Auto-Dismiss **nicht** ab (Radix behandelt `0` als „nicht
gesetzt"). Ein Toast mit `ToastAction` bekommt immer `duration={Infinity}` — eine
Aktion, die sich nach vier Sekunden wegräumt, ist unbenutzbar; `altText` an der
Aktion ist Pflicht und ersetzt die Beschriftung in der Ansage. Warteschlange,
Obergrenze und Entdopplung bleiben in der App; das Paket liefert keinen
`toast()`-Singleton. Nichts Essenzielles nur im Toast — er verschwindet und ist
danach nicht mehr auffindbar.

## Layout & Templates

Pages are **assembled, not laid out by hand**:

```tsx
import { AppShellLayout, DashboardLayout, Grid, Stack } from "@ki4jlu/design-system";

<AppShellLayout
  logo={<Brand />}
  nav={<NavItems />}
  sidebarFooter={<UserMenu />}
  // controlled column state + the narrow-screen tabs, both required since 0.30.0
  leftOpen={leftOpen}
  onLeftOpenChange={setLeftOpen}
  mobileTabs={[{ id: "nav", icon: <Menu />, label: "Bereiche", pane: "left" },
               { id: "page", icon: <Home />, label: "Seite", pane: "main" }]}
  activeMobileTab={tab}
  onMobileTabChange={setTab}
  mobileTabBarLabel="Bereich wechseln"
>
  <DashboardLayout title="Statistiken" actions={<RangeSwitch />} stats={<KpiCards />}>
    <Grid cols={2}>…</Grid>
  </DashboardLayout>
</AppShellLayout>
```

- **Use the templates** (`AppShellLayout`, `AuthLayout`, `DashboardLayout`,
  `FormLayout`, `ChatLayout`, `TableLayout`, `SectionedGridLayout`) for their
  page category — never rebuild a page skeleton in the app. Missing slot/variant?
  Extend the template in the design system (owner review), don't fork the
  layout.
- **Three-pane workspaces** (side pane | content | side pane, one area at a
  time on narrow screens) are `AppShellLayout` with a `rightPanel`: pass each
  column's open state and width and the current mobile tab in as controlled
  props — never a breakpoint check or a pane frame of your own. Hiding the
  right column goes through `showRight`, never through its collapse state.
  (`WorkspaceLayout`, the standalone wrapper for this case, was removed in
  KI-846.)
- **The shell's nav column is `AppShellLayout`'s `leftOpen` /
  `onLeftOpenChange` (0.30.0), and the state lives in the app.** Hold it where
  the app already holds user preferences (context, URL, `localStorage`) and
  pass it down; there is no `defaultOpen`, and a second source of truth is the
  bug those props prevent. `leftOpen` is the **inverse** of the `collapsed`
  prop it replaced — `collapsed={true}` is `leftOpen={false}`; a mechanical
  rename inverts the UI silently. Collapsed is the 60px rail, not an icon
  column: pass `collapsedPreview` on the panel if you want icons in it. Do
  **not** put your own minimise button into `logo` — the column renders its
  own toggle in the header row, on the edge facing the content, with the
  `aria-expanded`/`aria-controls` wiring already done. Below `lg` the shell
  shows **one area at a time** plus a `BottomTabBar`, so the four tab props
  (`mobileTabs`, `activeMobileTab`, `onMobileTabChange`, `mobileTabBarLabel`)
  are required and the call site still writes no breakpoint check: which tab
  shows which area is data. There is no drawer and no burger button any more.
  A second column on the right is `rightPanel` (an `AppShellPanel`, the same
  shape `AppShell.left`/`.right` take). Do not compose `AppShell` +
  `SidePanel` by hand to get any of this. Every nav row that should collapse
  into the rail needs a `label` on its `NavItem`. (The legacy standalone
  `Sidebar` was removed in KI-846; there is no nav column outside the
  shell any more.)
- **`AppShellLayout` brings the chrome; every other app-page template is its
  child.** `SectionedGridLayout`, `DashboardLayout`, `FormLayout`,
  `TableLayout` and `ChatLayout` are page content, hung in as `children`, and
  keep their own `<section aria-label>` inside the shell's single `<main>`.
  The dividing question for a new template is whether it brings the chrome or
  fills a slot — not how big it is. Until KI-846 `WorkspaceLayout` was the
  one standalone, chrome-owning exception; since 0.37.0 it was only an
  `AppShell` without a bar, and it was removed in favour of
  `AppShellLayout` with a `rightPanel`. (`AuthLayout` stays outside the
  shell: sign-in pages carry no app chrome.)
- **Overview pages of grouped card collections** are `SectionedGridLayout`:
  pass `sections` (each with `isOpen`/`onOpenChange` as controlled props) and
  hang the template into `AppShellLayout` as `children`. Per section the body
  is exactly one of `items` (+ optional `createCell` as the first grid cell),
  `emptyState`, or a free-form `body` — the app decides which, the template
  never derives „empty" from `items`. No hand-rolled accordion, no
  `defaultOpen`, no breakpoint ladder: `Grid cols` already collapses.
- **Spacing through primitives**: gaps/rhythm via `Stack`/`Grid` `gap`
  (`sm|md|lg|gutter` = spacing tokens), page margins via `Container` — no
  ad-hoc `gap-[13px]` or hand-rolled breakpoint ladders; `Grid cols` already
  collapses responsively.
- **The page width is a `Container` `size`, never a class at the call site.**
  Three named roles: `page` (1440px, the page maximum — dashboards, wide
  tables, editor views), `content` (1000px — the ordinary page of cards,
  grids and sections) and `reading` (672px — running text or form fields;
  `FormLayout` uses it). A new page starts at `content`. `max-w-[1000px]` or
  any `max-w-*` on a `Container` is a review FAIL and **lint cannot catch
  it**: `layout-only-classname` only checks `DS_CONTROLS`, which contains no
  composition components (KI-711). If the width you need has no name, add a
  token + variant in the design system — see `container.mdx`, which also
  carries the measured characters-per-line per width.
- **Who renders the page heading is one rule, not a per-template habit** — see
  "Page headings: who owns them" below. Short version: the template renders the
  `title` as a real heading, `headingLevel` picks its level (default `1`), and a
  template nested in a page that already has an `<h1>` passes `headingLevel={2}`.
- Templates carry **no business logic**: routing lives in the injected
  `NavItem`s, form state in the app (`FormLayout` renders no `<form>` — wrap
  your own around it), chat state in the widget.
- Storybook group `Templates/` documents each template's slots, responsive
  behavior, and do's/don'ts.

## Page headings: who owns them

**The rule, one sentence: a template renders the `title` it is given as a real
heading element, and the call site owns that heading's *level* through one prop,
`headingLevel`.** A template never decides where in the outline it sits, because
it cannot know what is above it.

This was the third boundary question this system had to settle only after a
consumer hit it (Tabs vs. SegmentedControl on KI-560, Checkbox vs. Switch on
KI-698), and the state it replaced was **four different behaviours in eight
templates**: one rendered the title as a `div` (no heading at all), three forced
an unreachable `<h1>`, one rendered a forced `<h1>` *and* a hardcoded `<h2>`,
and three rendered no heading. No consumer could form an expectation, and one
did the reasonable thing and shipped a defect: two admin pages that used to
carry `<h2>` (they render inside a frame whose own `<h1>` is the page title)
came out with **two `<h1>`s** after adopting `DashboardLayout` correctly — a
fresh WCAG 1.3.1 failure created by using the library as documented.

### The four parts of the rule

1. **A `title` prop is rendered as a heading element, never as styled text.**
   `PageHeader` does this for the content templates; `CardTitle asChild` does it
   for `AuthLayout`. A visually obvious heading that is a `div` is a 1.3.1
   defect, and it silently pushes the work back to every call site.
2. **The level is the call site's, through `headingLevel: 1 | 2 | 3 | 4 | 5 | 6`**
   (exported as `HeadingLevel`). One prop name, one type, everywhere. It is a
   *number* and not `as="h2"` on purpose: a number cannot express "render this
   as a `div`", so the prop can never re-open the defect it was added to close,
   and levels compose arithmetically (see 3).
3. **A template with two heading roles derives the inner one — it never
   hardcodes a second level.** `SectionedGridLayout`'s page title sits at
   `headingLevel` and every section heading one step inside it
   (`headingLevel + 1`, clamped at 6). One dial moves both, so they cannot
   contradict each other. Two independent hardcoded levels was the bug.
4. **A template with no `title` prop contributes no heading, and its text slots
   are not the page heading.** `AppShellLayout.pageLabel` is a chrome location
   label and stays a `<p>`; `ChatLayout.header` and the shell's side columns
   (`rightPanel`) are free-form slots. The page heading belongs to the content template hung
   inside the shell, or to the call site. An `<h1>` in the shell's page-label
   bar would sit next to the one every content template already renders.
   **A slot in a chrome bar inherits that rule** — `AppShellLayout.headerActions`
   (0.26.0) sits in the same bar as `pageLabel`, so its content is chrome too:
   a toggle, a search field, small tools, never a heading. Opening a slot is
   not a way around the rule; it only moves *who* fills the position.
   **Nor does removing the label reopen it** — `pageLabel` is optional since
   0.29.0 (a page whose content template renders the title would otherwise
   show it twice), and the bar then renders no element for it at all. The bar
   stays chrome with the label gone: the vacancy is not an invitation, and
   `heading-owner.test.tsx` asserts the label-less combination too.

**A template nested in a page that already has an `<h1>` is normal, not an edge
case.** An admin frame, a CMS page or a portal owns the page title and the
template is a section of it: that is `headingLevel={2}`. Only the element
changes — the type tokens do not depend on the level, so the heading looks
identical wherever it sits.

**A card title is not a page heading.** `CardTitle` renders a `div` and keeps
doing so by default: cards appear in grids, and a grid of headings that name
nothing in the outline is worse than a grid of styled text. Where a card really
is a titled section of the page, `<CardTitle asChild><h2>…</h2></CardTitle>`
gives it a level without copying the typography to the call site. Inside a
template whose page heading is an `<h1>`, that level is `2` — a jump to `h4` is
an axe `heading-order` violation (measured, and it was one in this repo's own
`DashboardLayout` story).

### What a consumer passing no new prop gets — frozen, per template

Two apps ship against these defaults, so none of them moved. The prop is
additive everywhere.

| Template | Default outline contribution | `headingLevel` |
|---|---|---|
| `PageHeader` | `<h1>` title (+ `<p>` description) | default `1` |
| `DashboardLayout` | `<h1>` via `PageHeader` | forwarded, default `1` |
| `FormLayout` | `<h1>` via `PageHeader` | forwarded, default `1` |
| `TableLayout` | `<h1>` via `PageHeader` | forwarded, default `1` |
| `SectionedGridLayout` | `<h1>` title (when `title` is set) + one `<h2>` per section | default `1`; sections are `+1` |
| `AuthLayout` | **no heading** — `title` is styled text in `CardTitle` | **omitted** by default; set it to opt in |
| `AppShellLayout` | no heading (`pageLabel` is a `<p>`; optional since 0.29.0, and omitted it renders no element at all) | none — no `title` prop |
| `ChatLayout` | no heading | none — no `title` prop |

`AuthLayout` is the one template whose default looks like it contradicts part 1
of the rule, and the reason is a real call site rather than a preference: a
shipping consumer passes its own `<h1>` **element** into the `title` slot,
precisely because the slot never was a heading. A heading added here by default
would nest an `<h1>` inside an `<h1>`. So the template offers `headingLevel` and
documents the default loudly; that consumer can pass plain text and drop its
wrapper whenever it bumps the pin. Whether the default should later flip to `1`
as a breaking change is an owner decision, not a worker's.

### Margins: a DS component never leans on the consumer's reset

Related, and the second half of the same card. Every element this library
renders that has a **non-zero user-agent margin** carries an explicit margin
utility (`m-0`) — headings, `<p>`, `<pre>`, and Radix's `<ol>` viewport. It is
not cosmetic: an app that keeps its own prose styling next to Tailwind Preflight
reverts element margins in `@layer base`, and without a utility that `revert`
wins the cascade and the user-agent margin lands *inside* the component. One
consumer measured **16.08 px** on `PageHeader`'s heading in production and
patched it from the outside with `[&>header_h1]:m-0` — a call-site selector
reaching into a template, which is exactly what this package exists to make
unnecessary.

`m-0` sits in Tailwind's `utilities` layer, so it changes nothing where
Preflight is intact and it wins against that revert — **as long as the revert is
layered.** That condition is the whole guarantee, and it is narrower than
"`utilities` outranks `base`" sounds: in the cascade an **unlayered**
declaration outranks every layered one of equal importance, whatever its
specificity. A consumer whose reset sits outside any `@layer` therefore defeats
`m-0` and the user-agent margin lands inside the component again — measured in
Chromium, an unlayered `p { margin: revert }` leaves 14 px on a `text-sm` `<p>`,
exactly as if the utility were absent. Only an `!important` utility would win
that (measured: `margin: 0 !important` in `utilities` does beat it), and this
package deliberately ships none — the answer for such a consumer is to layer its
reset, which is what every Preflight app does anyway. The invariant — for the
layered case — is pinned by the `Foundations/UA-Margin-Reset` story, which sets
the reset up the way a consuming app does and measures the computed margins in
Chromium — with two control elements that must move, so a green run cannot mean
"the reset never arrived". Adding a raw element with a user-agent margin to a
component means adding the utility in the same commit.

## Theming

- The active theme is on `<html data-theme="light|dark">`, set by
  [`ThemeProvider`](../src/theme/ThemeContext.tsx) and a no-flash script in
  `index.html`. Users switch it in the settings window (next point); the
  standalone `ThemeToggle` was removed in KI-846.
- Contrast, accent colour and Style sit beside it on `<html data-contrast
  data-accent data-ui-shape>`, held by `AppearanceProvider`. A settings window
  offers all four with [`AppearanceSettings`](../src/components/appearance-settings.tsx)
  inside a `SettingsDialog` section — never rebuild those rows in the app.
- Because tokens carry the theme, **components need no theme awareness** — style
  with tokens and both themes work. Verify new screens in **both** themes.
- Read the current theme with `useTheme()` only when logic truly depends on it
  (e.g. a third-party embed that needs an explicit color) — not for styling.

## Accessibility checklist (every interactive UI)

- Icon-only controls have `aria-label`.
- Inputs have a real label (via `FormLabel`/`Label`), and errors are linked
  (`FormItem error=` → `aria-describedby`/`aria-invalid`).
- Visible focus (shared components ship `focus-visible:ring-focus-ring`).
- Dialogs/menus: keyboard operable, Escape closes, focus is trapped/restored.
- Contrast passes in both themes.
