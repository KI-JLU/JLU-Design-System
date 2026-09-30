import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Home, LayoutDashboard } from "lucide-react";
import { AppShellLayout } from "./app-shell-layout";
import { Button } from "../components/button";
import { DropdownMenuItem } from "../components/dropdown-menu";
import { Input } from "../components/input";
import { NavItem } from "../components/nav-item";
import { SidebarUserMenu } from "../components/sidebar-user-menu";
import { ThemeProvider } from "../theme/ThemeContext";
import type { MobilePaneTab } from "../lib/pane-layout";

/**
 * `AppShellLayout` after 0.30.0. The suites about the drawer and about
 * `collapsed`/`onCollapsedChange` are **rewritten**, not adjusted: the drawer
 * does not exist any more, and the state it described is now `leftOpen`, with
 * the opposite meaning, on a `SidePanel` column.
 *
 * Oracles, all outside the code under test:
 *
 * 1. **The accessibility tree**, computed by aria-query +
 *    dom-accessibility-api through Testing Library's `getByRole`. `banner`,
 *    `complementary`, `navigation`, `group`, `searchbox` and `button` with
 *    their accessible names come from the ARIA in HTML mapping, not from
 *    anything this template writes; no assertion below reads a class name.
 * 2. **`Node.compareDocumentPosition`** for the order of the bar's three
 *    regions — the DOM's own answer, and the order a keyboard user meets.
 *    *Where* the centre region sits on the screen is measured in Chromium by
 *    `app-shell-layout.stories.tsx` (`WithCenteredSearch`), because jsdom
 *    applies no stylesheet and every box is 0×0.
 * 3. **The bar's own accessibility tree** for „the template mounted a
 *    control": with `headerActions` empty, the `banner` holds no `button` and
 *    no `group` at all. Until KI-846 the fingerprint was `ThemeToggle`'s
 *    German default names. That component is removed, and „no control in the
 *    bar" is the stronger statement anyway: it catches any control, not just
 *    one.
 * 4. **`SidePanel`'s disclosure contract** (`aria-expanded` + `aria-controls`)
 *    and **React's controlled-component contract**: the column re-renders only
 *    from the `leftOpen` it is given, so the round trip below goes through
 *    consumer state.
 * 5. **The two shipped call sites** (JustRAG `AppChrome.tsx`, CampusAgents
 *    `AppLayout.tsx`, both read 2026-09-17), which is why the labelled bar is
 *    re-asserted next to the new behaviour.
 *
 * jsdom implements neither `matchMedia` (which `useIsDesktop` and
 * `ThemeProvider` both ask) nor layout, so the viewport is stubbed per test.
 * The stub answers the library's `lg` query and nothing else, so
 * `prefers-color-scheme` still resolves to „no".
 */

function stubViewport(isDesktop: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: isDesktop && query === "(min-width: 64rem)",
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

beforeEach(() => stubViewport(true));
afterEach(() => vi.unstubAllGlobals());

const TABS: MobilePaneTab[] = [
  { id: "nav", icon: <Home />, label: "Bereiche", pane: "left" },
  { id: "page", icon: <LayoutDashboard />, label: "Seite", pane: "main" },
];

/** Every required prop of 0.30.0, so a test names only what it is about. */
function renderLayout(props: Partial<ComponentProps<typeof AppShellLayout>> = {}) {
  return render(
    <AppShellLayout
      logo="Marke"
      nav="Navigationsinhalt"
      leftOpen
      onLeftOpenChange={() => {}}
      mobileTabs={TABS}
      activeMobileTab="page"
      onMobileTabChange={() => {}}
      mobileTabBarLabel="Bereichswechsel"
      {...props}
    >
      Inhalt
    </AppShellLayout>,
  );
}

/** The chrome bar: the shell's one `banner` landmark. */
const bar = () => screen.getByRole("banner");

/** `true` when `a` precedes `b` in document order. */
function precedes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function renderWithActions(headerActions?: ReactNode) {
  return render(
    <ThemeProvider>
      <AppShellLayout
        logo="Marke"
        nav="Navigationsinhalt"
        pageLabel="Dashboard"
        headerActions={headerActions}
        leftOpen
        onLeftOpenChange={() => {}}
        mobileTabs={TABS}
        activeMobileTab="page"
        onMobileTabChange={() => {}}
        mobileTabBarLabel="Bereichswechsel"
      >
        Inhalt
      </AppShellLayout>
    </ThemeProvider>,
  );
}

describe("AppShellLayout — the chrome bar's actions region", () => {
  it("renders NO control of its own when the slot is empty (BREAKING, 0.26.0)", () => {
    renderWithActions();
    expect(within(bar()).getByText("Dashboard")).toBeInTheDocument();
    expect(within(bar()).queryAllByRole("button")).toHaveLength(0);
    expect(within(bar()).queryAllByRole("group")).toHaveLength(0);
  });

  it("no longer needs a ThemeProvider of its own", () => {
    // Side effect of the slot, and a documented consumer complaint (KI-778):
    // the shell used to mount a `ThemeToggle`, which calls `useTheme`, so an
    // app that had never mounted `ThemeProvider` learned about the dependency
    // from a runtime throw — "useTheme must be used within a ThemeProvider"
    // (`theme/ThemeContext.tsx`) — raised by a template whose props say
    // nothing about theming. Oracle: that error, owned by a different module;
    // the shell is rendered here with NO provider anywhere above it.
    expect(() => renderLayout({ pageLabel: "Dashboard" })).not.toThrow();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  /*
    The migration path since KI-846: the theme (and contrast, accent, Style)
    is switched in the settings window's `AppearanceSettings` section, and
    the bar carries the control that opens it. The slot passes the
    consumer's element through untouched, `id` included, so a consumer can
    point `aria-controls` or a skip link at it.
  */
  it("holds the control the consumer passes, as given", () => {
    renderWithActions(
      <Button variant="ghost" id="app-settings-trigger">
        Settings
      </Button>,
    );
    const trigger = within(bar()).getByRole("button", { name: "Settings" });
    expect(document.getElementById("app-settings-trigger")).toBe(trigger);
  });

  it("holds several controls at once — search field and settings button", () => {
    renderWithActions(
      <>
        <Input type="search" aria-label="Suche" />
        <Button variant="ghost">Settings</Button>
      </>,
    );
    expect(within(bar()).getByRole("searchbox", { name: "Suche" })).toBeInTheDocument();
    expect(within(bar()).getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});

/**
 * The optional `pageLabel` (0.29.0), unchanged by this card — the *structural*
 * half. „Renders nothing" is the difference between zero paragraphs and one
 * empty one; where the bar puts what it holds is measured in Chromium by the
 * stories.
 */
describe("AppShellLayout — the optional pageLabel (0.29.0)", () => {
  it("renders NO element for the label when it is omitted — not an empty <p>", () => {
    renderLayout();
    expect(bar().querySelectorAll("p")).toHaveLength(0);
  });

  it("invents no default label — the bar carries no text, not a guess", () => {
    renderLayout();
    expect(bar().textContent).toBe("");
  });

  it("keeps the labelled bar exactly as it was — one <p>, the given words", () => {
    renderLayout({ pageLabel: "Dashboard" });
    const paragraphs = bar().querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toHaveTextContent("Dashboard");
  });

  it("treats an empty label as no label — the i18n case, not a blank slot", () => {
    renderLayout({ pageLabel: "" });
    expect(bar().querySelectorAll("p")).toHaveLength(0);
  });
});

/**
 * The centre region (0.30.0). What it *contains* is checkable here; that it is
 * centred **on the bar** is a layout fact and is measured in Chromium by the
 * stories `WithCenteredSearch` (with a label) and `Overview` (without one).
 */
describe("AppShellLayout — the centred search slot (0.30.0)", () => {
  it("holds the node it is given, reachable by its accessible name", () => {
    renderLayout({
      pageLabel: "Dashboard",
      search: <Input type="search" aria-label="Suche" />,
    });
    expect(screen.getByRole("searchbox", { name: "Suche" })).toBeInTheDocument();
  });

  it("orders the three regions label → search → actions", () => {
    renderLayout({
      pageLabel: "Dashboard",
      search: <Input type="search" aria-label="Suche" />,
      headerActions: <button type="button">Aktion</button>,
    });
    const label = screen.getByText("Dashboard");
    const field = screen.getByRole("searchbox", { name: "Suche" });
    const action = screen.getByRole("button", { name: "Aktion" });
    expect(precedes(label, field)).toBe(true);
    expect(precedes(field, action)).toBe(true);
    // All three are in the chrome bar, not in the page.
    for (const node of [label, field, action]) {
      expect(bar()).toContainElement(node);
    }
  });

  it("renders nothing for an omitted search — the bar keeps no empty field", () => {
    renderLayout({ pageLabel: "Dashboard" });
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(bar().textContent).toBe("Dashboard");
  });
});

/**
 * The left column (0.30.0) — `leftOpen` / `onLeftOpenChange` reach the
 * `SidePanel` the template builds, and its toggle is the column's own.
 *
 * Why these assertions exist next to `app-shell.test.tsx` and
 * `side-panel.test.tsx`: those prove the *components* keep their contract, not
 * that this template's wiring reaches them. A forwarded prop that silently
 * never arrives (dropped in the destructuring, spread onto the wrong element,
 * shadowed by a default) leaves every component test green.
 */
const COLUMN_LABELS = {
  collapse: "Navigation einklappen",
  expand: "Navigation ausklappen",
};

const collapsibleNav = (
  <>
    <NavItem label="Team">
      <svg aria-hidden />
      <span>Team</span>
    </NavItem>
    <NavItem>
      <svg aria-hidden />
      <span>Berichte</span>
    </NavItem>
  </>
);

const collapsibleFooter = (
  <SidebarUserMenu initials="JL" name="Jamie Lee" role="Admin">
    <DropdownMenuItem>Abmelden</DropdownMenuItem>
  </SidebarUserMenu>
);

/** The wiring a consuming app writes — the state lives in the app. */
function ControlledShell({ start = true }: { start?: boolean }) {
  const [leftOpen, setLeftOpen] = useState(start);
  return (
    <AppShellLayout
      logo={<span>Marke</span>}
      nav={collapsibleNav}
      sidebarFooter={collapsibleFooter}
      pageLabel="Dashboard"
      leftOpen={leftOpen}
      onLeftOpenChange={setLeftOpen}
      mobileTabs={TABS}
      activeMobileTab="page"
      onMobileTabChange={() => {}}
      mobileTabBarLabel="Bereichswechsel"
    >
      Inhalt
    </AppShellLayout>
  );
}

describe("AppShellLayout — the collapsible left column (0.30.0)", () => {
  it("names the column and its navigation landmark with navLabel", () => {
    renderLayout({ navLabel: "Main navigation", nav: collapsibleNav });
    const column = screen.getByRole("complementary", { name: "Main navigation" });
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(column).toContainElement(nav);
    expect(within(nav).getByRole("button", { name: "Team" })).toBeInTheDocument();
  });

  it("defaults the column's name to Hauptnavigation, as Sidebar did", () => {
    renderLayout({ nav: collapsibleNav });
    expect(
      screen.getByRole("complementary", { name: "Hauptnavigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Hauptnavigation" }),
    ).toBeInTheDocument();
  });

  it("puts logo and footer into the column, header row first", () => {
    renderLayout({
      logo: <span>Marke</span>,
      nav: collapsibleNav,
      sidebarFooter: collapsibleFooter,
    });
    const column = screen.getByRole("complementary", { name: "Hauptnavigation" });
    const brand = within(column).getByText("Marke");
    const nav = within(column).getByRole("navigation");
    const userMenu = within(column).getByRole("button", { name: /Jamie Lee/ });
    expect(precedes(brand, nav)).toBe(true);
    expect(precedes(nav, userMenu)).toBe(true);
  });

  it("a consumer using ONLY the template can collapse and expand", async () => {
    render(<ControlledShell />);
    const collapse = screen.getByRole("button", { name: COLUMN_LABELS.collapse });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    // aria-controls resolves to the column body — the id is minted inside
    // SidePanel (`useId`), so nothing at template level could fake it.
    const bodyId = collapse.getAttribute("aria-controls")!;
    expect(document.getElementById(bodyId)).toContainElement(
      screen.getByRole("navigation"),
    );

    await userEvent.click(collapse);
    const expand = await screen.findByRole("button", { name: COLUMN_LABELS.expand });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    /* Collapsed IS the rail — and since 0.31.0 the nav MOVES there rather than
       going out of the accessibility tree with the body. So it is still one
       `navigation` landmark, just no longer inside the region `aria-controls`
       names; the brand is still unmounted, because `header` does not move. */
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(document.getElementById(bodyId)).not.toContainElement(
      screen.getByRole("navigation"),
    );
    expect(screen.queryByText("Marke")).not.toBeInTheDocument();

    await userEvent.click(expand);
    expect(
      await screen.findByRole("button", { name: COLUMN_LABELS.collapse }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("hands the REQUESTED state to onLeftOpenChange, never the old one", async () => {
    const onLeftOpenChange = vi.fn();
    renderLayout({ nav: collapsibleNav, leftOpen: true, onLeftOpenChange });
    await userEvent.click(screen.getByRole("button", { name: COLUMN_LABELS.collapse }));
    expect(onLeftOpenChange).toHaveBeenCalledWith(false);
    // Controlled: the parent ignored the request, so nothing moved.
    expect(
      screen.getByRole("button", { name: COLUMN_LABELS.collapse }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  /*
    The nav MOVES into the rail; it is neither hidden with the body nor
    duplicated. `SidePanel` hides its body while collapsed, so leaving the nav
    there would make "minimise" mean "hide the navigation" — and rendering it in
    both places would duplicate every `id` and `aria-current` a consumer put in
    a row, the failure this release removed with the drawer.

    Oracles: the ARIA `navigation` landmark mapping and `NavItem`'s documented
    collapsed contract (it names itself with `aria-label` only while collapsed,
    because expanded the visible text is already the name). Neither is asserted
    off a class.
  */
  describe("the navigation in the collapsed rail", () => {
    it("is present, and present exactly once", () => {
      renderLayout({ nav: collapsibleNav, leftOpen: false });

      /* `leftOpen={false}` alone puts the column in the rail — no interaction
         needed. (This absorbed a separate test that asserted only this line;
         every case in this block renders from the prop, so it had become a
         restatement of their setup.) */
      expect(
        screen.getByRole("button", { name: COLUMN_LABELS.expand }),
      ).toHaveAttribute("aria-expanded", "false");

      const navs = screen.getAllByRole("navigation", { name: "Hauptnavigation" });
      expect(navs).toHaveLength(1);
      expect(navs[0]).toBeVisible();
      expect(within(navs[0]).getByRole("button", { name: "Team" })).toBeVisible();
    });

    it("renders its rows in the icon-only form", () => {
      renderLayout({ nav: collapsibleNav, leftOpen: false });

      // Collapsed: the row's name comes from `aria-label`, not its visible text.
      expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute(
        "aria-label",
        "Team",
      );
    });

    it("leaves the expanded column's rows in their full-width form", () => {
      renderLayout({ nav: collapsibleNav, leftOpen: true });

      expect(screen.getAllByRole("navigation", { name: "Hauptnavigation" })).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Team" })).not.toHaveAttribute("aria-label");
    });
  });

  it("forwards collapseLabel/expandLabel — no German default survives", async () => {
    const { rerender } = renderLayout({
      nav: collapsibleNav,
      collapseLabel: "Collapse navigation",
      expandLabel: "Expand navigation",
    });
    expect(
      screen.getByRole("button", { name: "Collapse navigation" }),
    ).toBeInTheDocument();

    rerender(
      <AppShellLayout
        logo="Marke"
        nav={collapsibleNav}
        leftOpen={false}
        onLeftOpenChange={() => {}}
        collapseLabel="Collapse navigation"
        expandLabel="Expand navigation"
        mobileTabs={TABS}
        activeMobileTab="page"
        onMobileTabChange={() => {}}
        mobileTabBarLabel="Bereichswechsel"
      >
        Inhalt
      </AppShellLayout>,
    );
    expect(
      screen.getByRole("button", { name: "Expand navigation" }),
    ).toBeInTheDocument();
    for (const name of Object.values(COLUMN_LABELS)) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("keeps every nav row's accessible name across the collapse — the same string", async () => {
    /* 0.31.0 restores what the title always promised. Until 0.30.0 the rows left
       the accessibility tree on collapse (the nav sat in the body `SidePanel`
       hides) and this test asserted that disappearance; now the nav moves into
       the rail, so the rows survive and keep the SAME accessible name — from
       their visible text while expanded, from `aria-label` while collapsed.
       Name equality is the point: a row whose name changed with the column
       width would break a screen-reader user's mental map and any script that
       addresses it. accname computes both sides, so neither is read off a class. */
    render(<ControlledShell />);
    for (const name of ["Team", "Berichte"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: COLUMN_LABELS.collapse }));
    await screen.findByRole("button", { name: COLUMN_LABELS.expand });
    for (const name of ["Team", "Berichte"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    /* The one row WITHOUT a `label` is the control case: `NavItem` refuses to
       collapse a row it was never told the name of, so it keeps its visible
       text and gains no `aria-label`. */
    expect(screen.getByRole("button", { name: "Team" })).toHaveAttribute("aria-label", "Team");
    expect(screen.getByRole("button", { name: "Berichte" })).not.toHaveAttribute("aria-label");
  });
});

describe("AppShellLayout — the right column (0.30.0)", () => {
  it("renders nothing on the right when rightPanel is omitted", () => {
    renderLayout({ nav: collapsibleNav });
    expect(screen.getAllByRole("complementary")).toHaveLength(1);
  });

  it("passes rightPanel through as the second column, after the main area", () => {
    renderLayout({
      nav: collapsibleNav,
      rightPanel: {
        content: <p>Quellen-Inhalt</p>,
        header: <span>Quellen</span>,
        label: "Quellen",
        isOpen: true,
        onOpenChange: () => {},
        expandLabel: "Quellen ausklappen",
        collapseLabel: "Quellen einklappen",
      },
    });
    const right = screen.getByRole("complementary", { name: "Quellen" });
    expect(right).toContainElement(screen.getByText("Quellen-Inhalt"));
    expect(precedes(screen.getByRole("main"), right)).toBe(true);
    expect(screen.getAllByRole("complementary")).toHaveLength(2);
  });
});

/**
 * The left column's width and its resize contract (0.36.0). Until this release
 * the nav column was `AppShell`'s 256 default and nothing else — a consumer
 * could hand the *right* column a whole `AppShellPanel` but had no way at all
 * to widen the left one. Both props are optional, and the last test here is
 * the one that matters most: omitting them has to leave today's DOM alone.
 *
 * Oracles: the numbers and labels this file passes in, plus `ResizeHandle`'s
 * published APG-splitter contract (role, `aria-value*`, `aria-controls`, the
 * side-mirrored arrow keys) — a *different* component's contract, asserted
 * against itself in `resize-handle.test.tsx`.
 */
describe("AppShellLayout — the left column's width (0.36.0)", () => {
  // This file's numbers, so a passing assertion cannot have come from the code.
  const WIDTH = 344;
  const MIN = 200;
  const MAX = 560;
  const LABEL = "Breite der Navigation ändern";

  it("forwards leftWidth to the column's inline width", () => {
    renderLayout({ nav: collapsibleNav, leftWidth: WIDTH });
    expect(
      screen.getByRole("complementary", { name: "Hauptnavigation" }),
    ).toHaveAttribute("style", expect.stringContaining(`${WIDTH}px`));
  });

  it("keeps AppShell's 256 default when leftWidth is omitted", () => {
    // The published default (16rem = `--width-sidebar` at a 16px root), i.e.
    // what an untouched call site has always rendered.
    renderLayout({ nav: collapsibleNav });
    expect(
      screen.getByRole("complementary", { name: "Hauptnavigation" }),
    ).toHaveAttribute("style", expect.stringContaining("256px"));
  });

  it("yields exactly one separator, wired to the nav column", async () => {
    const onWidthChange = vi.fn();
    renderLayout({
      nav: collapsibleNav,
      leftWidth: WIDTH,
      leftResize: { minWidth: MIN, maxWidth: MAX, onWidthChange, label: LABEL },
    });

    const handles = screen.getAllByRole("separator");
    expect(handles).toHaveLength(1);
    const handle = handles[0];
    expect(handle).toHaveAccessibleName(LABEL);
    expect(handle).toHaveAttribute("aria-valuemin", String(MIN));
    expect(handle).toHaveAttribute("aria-valuemax", String(MAX));
    expect(handle).toHaveAttribute("aria-valuenow", String(WIDTH));

    // The reference resolves, and it resolves to the nav column itself — the
    // element whose inline width the value reports.
    const column = document.getElementById(handle.getAttribute("aria-controls") ?? "");
    expect(column).toBe(screen.getByRole("complementary", { name: "Hauptnavigation" }));

    // Left column, so `→` widens it — `ResizeHandle`'s mirrored contract, and
    // the only evidence that the template handed `side="left"` in.
    handle.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onWidthChange).toHaveBeenCalledWith(WIDTH + 10);
  });

  it("puts the separator between the column and the main area", () => {
    renderLayout({
      nav: collapsibleNav,
      leftResize: { minWidth: MIN, maxWidth: MAX, onWidthChange: () => {}, label: LABEL },
    });
    const handle = screen.getByRole("separator");
    expect(precedes(screen.getByRole("complementary", { name: "Hauptnavigation" }), handle)).toBe(
      true,
    );
    expect(precedes(handle, screen.getByRole("main"))).toBe(true);
  });

  it("drops the separator while the column is collapsed", () => {
    renderLayout({
      nav: collapsibleNav,
      leftOpen: false,
      leftResize: { minWidth: MIN, maxWidth: MAX, onWidthChange: () => {}, label: LABEL },
    });
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("drops the separator below lg", () => {
    stubViewport(false);
    renderLayout({
      nav: collapsibleNav,
      activeMobileTab: "nav",
      leftResize: { minWidth: MIN, maxWidth: MAX, onWidthChange: () => {}, label: LABEL },
    });
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("changes nothing at all when both props are omitted", () => {
    /* The regression this release could most easily cause: two optional props
       whose absence still moves an untouched call site. Oracle: the rendered
       markup of the left column with the props absent, compared against the
       markup of the same render on 0.35.0 — captured here as the *absence* of
       everything 0.36.0 adds (no separator anywhere, no `id` on the column
       root, the default width), because the two renders are byte-identical
       only if none of the three appears. The collapse suite above is the other
       half of this: it is unchanged and still passes. */
    renderLayout({ nav: collapsibleNav });
    const column = screen.getByRole("complementary", { name: "Hauptnavigation" });
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
    expect(column).not.toHaveAttribute("id");
    expect(column).toHaveAttribute("style", expect.stringContaining("256px"));
  });
});

/**
 * The bar's inset (0.37.0). Until 0.36.0 both bars were a `Container` — the
 * PAGE measure: `mx-auto w-full px-gutter md:px-margin-page` plus a
 * `max-w-(--max-width-container-max)` cap, so from `md` up the bar's first
 * item started 40px from the column edge while the column's own logo started
 * 24px. The bar is chrome between two `SidePanel`s, not page content, so it
 * takes the plain column gutter instead.
 *
 * **Since 0.39.0 that is the bar's own measure and no longer a mirror of the
 * column header's**: a `SidePanel`'s `h-16` header row is `px-4` (16px),
 * aligned on the pane BODY's first control. The two insets are deliberately
 * different, so the assertions below pin `px-gutter` on this row and say
 * nothing about the column's.
 *
 * **These assertions read class names on purpose, and that is the exception
 * this suite otherwise avoids:** the utility IS the contract this card
 * changes. There is no accessibility-tree fact and no jsdom box that can
 * distinguish 24px from 40px — jsdom applies no stylesheet and every box is
 * 0×0 — so the choice is a class assertion here or no jsdom coverage at all.
 * The *measured* half lives in Chromium (`BarInsetIsTheColumnGutter` in
 * `app-shell-layout.stories.tsx`), where the rendered inset is compared
 * against the `--spacing-gutter` token read back from the CSSOM rather than
 * against a number typed into the test. This block pins the four utilities
 * that decide it; the story pins the pixels.
 */
describe("AppShellLayout — the bar takes the column gutter (0.37.0)", () => {
  /** The bar's own row: the single child of the `banner` landmark. */
  const row = () => bar().firstElementChild as HTMLElement;

  it.each([
    ["wide", true],
    ["narrow", false],
  ] as const)("insets the %s bar by px-gutter, with no page measure", (_name, isDesktop) => {
    stubViewport(isDesktop);
    renderLayout({ pageLabel: "Dashboard", nav: collapsibleNav, activeMobileTab: "page" });

    const classes = row().className.split(/\s+/);
    // The column gutter — the bar's own measure since 0.39.0, no longer a
    // restatement of `side-panel.tsx`'s header row (that one is `px-4`).
    expect(classes).toContain("px-gutter");
    // …and nothing of the page measure the `Container` brought: no responsive
    // step to 40px, no centring, no width cap.
    expect(classes.some((c) => c.startsWith("md:px-"))).toBe(false);
    expect(classes.some((c) => c.startsWith("max-w-"))).toBe(false);
    expect(classes).not.toContain("mx-auto");
  });

  it("keeps the row a full-width flex row, so search stays centred on it", () => {
    renderLayout({ pageLabel: "Dashboard" });
    const classes = row().className.split(/\s+/);
    for (const utility of ["flex", "w-full", "items-center"]) {
      expect(classes).toContain(utility);
    }
  });
});

/**
 * `showRight` (0.37.0) is `AppShell`'s prop, forwarded under the same name.
 * What it *does* is asserted against `AppShell` itself; what matters here is
 * that the template does not swallow it — a forwarded prop that never arrives
 * leaves every component test green (the reason the left column's suite above
 * exists next to `app-shell.test.tsx`).
 */
describe("AppShellLayout — showRight forwarding (0.37.0)", () => {
  const sources = {
    content: <p>Quellen-Inhalt</p>,
    label: "Quellen",
    isOpen: true,
    onOpenChange: vi.fn(),
    expandLabel: "Quellen ausklappen",
    collapseLabel: "Quellen einklappen",
  };

  it("hides the right column on desktop without touching its collapse state", () => {
    const onOpenChange = vi.fn();
    renderLayout({
      nav: collapsibleNav,
      rightPanel: { ...sources, onOpenChange },
      showRight: false,
    });
    expect(screen.queryByRole("complementary", { name: "Quellen" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("complementary")).toHaveLength(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows it when the prop is omitted — an untouched call site does not move", () => {
    renderLayout({ nav: collapsibleNav, rightPanel: sources });
    expect(screen.getByRole("complementary", { name: "Quellen" })).toBeInTheDocument();
  });

  it("still reaches the column through its tab below lg", () => {
    stubViewport(false);
    renderLayout({
      nav: collapsibleNav,
      rightPanel: sources,
      showRight: false,
      mobileTabs: [...TABS, { id: "sources", icon: <Home />, label: "Quellen", pane: "right" }],
      activeMobileTab: "sources",
    });
    expect(screen.getByRole("complementary", { name: "Quellen" })).toBeInTheDocument();
  });
});

describe("AppShellLayout — below lg", () => {
  it("shows the brand in the bar, a tab bar, and no dialog anywhere", () => {
    stubViewport(false);
    renderLayout({ pageLabel: "Dashboard", nav: collapsibleNav });

    expect(bar()).toHaveTextContent("Marke");
    expect(
      screen.getByRole("navigation", { name: "Bereichswechsel" }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
    // The wide bar's other two regions are not on a 360px screen…
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    // …and the nav column is reached through its tab, not through a burger.
    expect(screen.getByRole("main")).toHaveTextContent("Inhalt");
    expect(screen.queryAllByRole("complementary")).toHaveLength(0);
  });

  it("keeps headerActions reachable in the narrow bar", () => {
    stubViewport(false);
    renderLayout({
      headerActions: <Input type="search" aria-label="Suche" />,
    });
    expect(bar()).toContainElement(screen.getByRole("searchbox", { name: "Suche" }));
  });

  it("shows the nav column, without a collapse control, when its tab is active", () => {
    stubViewport(false);
    renderLayout({ nav: collapsibleNav, leftOpen: false, activeMobileTab: "nav" });

    const column = screen.getByRole("complementary", { name: "Hauptnavigation" });
    expect(within(column).getByRole("navigation")).toBeInTheDocument();
    expect(within(column).getByRole("button", { name: "Team" })).toBeInTheDocument();
    for (const name of Object.values(COLUMN_LABELS)) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("reports a tab change to the consumer", async () => {
    stubViewport(false);
    const onMobileTabChange = vi.fn();
    renderLayout({ onMobileTabChange });
    await userEvent.click(screen.getByRole("button", { name: "Bereiche" }));
    expect(onMobileTabChange).toHaveBeenCalledWith("nav");
  });
});
