import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { LayoutGrid, Menu, SlidersHorizontal } from "lucide-react";
import { AppShellLayout } from "./app-shell-layout";
import { Button } from "../components/button";
import { ChatStage } from "../components/chat-stage";
import { Logo } from "../components/logo";
import { SIDE_PANEL_RAIL_WIDTH } from "../components/side-panel-variants";
import {
  AppShellFixture,
  OverviewNavRows,
  ShellSearch,
  WORKSPACE_TITLE,
} from "../test/fixtures/app-shell";
import * as chatStageStories from "../components/chat-stage.stories";
import * as dashboardStories from "./dashboard-layout.stories";
import * as formStories from "./form-layout.stories";
import * as sectionedGridStories from "./sectioned-grid-layout.stories";
import * as tableStories from "./table-layout.stories";

/* ---------------------------------------------------------------------------
 * One shell, adapted per context (KI-847). Every story below renders the
 * shared `AppShellFixture` (`src/test/fixtures/app-shell.tsx`) in one of the
 * two contexts of the reference consumer — `overview` (JLURAG `AppChrome.tsx`)
 * or `workspace` (JLURAG `KbWorkspaceLayout.tsx`) — and every story fills the
 * central `search`. The first five stories are one per PAGE CONTEXT; the rest
 * are the mechanism regressions (centring, empty bar, short bar, inset,
 * collapse, rail positions, resize, handle), on the same fixture instead of a
 * hand-built shell of their own.
 *
 * No story mounts a theme toggle: colour scheme, contrast, accent and Style
 * live behind the user menu's „Einstellungen" (`SettingsDialog` +
 * `AppearanceSettings`, KI-850), which `Overview` walks through.
 * ------------------------------------------------------------------------- */

// Portable Stories: page content is the content templates' own stories —
// templates compose into each other, nothing is mocked again.
const { Standard: DashboardPage } = composeStories(dashboardStories, {});
// The page that renders its title ITSELF (`PageHeader`, `<h1>Sammlungen</h1>`)
// — the reason `pageLabel` became optional: with a label, „Sammlungen" would
// stand twice, one above the other.
const { Standard: SectionedGridPage } = composeStories(sectionedGridStories, {});
const { Admin: TablePageContent } = composeStories(tableStories, {});
const { Settings: FormPageContent } = composeStories(formStories, {});

/**
 * The chat column of the workspace: `ChatStage` with the args of its own
 * `Conversation` story. Spread rather than `composeStories`, on purpose — that
 * story's meta decorator pins the stage to a 560px box for its own canvas,
 * and in the shell the stage has to fill `<main>` instead.
 */
function ChatPage() {
  return <ChatStage {...chatStageStories.default.args} {...chatStageStories.Conversation.args} />;
}

/** The workspace search's accessible name (the field is scoped to the topic). */
const WORKSPACE_SEARCH = "Im Thema suchen";

const meta = {
  title: "Templates/AppShellLayout",
  component: AppShellLayout,
  tags: ["!autodocs"],
  parameters: {
    layout: "fullscreen",
    // Every story renders the fixture, whose context owns the slots and the
    // column state — a control here would edit nothing on the canvas. The
    // MDX shows the props as a table (`ArgTypes`) instead.
    controls: { disable: true },
  },
  // Required props only, so the typed stories need none of their own. The
  // stories do not read them (see above); these are the overview context's
  // values, for the record.
  args: {
    logo: <Logo product="RAG" />,
    nav: null,
    leftOpen: true,
    onLeftOpenChange: () => {},
    mobileTabs: [
      { id: "nav", icon: <Menu aria-hidden="true" />, label: "Navigation", pane: "left" },
      { id: "page", icon: <LayoutGrid aria-hidden="true" />, label: "Inhalt", pane: "main" },
    ],
    activeMobileTab: "page",
    onMobileTabChange: () => {},
    mobileTabBarLabel: "Bereich wechseln",
  },
} satisfies Meta<typeof AppShellLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Die Chrome-Zeile selbst: das `banner`-Landmark der Shell. Über die Rolle
 * gesucht und nicht über eine Klasse — `h-16` ist genau die Behauptung, die
 * hier geprüft wird, und ein Selektor `.h-16` wäre auch dann grün, wenn das
 * Utility zu nichts kompilierte.
 */
const bar = (canvasElement: HTMLElement) =>
  canvasElement.querySelector("header") as HTMLElement;

/**
 * **64px, in jeder Kombination** (nur Label / nur Suche / nur Aktionen /
 * alles / nichts). Die Zahl ist kein aus diesem Code abgelesenes Maß, sondern
 * der veröffentlichte Geometrie-Vertrag dieser Zeile: JustRAG positioniert
 * seine Toasts mit `top: 76px` = 64 + 12 darunter und misst dieselbe 64 in
 * einem eigenen Chromium-Test (`AppShellGeometry` in HomeView.stories.tsx).
 */
async function expectBarHeight(canvasElement: HTMLElement) {
  await expect(getComputedStyle(bar(canvasElement)).height).toBe("64px");
}

/**
 * The boxes of the workspace bar's four controls, plus the two boxes that can
 * clip them: the bar's row and the label's `<p>` (`truncate` =
 * `overflow: hidden`, so whatever sticks out of it is cut off, not shown).
 */
function measureWorkspaceBar(canvasElement: HTMLElement) {
  const header = bar(canvasElement);
  const q = within(header);
  const titleEl = q.getByText(WORKSPACE_TITLE);
  return {
    row: header.getBoundingClientRect(),
    label: (titleEl.closest("p") as HTMLElement).getBoundingClientRect(),
    back: q.getByRole("button", { name: "Zurück zur Übersicht" }).getBoundingClientRect(),
    title: titleEl.getBoundingClientRect(),
    field: q.getByRole("searchbox", { name: WORKSPACE_SEARCH }).getBoundingClientRect(),
    gear: q.getByRole("button", { name: "Einstellungen des Themas" }).getBoundingClientRect(),
  };
}
type WorkspaceBarBoxes = ReturnType<typeof measureWorkspaceBar>;

/** Sub-pixel slack for "touches but does not overlap". */
const EDGE_SLACK = 0.5;

/**
 * Nothing overlaps and nothing is clipped. Oracle: the layout engine's boxes
 * against each other — the four controls read left to right with no box
 * reaching into the next, the back button and the title lie inside the
 * label's clip box, and the gear inside the bar. No number from the
 * component's code enters.
 */
async function expectNoOverlap(g: WorkspaceBarBoxes) {
  const sequence = [g.back, g.title, g.field, g.gear];
  for (let i = 0; i + 1 < sequence.length; i++) {
    await expect(sequence[i].right).toBeLessThanOrEqual(sequence[i + 1].left + EDGE_SLACK);
  }
  await expect(g.back.left).toBeGreaterThanOrEqual(g.label.left - EDGE_SLACK);
  await expect(g.back.right).toBeLessThanOrEqual(g.label.right + EDGE_SLACK);
  await expect(g.title.right).toBeLessThanOrEqual(g.label.right + EDGE_SLACK);
  await expect(g.gear.right).toBeLessThanOrEqual(g.row.right + EDGE_SLACK);
}

/** The field's centre is the bar's centre, within 1px. Oracle: the bar's own box. */
async function expectCentred(g: WorkspaceBarBoxes) {
  const fieldCentre = (g.field.left + g.field.right) / 2;
  const barCentre = (g.row.left + g.row.right) / 2;
  await expect(Math.abs(fieldCentre - barCentre)).toBeLessThanOrEqual(1);
}

/** Portalled layers (menu, dialog) render into `<body>`, outside the canvas. */
const page = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

/* ======================================================================== */
/* One story per page context                                               */
/* ======================================================================== */

/**
 * **The overview context** — JLURAG's `AppChrome.tsx`: the brand, NavItem
 * rows in a `SidebarPanel`, the user menu pinned to the column's foot, and
 * the search as the bar's ONE control — no `pageLabel` (the content template
 * renders the page's `<h1>`), no `headerActions`. The page is
 * `SectionedGridLayout`, the overview/browse template.
 *
 * `play` (Chromium), oracles in brackets:
 * 1. the bar is 64px [the published geometry contract JustRAG positions its
 *    toasts against, not a number read from the component];
 * 2. the column stands left of `<main>` [the layout engine's boxes];
 * 3. the field is centred on the bar with no label beside it, and the bar
 *    renders no label element at all [the bar's own box; the DOM] — until
 *    KI-847 the story `WithCenteredSearchOnly`;
 * 4. „Einstellungen" in the user menu opens the settings window on its
 *    „Darstellung" section, and it closes again [ARIA roles and names:
 *    `menuitem`, `dialog`, `heading` level 2, `combobox`] — the route that
 *    replaced a theme toggle in the bar.
 */
export const Overview: Story = {
  render: () => (
    <AppShellFixture context="overview" search={<ShellSearch />}>
      <SectionedGridPage />
    </AppShellFixture>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expectBarHeight(canvasElement);

    const column = await canvas.findByRole("complementary", { name: "Hauptnavigation" });
    const main = canvasElement.querySelector("main")!;
    await expect(column.getBoundingClientRect().right).toBeLessThanOrEqual(
      main.getBoundingClientRect().left + 1,
    );

    const row = bar(canvasElement).getBoundingClientRect();
    const field = (
      await canvas.findByRole("searchbox", { name: "Suchen" })
    ).getBoundingClientRect();
    await expect((field.left + field.right) / 2).toBeCloseTo((row.left + row.right) / 2, 0);
    await expect(field.left).toBeGreaterThan(row.left);
    await expect(field.right).toBeLessThan(row.right);
    // Kein Label-Element, nicht nur kein Text: die Zeile enthält keinen Absatz.
    await expect(bar(canvasElement).querySelector("p")).toBeNull();

    const body = page(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Jamie Lee/ }));
    await userEvent.click(await body.findByRole("menuitem", { name: "Einstellungen" }));
    const dialog = await body.findByRole("dialog", { name: "Einstellungen" });
    await expect(
      within(dialog).getByRole("heading", { level: 2, name: "Darstellung" }),
    ).toBeVisible();
    await expect(within(dialog).getByRole("combobox", { name: "Farbschema" })).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

/**
 * **The workspace context** — JLURAG's `KbWorkspaceLayout.tsx`: the chat
 * history as the left column, back button + topic title as `pageLabel`, the
 * topic-scoped search in the centre, a ghost gear in `headerActions`, the
 * sources as `rightPanel` (with a `collapsedPreview` rail), both columns
 * resizable, and `ChatStage` as the page.
 *
 * `play` (Chromium, the runner's 1280px window, both columns at their 320px
 * default), oracles in brackets:
 * 1. the bar is 64px [the published contract, as above];
 * 2. history | main | sources, left to right [the layout boxes] — until
 *    KI-847 the story `WithRightPanel`;
 * 3. each column has its named separator [ARIA `separator` + name];
 * 4. the bar's four controls do not overlap or clip, and the field sits on
 *    the bar's centre [the boxes against each other and against the bar] —
 *    the real consumer composition at the real consumer widths, not only the
 *    fixed-width reproductions further down.
 */
export const ChatWorkspace: Story = {
  render: () => (
    <AppShellFixture context="workspace" search={<ShellSearch label={WORKSPACE_SEARCH} />}>
      <ChatPage />
    </AppShellFixture>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expectBarHeight(canvasElement);

    const history = (
      await canvas.findByRole("complementary", { name: "Verlauf" })
    ).getBoundingClientRect();
    const sources = (
      await canvas.findByRole("complementary", { name: "Quellen" })
    ).getBoundingClientRect();
    const main = canvasElement.querySelector("main")!.getBoundingClientRect();
    await expect(history.right).toBeLessThanOrEqual(main.left + 1);
    await expect(main.right).toBeLessThanOrEqual(sources.left + 1);

    await expect(
      await canvas.findByRole("separator", { name: "Breite des Verlaufs ändern" }),
    ).toBeInTheDocument();
    await expect(
      await canvas.findByRole("separator", { name: "Breite der Quellen ändern" }),
    ).toBeInTheDocument();

    const g = measureWorkspaceBar(canvasElement);
    await expectNoOverlap(g);
    await expectCentred(g);
  },
};

/**
 * **A table page in the overview shell** — `TableLayout` (its `Admin` story)
 * as `children`. The shell brings the chrome and the one `<main>`; the
 * content template brings the page's heading.
 *
 * `play` oracle: the ARIA tree — exactly one `main`, the table inside it, and
 * the content template's `<h1>` as the page's only level-1 heading (the
 * shell contributes none; `pageLabel` would be a `<p>`).
 */
export const TablePage: Story = {
  render: () => (
    <AppShellFixture context="overview" search={<ShellSearch />}>
      <TablePageContent />
    </AppShellFixture>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expectBarHeight(canvasElement);
    const mains = canvas.getAllByRole("main");
    await expect(mains).toHaveLength(1);
    await expect(within(mains[0]).getByRole("table")).toBeVisible();
    await expect(
      within(mains[0]).getByRole("heading", { level: 1, name: "Elemente" }),
    ).toBeVisible();
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  },
};

/**
 * **A form page in the overview shell** — `FormLayout` (its `Settings` story)
 * as `children`. Same composition rule and the same oracle as `TablePage`:
 * one `main`, the form's submit button inside it, one `<h1>` — the form's.
 */
export const FormPage: Story = {
  render: () => (
    <AppShellFixture context="overview" search={<ShellSearch />}>
      <FormPageContent />
    </AppShellFixture>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expectBarHeight(canvasElement);
    const mains = canvas.getAllByRole("main");
    await expect(mains).toHaveLength(1);
    await expect(within(mains[0]).getByRole("button", { name: "Speichern" })).toBeVisible();
    await expect(
      within(mains[0]).getByRole("heading", { level: 1, name: "Element-Einstellungen" }),
    ).toBeVisible();
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  },
};

/**
 * Die Anordnung unter `lg`, hier im Workspace-Kontext mit seinen drei
 * Reitern (Verlauf · Chat · Quellen): Top-Bar mit der Marke und den
 * `headerActions` (das Zahnrad bleibt erreichbar), **ein** Bereich,
 * `BottomTabBar`. Kein Burger-Button, kein Drawer, kein Dialog. `search`
 * ist übergeben wie überall — das Template rendert es unter `lg` bewusst
 * nicht (ein auf `max-w-md` gedeckeltes, zentriertes Feld hat in 390px keine
 * Mitte).
 *
 * **Ohne `play`-Assertions, mit Absicht** — die Anordnung hängt am echten
 * Viewport (`matchMedia`), und der Storybook-Vitest-Lauf rendert Stories in
 * einem 1280px-Fenster, nicht im hier eingestellten Story-Viewport. Geprüft
 * ist sie in `app-shell-layout.test.tsx` (jsdom, gestubbter Viewport).
 */
export const Mobile: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone", styles: { width: "390px", height: "844px" } },
      },
    },
  },
  globals: { viewport: { value: "phone" } },
  render: () => (
    <AppShellFixture context="workspace" search={<ShellSearch label={WORKSPACE_SEARCH} />}>
      <ChatPage />
    </AppShellFixture>
  ),
};

/* ======================================================================== */
/* Mechanism regressions, on the same fixture                               */
/* ======================================================================== */

/**
 * A second, narrower control for the right-hand region of an overview bar —
 * the overview context has none of its own (JLURAG's `AppChrome` passes no
 * `headerActions`). An icon button, so the two side regions hold content of
 * clearly different widths.
 */
const viewOptions = (
  <Button variant="ghost" size="icon" aria-label="Ansicht anpassen">
    <SlidersHorizontal size={20} aria-hidden="true" />
  </Button>
);

/**
 * **Seit 0.30.0: `search` ist die Mitte der Zeile** — und zwar die Mitte der
 * *Zeile*, nicht die Mitte der Fläche, die das Label übrig lässt. Genau das
 * war mit dem `mx-auto`-Rezept von 0.29.0 nicht erreichbar: dort sprang das
 * Feld seitwärts, sobald ein Label da war (oder sich seine Länge änderte).
 *
 * Die `play`-Funktion misst es in Chromium: Feldmitte = Zeilenmitte, obwohl
 * links ein Label und rechts ein Bedienelement unterschiedlich breit sind.
 *
 * **Gemessen für 0.30.0** (Chromium, 1280px-Fenster) — die Zahlen stehen hier
 * als Beleg jenes Releases, nicht als aktuelle Behauptung: Zeile 256–1200 →
 * Mitte **728**, Feld 504–952 → Mitte **728** (448px breit, das ist
 * `max-w-md`), Label 296–421,4 (125,4px breit), damals ein Theme-Umschalter
 * 1058–1160 (102px breit). Die beiden Ränder waren also um 23px verschieden
 * breit, die Mitte stimmte trotzdem auf den Pixel.
 *
 * **Seit 0.37.0** beginnt das Label bei 256 + 24 = **280** (Einrückung
 * `px-gutter`, siehe `BarInsetIsTheColumnGutter`); die Mitte hängt an den zwei
 * gleich breiten Randregionen, nicht an der Einrückung. **Seit KI-847** steht
 * rechts statt des Theme-Umschalters ein 36px-Icon-Knopf — der Unterschied der
 * beiden Ränder ist damit größer, nicht kleiner, und die Prüfung unten
 * verlangt ihn weiterhin.
 */
export const WithCenteredSearch: Story = {
  render: () => (
    <AppShellFixture
      context="overview"
      pageLabel="Dashboard"
      search={<ShellSearch />}
      headerActions={viewOptions}
    >
      <DashboardPage />
    </AppShellFixture>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expectBarHeight(canvasElement);

    // Orakel: die Symmetrie der Zeile, gerechnet aus den Boxen der
    // Layout-Engine. In jsdom wäre dieselbe Prüfung wertlos (kein Stylesheet,
    // alle Boxen 0×0), deshalb steht sie hier.
    const row = bar(canvasElement).getBoundingClientRect();
    const label = (await canvas.findByText("Dashboard")).getBoundingClientRect();
    const action = (
      await canvas.findByRole("button", { name: "Ansicht anpassen" })
    ).getBoundingClientRect();
    const field = (
      await canvas.findByRole("searchbox", { name: "Suchen" })
    ).getBoundingClientRect();

    await expect((field.left + field.right) / 2).toBeCloseTo((row.left + row.right) / 2, 0);
    // …und das ist nicht trivial: links und rechts vom Feld steht
    // unterschiedlich viel. Ohne die beiden gleich breiten Randregionen wäre
    // die Mitte um die halbe Differenz verschoben.
    await expect(Math.abs(label.width - action.width)).toBeGreaterThan(1);
    // Das Feld füllt die Zeile nicht aus (dann wäre die Mitte trivial gleich):
    // `max-w-md` deckelt es, links und rechts bleibt Luft.
    await expect(field.left).toBeGreaterThan(label.right);
    await expect(field.right).toBeLessThan(action.left);
  },
};

/**
 * Weder Label noch Suche noch Aktionen — die leere Zeile. Sie bleibt trotzdem
 * **64px hoch**: Consumer legen Overlays unter dieser Kante ab (JustRAGs
 * `Toast.css`: `top: 76px` = 64 + 12), und eine Zeile, die beim Weglassen der
 * letzten Prop zusammenfiele, wäre für eine unveränderte Aufrufstelle eine
 * brechende Geometrie-Änderung.
 *
 * **The one story that opts out of the search convention**, and it says so:
 * `null` as its search. `search` stays optional on the component, and what an app
 * gets when it omits every slot is exactly the contract this story pins.
 */
export const WithoutPageLabelOrActions: Story = {
  render: () => (
    <AppShellFixture context="overview" search={null}>
      <SectionedGridPage />
    </AppShellFixture>
  ),
  play: async ({ canvasElement }) => {
    await expectBarHeight(canvasElement);
    // Leer heißt leer: die Zeile trägt keinen Text und keinen Absatz.
    await expect(bar(canvasElement).textContent).toBe("");
    await expect(bar(canvasElement).querySelector("p")).toBeNull();
  },
};

/* ------------------------------------------------------------------------ */
/* 0.44.1 (KI-842): the search gives way before the side regions            */
/* ------------------------------------------------------------------------ */

/** Both side columns at the measured 320px (also the workspace default). */
const COLUMN_WIDTH = 320;

/**
 * **0.44.1 — the narrow bar keeps its label (KI-842).** The reproduction of
 * JustRAG's measured case (KI-838, `KbWorkspaceLayout ›
 * WorkspaceBarWithScopedSearch`, Chromium, both side columns open at 320px):
 * a **560px** bar holding a back button and a topic title, a search field and
 * a gear — the workspace context's own bar. The shell is fixed at 1200px
 * (= 560 + 2 × 320) and both widths are pinned, so the bar is 560 whatever
 * the Storybook viewport — only the bar's own width enters its flex
 * computation. (Both columns carry a resize handle here; since 0.38.0 a
 * handle has no layout width, see `HandleHasNoLayoutWidth`.)
 *
 * **Until 0.44.0** the search kept its full 28rem (448px) here and the two
 * side regions absorbed the whole shortfall: measured on the claim-base code
 * in this story, the label's region was 16px wide, the title 0px, and the
 * back button and the gear each reached 4px into the field.
 *
 * **Since 0.44.1** the search shrinks first, down to its floor, while each
 * side region keeps its own floor of 11rem. Asserted in Chromium:
 *
 * 1. the title keeps **at least 120px** (the card's acceptance number, not a
 *    value from the component);
 * 2. nothing overlaps and nothing is clipped (`expectNoOverlap`);
 * 3. the field's centre is the bar's centre **within 1px**;
 * 4. the bar is 64px.
 *
 * Preconditions are asserted too, so the story cannot pass by measuring a
 * different case: the bar IS 560px and the back button IS 36px.
 */
export const NarrowBarKeepsTheLabel: Story = {
  render: () => (
    <AppShellFixture
      context="workspace"
      search={<ShellSearch label={WORKSPACE_SEARCH} />}
      leftWidth={COLUMN_WIDTH}
      rightWidth={COLUMN_WIDTH}
      style={{ width: 560 + 2 * COLUMN_WIDTH }}
    >
      <ChatPage />
    </AppShellFixture>
  ),
  play: async ({ canvasElement }) => {
    await expectBarHeight(canvasElement);
    const g = measureWorkspaceBar(canvasElement);
    await expect(g.row.width).toBe(560);
    await expect(g.back.width).toBe(36);

    await expect(g.title.width).toBeGreaterThanOrEqual(120);
    // …and `truncate` still does its job: the title is clipped, not wrapped
    // and not pushing anything aside.
    const titleEl = within(bar(canvasElement)).getByText(WORKSPACE_TITLE);
    await expect(titleEl.scrollWidth).toBeGreaterThan(titleEl.clientWidth);
    await expectNoOverlap(g);
    await expectCentred(g);
  },
};

/**
 * **The wide bar is unchanged by 0.44.1**: with room to spare the search is
 * still capped at **28rem** and centred on the bar, and the side regions share
 * the rest equally. The shell is fixed at 1280px with the left column at
 * 256px and the sources column out of the desktop arrangement
 * (`showRight={false}`), so the bar is 1024px.
 *
 * Oracle for the width: 28 × the root font size read back from the CSSOM —
 * the documented `max-w-md` contract of `search`, not a class name or a
 * number read out of the component.
 */
export const WideBarKeepsTheSearchAtItsMaximum: Story = {
  render: () => (
    <AppShellFixture
      context="workspace"
      search={<ShellSearch label={WORKSPACE_SEARCH} />}
      leftWidth={256}
      showRight={false}
      style={{ width: 1280 }}
    >
      <ChatPage />
    </AppShellFixture>
  ),
  play: async ({ canvasElement }) => {
    await expectBarHeight(canvasElement);
    const g = measureWorkspaceBar(canvasElement);
    await expect(g.row.width).toBe(1024);

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    await expect(g.field.width).toBe(28 * rem);
    await expectCentred(g);
    await expectNoOverlap(g);
    // Room to spare really is spare: the field does not touch its neighbours.
    await expect(g.field.left).toBeGreaterThan(g.title.right);
    await expect(g.field.right).toBeLessThan(g.gear.left);
  },
};

/**
 * **The order in which the bar gives way (0.44.1)**, measured in one shell
 * narrowed step by step — both columns at 320px, the bar at 1024, 900, 800,
 * 560, 480 and 300px:
 *
 * - **At every step** the field is centred on the bar within 1px, nothing
 *   overlaps, and the bar is 64px. That is the centring rule: the two side
 *   regions are identical flex items in every state, so the search sits on
 *   the bar's exact centre down to the width where the side regions reach
 *   0 — a bar of 208px (search floor 128 + 2 × 16px gap + 2 × 24px inset),
 *   which two open columns on an `lg` window do not reach. That last range is
 *   not asserted.
 * - **1024 → 900: spare room goes first.** The field stays at its cap, and
 *   the title loses half of the 124px, 62px — the other half comes off the
 *   gear's side.
 * - **800 → 560: then the search.** The bar loses 240px, the field loses
 *   exactly those 240px, and the title does not lose a pixel.
 * - **560 → 480: only then the sides.** The field holds its floor, and the
 *   title loses half of the 80px the bar lost: 40px.
 *
 * The oracles are relational — widths at one step against widths at another,
 * all from Chromium's layout — so they pin the ORDER rather than restating
 * the component's constants. The bar width is set on the shell's own box
 * between measurements; React does not re-render, the layout engine re-flows.
 */
export const BarGivesWayInOrder: Story = {
  render: () => (
    <AppShellFixture
      context="workspace"
      id="shrink-order-shell"
      search={<ShellSearch label={WORKSPACE_SEARCH} />}
      leftWidth={COLUMN_WIDTH}
      rightWidth={COLUMN_WIDTH}
    >
      <ChatPage />
    </AppShellFixture>
  ),
  play: async ({ canvasElement }) => {
    const shell = document.getElementById("shrink-order-shell") as HTMLElement;
    const at = async (barWidth: number) => {
      shell.style.width = `${barWidth + 2 * COLUMN_WIDTH}px`;
      const g = measureWorkspaceBar(canvasElement);
      await expect(g.row.width).toBe(barWidth);
      await expectBarHeight(canvasElement);
      await expectCentred(g);
      await expectNoOverlap(g);
      return g;
    };

    const w1024 = await at(1024);
    const w900 = await at(900);
    const w800 = await at(800);
    const w560 = await at(560);
    const w480 = await at(480);
    await at(300);

    // 1024 → 900: the field is at its cap, the side regions give the 124px.
    await expect(w900.field.width).toBeCloseTo(w1024.field.width, 1);
    await expect(w1024.title.width - w900.title.width).toBeCloseTo(62, 1);
    // 800 → 560: the search absorbs the whole 240px, the title none of it.
    await expect(w800.field.width - w560.field.width).toBeCloseTo(240, 1);
    await expect(w560.title.width).toBeCloseTo(w800.title.width, 1);
    // 560 → 480: the search holds, the two sides split the 80px.
    await expect(w480.field.width).toBeCloseTo(w560.field.width, 1);
    await expect(w560.title.width - w480.title.width).toBeCloseTo(40, 1);
  },
};

/**
 * **Seit 0.37.0: die Zeile nimmt den Spalten-Gutter.** Bis 0.36.0 steckten
 * beide Leisten in einem `Container` — dem **Seitenmaß** (`px-gutter
 * md:px-margin-page`, zentriert, gedeckelt), also 40px ab `md`. Die Zeile ist
 * aber keine Seiteninhalts-Spalte, sondern Chrome zwischen zwei `SidePanel`s.
 * Gemessen in Chromium (1280px-Fenster, JustRAGs `KbWorkspaceLayout`,
 * 2026-09-21): erster Inhalt der Leiste 40px von der Spaltenkante, Logo der
 * Spalte 24px — genau die Lücke, die der Entwickler gesehen hat.
 *
 * **Seit 0.39.0 ist das Maß der Leiste ihr eigenes** (vorher hieß diese Story
 * `BarInsetMatchesColumns` und verglich es mit der Kopfzeile der Spalte). Die
 * `h-16`-Kopfzeile eines `SidePanel` ist jetzt `px-4` (16px), weil ihr
 * Umschalter auf dem ersten Bedienelement des **Leisten-Rumpfs** steht und
 * nicht auf dieser Zeile. Die beiden Einrückungen sind absichtlich
 * verschieden, also kann die eine nicht mehr das Orakel der anderen sein.
 *
 * **Das Orakel ist der Token, keine Zahl im Code.** Die `play`-Funktion liest
 * `--spacing-gutter` aus dem CSSOM zurück und misst die gerenderte Einrückung
 * (`pageLabel.left − aside.right`) dagegen — ein literales „24" wäre auch dann
 * grün, wenn das Utility zu nichts kompilierte oder der Token umzöge.
 * Zusätzlich wird festgehalten, dass die Kopfzeile der Spalte **nicht**
 * dasselbe Maß hat: 16px, das Maß des Rumpfs.
 */
export const BarInsetIsTheColumnGutter: Story = {
  render: () => (
    <AppShellFixture context="overview" pageLabel="Dashboard" search={<ShellSearch />}>
      <DashboardPage />
    </AppShellFixture>
  ),
  play: async ({ canvas, canvasElement }) => {
    const column = (
      await canvas.findByRole("complementary", { name: "Hauptnavigation" })
    ).getBoundingClientRect();

    // Die Kopfzeile der Spalte über ihren Schalter gefunden — nicht über eine
    // Klasse: der Schalter ist das einzige Element, das `SidePanel` dort
    // garantiert rendert, und sein Elternknoten IST die Zeile.
    const toggle = await canvas.findByRole("button", { name: "Navigation einklappen" });
    const headerRow = toggle.parentElement as HTMLElement;
    const columnFirst = headerRow.firstElementChild as HTMLElement;
    // Links liest die Zeile [Marke … Schalter]; das Erstkind ist also die
    // Marke und nicht der Schalter. Ohne diese Prüfung würde die Messung
    // stillschweigend den Schalter vermessen.
    await expect(columnFirst).not.toBe(toggle);

    const label = (await canvas.findByText("Dashboard")).getBoundingClientRect();
    const columnInset = columnFirst.getBoundingClientRect().left - column.left;
    const barInset = label.left - column.right;

    // Orakel: der deklarierte Token, aus dem CSSOM zurückgelesen — nicht die
    // Kopfzeile der Spalte (die seit 0.39.0 bewusst ein anderes Maß hat) und
    // nicht die Zahl 24 im Test.
    const gutter = getComputedStyle(document.documentElement)
      .getPropertyValue("--spacing-gutter")
      .trim();
    await expect(gutter).toMatch(/^\d+(\.\d+)?px$/);
    await expect(barInset).toBeCloseTo(parseFloat(gutter), 0);

    // Und die Kopfzeile der Spalte ist ausdrücklich NICHT auf demselben Maß:
    // sie folgt der Polsterung des Rumpfs (`p-4`), damit ihr Umschalter auf
    // dem ersten Bedienelement des Rumpfs steht. Gegen die gerenderte
    // Polsterung der Zeile geprüft, nicht gegen eine Zahl.
    await expect(columnInset).toBeCloseTo(
      parseFloat(getComputedStyle(headerRow).paddingLeft),
      0,
    );
    await expect(columnInset).not.toBeCloseTo(parseFloat(gutter), 0);

    // Und die Zeile ist so breit wie die Hauptspalte: kein `max-w-*`-Deckel,
    // kein `mx-auto`. (Bei 1280px bände der alte 1440px-Deckel noch nicht —
    // diese Zusicherung gilt dem breiten Fenster, in dem er es täte.)
    const barRow = (canvasElement.querySelector("header") as HTMLElement)
      .firstElementChild as HTMLElement;
    const main = canvasElement.querySelector("main") as HTMLElement;
    await expect(barRow.getBoundingClientRect().width).toBeCloseTo(
      main.getBoundingClientRect().width,
      0,
    );
  },
};

/**
 * Beide Zustände der linken Spalte in einer Story, weil der Schalter der
 * einzige Weg zurück ist: klicken zeigt die 60px-**Schiene** (nicht mehr eine
 * 80px-Icon-Spalte — das ist die sichtbarste Änderung von 0.30.0), erneut
 * klicken die volle Spalte.
 */
export const WithCollapsibleColumns: Story = {
  render: () => (
    <AppShellFixture context="overview" search={<ShellSearch />}>
      <SectionedGridPage />
    </AppShellFixture>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    // Orakel für die ausgeklappte Breite: der in `src/tokens.css` deklarierte
    // Token, aus dem CSSOM zurückgelesen — kein literales „256px", das auch
    // dann grün wäre, wenn das Utility zu nichts kompilierte. Für die Schiene:
    // die exportierte Designkonstante.
    const tokenWidth = (name: string) => {
      const root = getComputedStyle(document.documentElement);
      const raw = root.getPropertyValue(name).trim();
      const match = /^([\d.]+)rem$/.exec(raw);
      if (!match) throw new Error(`Token ${name} fehlt oder ist kein rem-Maß: "${raw}"`);
      return parseFloat(match[1]) * parseFloat(root.fontSize);
    };
    const column = () =>
      canvasElement.querySelector("aside") as HTMLElement;

    await expect(column().getBoundingClientRect().width).toBe(
      tokenWidth("--width-sidebar"),
    );
    // Ausgeklappt trägt die Kopfzeile der Spalte die Marke („JLU RAG").
    await expect(canvas.getByText("RAG")).toBeVisible();

    await userEvent.click(await canvas.findByRole("button", { name: "Navigation einklappen" }));
    await expect(column().getBoundingClientRect().width).toBe(SIDE_PANEL_RAIL_WIDTH);
    /* Eingeklappt ist die Schiene — und seit 0.31.0 WANDERT die Navigation
       dorthin, statt mit dem Body zu verschwinden: „minimieren" heißt Icons,
       nicht „keine Navigation". Die Marke bleibt abgeräumt, `header` wandert
       nicht mit.

       Genau EIN Landmark, nicht zwei: der Knoten wird verschoben, nicht
       zusätzlich gerendert — zwei Kopien würden jede `id` und jedes
       `aria-current` in einer `NavItem` verdoppeln. */
    await expect(canvas.getAllByRole("navigation", { name: "Hauptnavigation" })).toHaveLength(1);
    // Die Marke („JLU RAG") ist mit der Kopfzeile aus der Spalte verschwunden
    // — und die breite Zeile trägt keine eigene.
    await expect(canvas.queryByText("RAG")).toBeNull();

    /* Und die Zeilen passen wirklich in 60px — das ist die Messung, die nur der
       Browser-Runner machen kann (jsdom hat kein Layout). Orakel: die
       exportierte Designkonstante, nicht eine literale 60. */
    const row = await canvas.findByRole("button", { name: "Mit mir geteilt" });
    await expect(row.getBoundingClientRect().width).toBeLessThanOrEqual(
      SIDE_PANEL_RAIL_WIDTH,
    );

    await userEvent.click(await canvas.findByRole("button", { name: "Navigation ausklappen" }));
    await expect(column().getBoundingClientRect().width).toBe(
      tokenWidth("--width-sidebar"),
    );
  },
};

/**
 * **Die Schiene ist der senkrechte Spiegel der ausgeklappten Spalte** — jedes
 * Bedienelement behält beim Einklappen seine Höhe auf der Seite.
 *
 * Das war bis 0.34.0 nicht so: die Schiene baute ihren eigenen senkrechten
 * Rhythmus (`py-stack-md` + `gap-stack-md`) statt die `h-16`-Chrome-Zeile und
 * die Polsterung des Spaltenkörpers zu spiegeln, also sprangen der Schalter
 * und die ganze Icon-Leiste beim Einklappen nach oben. Gemessen in Chromium,
 * relativ zur Oberkante der Spalte, damit weder Scrollposition noch
 * Fenstergröße eingehen.
 *
 * Das Orakel ist der AUSGEKLAPPTE Zustand, nicht eine im Code abgelesene Zahl:
 * die ausgeklappte Spalte ist die, an der sich die eingeklappte auszurichten
 * hat, und beide Messungen kommen aus demselben Browser-Layout.
 *
 * **The nav is the bare rows here (`OverviewNavRows`), not the overview
 * context's `SidebarPanel` frame** — the rail mirrors `AppShellLayout`'s own
 * `p-4` nav wrapper, and that is the mechanism this story pins. With the
 * panel frame (JLURAG's `SidebarNav`, the fixture's default) the first row
 * sits 92px below the column's top expanded and 80px in the rail, measured in
 * Chromium on KI-847.
 * TODO: that 12px jump is a finding, not yet decided — package or consumer.
 */
export const CollapsedRailKeepsVerticalPositions: Story = {
  render: () => (
    <AppShellFixture context="overview" nav={<OverviewNavRows />} search={<ShellSearch />}>
      <SectionedGridPage />
    </AppShellFixture>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const column = () => canvasElement.querySelector("aside") as HTMLElement;
    // Alles relativ zur Spaltenoberkante: absolute Viewport-Koordinaten wären
    // von der Fenstergröße des Runners abhängig, die Differenz nicht.
    const offsetTop = (el: Element) =>
      el.getBoundingClientRect().top - column().getBoundingClientRect().top;
    const centreY = (el: Element) => {
      const box = el.getBoundingClientRect();
      return box.top + box.height / 2 - column().getBoundingClientRect().top;
    };

    // Der gepinnte Fuß wird von unten gemessen — er hängt an der Unterkante der
    // Spalte, nicht an deren Oberkante.
    const offsetBottom = (el: Element) =>
      column().getBoundingClientRect().bottom - el.getBoundingClientRect().bottom;

    const toggleOpen = await canvas.findByRole("button", { name: "Navigation einklappen" });
    const openToggleCentre = centreY(toggleOpen);
    const openNavTop = offsetTop(await canvas.findByRole("button", { name: "Meine Sammlungen" }));
    const openFootBottom = offsetBottom(
      await canvas.findByRole("button", { name: /Jamie Lee/ }),
    );

    await userEvent.click(toggleOpen);

    const toggleRail = await canvas.findByRole("button", { name: "Navigation ausklappen" });
    await expect(centreY(toggleRail)).toBe(openToggleCentre);
    // Dieselbe Zeile, jetzt in ihrer Icon-Form: `NavItem` behält seinen Namen
    // über `aria-label`, deshalb findet sie derselbe Selektor.
    await expect(
      offsetTop(await canvas.findByRole("button", { name: "Meine Sammlungen" })),
    ).toBe(openNavTop);
    /* Und der Fuß: derselbe Knoten, derselbe Abstand zur Unterkante. Die
       Schiene brachte hier bis 0.34.0 ein eigenes `pb-stack-md` mit, zusätzlich
       zur Polsterung im Knoten des Konsumenten — der Nutzermenü-Knopf saß
       eingeklappt 16px höher. Die Höhe des Knopfs ändert sich (`sm` → `icon`),
       die Unterkante darf es nicht. */
    await expect(offsetBottom(await canvas.findByRole("button", { name: /Jamie Lee/ }))).toBe(
      openFootBottom,
    );
  },
};

/**
 * **Seit 0.36.0: beide Spalten sind ziehbar** — hier im Workspace-Kontext,
 * dem, in dem beide Spalten es sind. Die Shell komponiert dafür `SidePanel` +
 * `ResizeHandle`; es gibt keinen zweiten Mechanismus und keine Speicherung im
 * Paket. Die
 * Breiten sind **Zustand der App**: `onWidthChange` liefert jeden geklemmten
 * Wert, die App reicht ihn über `leftWidth` bzw. `rightPanel.width` zurück.
 *
 * Die `play`-Funktion misst in Chromium, was jsdom nicht kann: sie fokussiert
 * den linken Trenner, drückt dreimal `→` und prüft, dass die **gemessene**
 * Box der Spalte um 3 × `step` (30px) gewachsen ist und exakt dem
 * `aria-valuenow` des Trenners entspricht. Für die rechte Spalte dasselbe mit
 * `←` — die Pfeiltasten sind pro Seite gespiegelt, weil die Taste den
 * *Trenner* bewegt und `aria-valuenow` die *Spalte* meldet.
 *
 * Orakel: das Layout des Browsers gegen den Zustand der Story — keine im
 * Komponentencode abgelesene Zahl. Startbreiten werden gemessen, nicht
 * behauptet.
 *
 * **Die Breiten hält `usePersistedWidth`** (0.36.0) — der Haken, der die
 * gezogene Breite pro Gerät überlebt, mit dem **ganzen** Schlüssel vom
 * Konsumenten. Die Fixture reicht pro Montierung ein `Storage` im
 * Arbeitsspeicher herein, damit der Testlauf nichts in der echten
 * `localStorage` hinterlässt; eine App lässt `storage` weg.
 */
export const WithResizableColumns: Story = {
  render: () => (
    <AppShellFixture context="workspace" search={<ShellSearch label={WORKSPACE_SEARCH} />}>
      <ChatPage />
    </AppShellFixture>
  ),
  play: async ({ canvas, userEvent }) => {
    const step = 10;

    // Linke Spalte: `→` verbreitert sie.
    const leftColumn = await canvas.findByRole("complementary", { name: "Verlauf" });
    const leftHandle = await canvas.findByRole("separator", {
      name: "Breite des Verlaufs ändern",
    });
    const leftBefore = leftColumn.getBoundingClientRect().width;
    leftHandle.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    const leftAfter = leftColumn.getBoundingClientRect().width;
    await expect(leftAfter).toBe(leftBefore + 3 * step);
    // Gemessene Box und gemeldeter Wert sind EINE Zahl, nicht zwei.
    await expect(leftHandle.getAttribute("aria-valuenow")).toBe(String(leftAfter));

    // Rechte Spalte: gespiegelt, also `←`.
    const rightColumn = await canvas.findByRole("complementary", { name: "Quellen" });
    const rightHandle = await canvas.findByRole("separator", {
      name: "Breite der Quellen ändern",
    });
    const rightBefore = rightColumn.getBoundingClientRect().width;
    rightHandle.focus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    const rightAfter = rightColumn.getBoundingClientRect().width;
    await expect(rightAfter).toBe(rightBefore + 3 * step);
    await expect(rightHandle.getAttribute("aria-valuenow")).toBe(String(rightAfter));

    // Und die Trenner liegen auf den inhaltsseitigen Kanten: links rechts von
    // der Spalte, rechts links davon.
    await expect(leftHandle.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      leftColumn.getBoundingClientRect().right - 1,
    );
    await expect(rightHandle.getBoundingClientRect().right).toBeLessThanOrEqual(
      rightColumn.getBoundingClientRect().left + 1,
    );
  },
};

/**
 * **0.38.0 — der Trenner belegt keine Layout-Breite mehr.** Bis 0.37.0 war das
 * `ResizeHandle` ein 6px breites, transparentes Flex-Element in der Reihe;
 * durchgeschienen ist dabei der `bg-surface`-Hintergrund der Shell, also ein
 * getönter Streifen zwischen zwei `bg-surface-container-lowest`-Flächen
 * („da ist ein ganzer div zwischen Header und Sidebar", JustRAG-KB, 09/2026).
 * Jetzt ist der Wirt `w-0` und die Greiffläche ein `::after`-Overlay, das mit
 * 8px **über** der Randlinie liegt (je 4px in beide Nachbarn).
 *
 * Diese `play`-Funktion prüft in Chromium genau das, was jsdom nicht kann —
 * **Orakel ist das Layout und das Hit-Testing des Browsers**, jede erwartete
 * Zahl ist die gemessene Kante des *Nachbarn*, nie ein Literal:
 *
 * 1. die Box des Trenners ist 0px breit,
 * 2. die rechte Kante der linken Spalte **ist** die linke Kante der
 *    Hauptspalte — zwischen beiden liegt nichts mehr,
 * 3. `elementFromPoint` liefert auf dieser Linie ±3px (also von beiden Seiten
 *    her) den Trenner, ±5px dagegen nicht mehr: die 8px-Greiffläche ist real
 *    und sie ist zentriert,
 * 4. ein Zeiger-Zug, der an einem so *gefundenen* Punkt beginnt, verändert
 *    Breite und `aria-valuenow` weiterhin um denselben Betrag.
 *
 * Der Zug-Zustand färbt das Overlay (`after:bg-primary`); der Ruhezustand ist
 * durchsichtig. Der **Hover**-Ton (`hover:after:bg-outline-variant`) wird hier
 * *nicht* geprüft: CSS-`:hover` hängt am echten Zeiger des Browsers und wird
 * von per JavaScript verschickten Pointer-Events nicht ausgelöst.
 */
export const HandleHasNoLayoutWidth: Story = {
  render: () => (
    <AppShellFixture context="workspace" search={<ShellSearch label={WORKSPACE_SEARCH} />}>
      <ChatPage />
    </AppShellFixture>
  ),
  play: async ({ canvas, userEvent }) => {
    const column = await canvas.findByRole("complementary", { name: "Verlauf" });
    const handle = await canvas.findByRole("separator", {
      name: "Breite des Verlaufs ändern",
    });
    const main = await canvas.findByRole("main");

    // Definierter Startwert, egal was vorher gezogen wurde: `Home` ist das
    // angekündigte Minimum.
    handle.focus();
    await userEvent.keyboard("{Home}");

    // (1) Keine Layout-Breite.
    await expect(handle.getBoundingClientRect().width).toBe(0);

    // (2) Deshalb berühren sich die Nachbarn. Die erwartete Zahl ist die Kante
    //     der Spalte, nicht eine aus dem Code abgelesene Breite.
    const columnBox = column.getBoundingClientRect();
    await expect(main.getBoundingClientRect().left).toBe(columnBox.right);

    // (3) Die Greiffläche liegt über dieser Linie — von beiden Seiten
    //     erreichbar, aber nicht breiter als 8px.
    const borderX = columnBox.right;
    const midY = columnBox.top + columnBox.height / 2;
    await expect(document.elementFromPoint(borderX - 3, midY)).toBe(handle);
    await expect(document.elementFromPoint(borderX + 3, midY)).toBe(handle);
    await expect(document.elementFromPoint(borderX - 5, midY)).not.toBe(handle);
    await expect(document.elementFromPoint(borderX + 5, midY)).not.toBe(handle);

    // Im Ruhezustand ist das Overlay durchsichtig.
    const restFill = getComputedStyle(handle, "::after").backgroundColor;
    await expect(restFill).toBe("rgba(0, 0, 0, 0)");

    // (4) Und ein Zug, der an einem per Hit-Test *gefundenen* Punkt beginnt,
    //     zieht weiterhin — der Griff, den der Nutzer trifft, ist der Griff,
    //     der die Schleife fährt.
    const grab = document.elementFromPoint(borderX + 3, midY) as HTMLElement;
    const widthBefore = column.getBoundingClientRect().width;
    const valueBefore = Number(handle.getAttribute("aria-valuenow"));
    grab.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        button: 0,
        clientX: borderX + 3,
        clientY: midY,
      }),
    );
    // Gefüllt, sobald der Zug läuft (`after:transition-colors` blendet über,
    // deshalb gepollt statt einmal gelesen).
    await waitFor(async () => {
      await expect(getComputedStyle(handle, "::after").backgroundColor).not.toBe(
        restFill,
      );
    });
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: borderX + 43,
        clientY: midY,
      }),
    );
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    // 40px nach rechts, linke Spalte → 40px breiter. Handarithmetik auf der
    // *gemessenen* Startbreite. Gepollt, weil der Zustandswechsel hier aus
    // einem **nativen** `window`-Listener kommt (der Griff fährt die Schleife
    // selbst) — React stapelt das und rendert erst danach.
    await waitFor(async () => {
      await expect(Number(handle.getAttribute("aria-valuenow"))).toBe(valueBefore + 40);
    });
    await expect(column.getBoundingClientRect().width).toBe(widthBefore + 40);
    // Und die Kanten liegen nach dem Zug wieder aufeinander.
    await expect(main.getBoundingClientRect().left).toBe(
      column.getBoundingClientRect().right,
    );
  },
};
