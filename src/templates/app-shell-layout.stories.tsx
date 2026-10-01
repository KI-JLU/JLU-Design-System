import type { Meta, StoryObj } from "@storybook/react-vite";
import { composeStories } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { LayoutGrid, Menu, SlidersHorizontal } from "lucide-react";
import { AppShellLayout } from "./app-shell-layout";
import { Button } from "../components/button";
import { ChatStage } from "../components/chat-stage";
import { Logo } from "../components/logo";
import { SIDE_PANEL_RAIL_WIDTH } from "../components/side-panel-variants";
import { AppShellFixture, ShellSearch, WORKSPACE_TITLE } from "../test/fixtures/app-shell";
import * as chatStageStories from "../components/chat-stage.stories";
import * as dashboardStories from "./dashboard-layout.stories";
import * as formStories from "./form-layout.stories";
import * as sectionedGridStories from "./sectioned-grid-layout.stories";
import * as tableStories from "./table-layout.stories";

/* ---------------------------------------------------------------------------
 * One shell, adapted per context. Every story below renders the
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
 * `AppearanceSettings`), which `Overview` walks through.
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
 *    renders no label element at all [the bar's own box; the DOM];
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
 * 2. history | main | sources, left to right [the layout boxes];
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
 * **`search` is the centre of the bar**: the centre of the *bar*, not of
 * the space the label leaves, so the field does not move when a label
 * appears or changes length.
 *
 * The `play` function measures it in Chromium: field centre = bar centre,
 * although the label on the left and the icon button on the right differ in
 * width. The check requires that difference, so the story cannot pass on two
 * equal sides. The centring rests on the two equal-width side regions, not
 * on the bar's inset (`BarInsetIsTheColumnGutter`). The release measurement
 * is in the Changelog, 0.30.0.
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
/* Short bar: the search gives way before the side regions                 */
/* ------------------------------------------------------------------------ */

/** Both side columns at the measured 320px (also the workspace default). */
const COLUMN_WIDTH = 320;

/**
 * **The narrow bar keeps its label.** The reproduction of
 * JustRAG's measured case (KI-838, `KbWorkspaceLayout ›
 * WorkspaceBarWithScopedSearch`, Chromium, both side columns open at 320px):
 * a **560px** bar holding a back button and a topic title, a search field and
 * a gear — the workspace context's own bar. The shell is fixed at 1200px
 * (= 560 + 2 × 320) and both widths are pinned, so the bar is 560 whatever
 * the Storybook viewport — only the bar's own width enters its flex
 * computation. (Both columns carry a resize handle here; a handle has no
 * layout width, see `HandleHasNoLayoutWidth`.) The failure this pins is in
 * the Changelog, 0.44.1.
 *
 * The search shrinks first, down to its floor, while each side region keeps
 * its own floor of 11rem. Asserted in Chromium:
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
 * **The wide bar keeps the search at its maximum**: with room to spare it is
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
 * **The order in which the bar gives way**, measured in one shell
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
 * **The bar takes the column gutter**, not the page measure of a
 * `Container`: the bar is not a page-content column but chrome between two
 * `SidePanel`s. (The measurement that led here: Changelog, 0.37.0.)
 *
 * **It is the bar's own measure.** A `SidePanel`'s `h-16` header row is
 * `px-4` (16px), because its toggle sits on the first control of the
 * **column body**, not on this bar. The two insets differ on purpose, so
 * neither can be the other's oracle.
 *
 * **The oracle is the token, not a number in the code.** The `play` function
 * reads `--spacing-gutter` back from the CSSOM and measures the rendered
 * inset (`pageLabel.left − aside.right`) against it; a literal „24" would
 * stay green even if the utility compiled to nothing or the token moved. It
 * also pins that the column's header row does **not** share that measure:
 * 16px, the body's measure.
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

    // Oracle: the declared token, read back from the CSSOM — not the column's
    // header row (which deliberately has a different measure) and not the
    // number 24 in the test.
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
 * Both states of the left column in one story, because the toggle is the
 * only way back: a click shows the 60px **rail**, a second click the full
 * column.
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
    /* Collapsed is the rail, and the navigation MOVES into it instead of
       disappearing with the body: "minimise" means icons, not "no
       navigation". The brand stays cleared; `header` does not move along.

       Exactly ONE landmark, not two: the node is moved, not rendered a
       second time. Two copies would duplicate every `id` and every
       `aria-current` in a `NavItem`. */
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
 * **The rail is the vertical mirror of the expanded column**: every control
 * keeps its height on the page across a collapse. The rail mirrors the
 * `h-16` chrome row and the column body's padding instead of a vertical
 * rhythm of its own. Measured in Chromium, relative to the column's top, so
 * neither the scroll position nor the window size enters.
 *
 * The oracle is the EXPANDED state, not a number read from the code: the
 * expanded column is the one the collapsed one has to line up with, and both
 * measurements come from the same browser layout.
 *
 * **The expanded nav is the overview context's `SidebarPanel` frame** — the
 * composition JLURAG's `SidebarNav.tsx` renders: a `SidebarPanel` with no
 * title, `head` or `nav` around the rows, bare rows in the rail. The story
 * asserts that frame before it measures, so it cannot silently fall back to
 * bare rows. A head-less panel renders no head, and its list carries the
 * 16px top inset (`pt-4`) the rail's `py-stack-md` mirrors. (The failures
 * this pins: Changelog, 0.35.0 and KI-852.)
 */
export const CollapsedRailKeepsVerticalPositions: Story = {
  render: () => (
    <AppShellFixture context="overview" search={<ShellSearch />}>
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
    const openRow = await canvas.findByRole("button", { name: "Meine Sammlungen" });
    // The composition under test: the rows sit in a `SidebarPanel` frame.
    await expect(openRow.closest('[data-slot="sidebar-panel"]')).not.toBeNull();
    const openNavTop = offsetTop(openRow);
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
    /* And the foot: the same node, the same distance to the bottom edge. The
       rail adds no bottom padding of its own on top of the consumer node's.
       The button's height changes (`sm` → `icon`); its bottom edge must
       not. */
    await expect(offsetBottom(await canvas.findByRole("button", { name: /Jamie Lee/ }))).toBe(
      openFootBottom,
    );
  },
};

/**
 * **Both columns are draggable**, shown in the workspace context, where both
 * are. The shell composes `SidePanel` + `ResizeHandle` for it; there is no
 * second mechanism and no storage in the package. The widths are **the
 * app's state**: `onWidthChange` reports every clamped value, and the app
 * passes it back through `leftWidth` or `rightPanel.width`.
 *
 * The `play` function measures in Chromium what jsdom cannot: it focuses the
 * left separator, presses `→` three times and checks that the column's
 * **measured** box grew by 3 × `step` (30px) and equals the separator's
 * `aria-valuenow` exactly. The same for the right column with `←`: the
 * arrow keys are mirrored per side, because the key moves the *separator*
 * and `aria-valuenow` reports the *column*.
 *
 * Oracle: the browser's layout against the story's state, not a number read
 * from the component code. Start widths are measured, not asserted.
 *
 * **`usePersistedWidth` holds the widths**: the hook that keeps a dragged
 * width per device, with the **whole** key from the consumer. The fixture
 * passes an in-memory `Storage` per mount, so the test run leaves nothing in
 * the real `localStorage`; an app omits `storage`.
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
 * **The separator takes no layout width.** Its host is `w-0`, and the grab
 * zone is an `::after` overlay 8px wide that sits **over** the edge line
 * (4px into each neighbour), so no tinted strip shows between two
 * `bg-surface-container-lowest` surfaces. (The report that led here:
 * Changelog, 0.38.0.)
 *
 * This `play` function checks in Chromium exactly what jsdom cannot.
 * **The oracle is the browser's layout and hit-testing**: every expected
 * number is the measured edge of a *neighbour*, never a literal:
 *
 * 1. the separator's box is 0px wide,
 * 2. the left column's right edge **is** the main column's left edge, with
 *    nothing between them,
 * 3. `elementFromPoint` returns the separator ±3px from that line (so from
 *    both sides) but not ±5px: the 8px grab zone is real and centred,
 * 4. a pointer drag that starts at a point *found* that way still changes
 *    the width and `aria-valuenow` by the same amount.
 *
 * The dragging state colours the overlay (`after:bg-primary`); at rest it is
 * transparent. The **hover** tone (`hover:after:bg-outline-variant`) is *not*
 * checked here: CSS `:hover` follows the browser's real pointer and is not
 * triggered by pointer events dispatched from JavaScript.
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
