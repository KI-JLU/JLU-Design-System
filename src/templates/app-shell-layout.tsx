import * as React from "react";
import {
  AppShell,
  type AppShellPanel,
  type AppShellProps,
} from "../components/app-shell";
import { useIsDesktop } from "../lib/pane-layout";

/**
 * Template „App-Shell": the complete app chrome — a branded, collapsible left
 * column (logo, NavItems, pinned footer), a three-region chrome bar above the
 * page content, and an optional right column. Composes `AppShell` (which
 * composes `SidePanel` + `BottomTabBar`); consuming apps only inject content
 * into the slots and never rebuild the frame. No business logic: routing and
 * active state live in the injected NavItems.
 *
 * **The nav column is a `SidePanel` since 0.30.0, not a `Sidebar`.** That is
 * the whole of the breaking change: the column collapses to the 60px rail
 * instead of an 80px icon column, its state is `leftOpen` (open = expanded)
 * instead of `collapsed` (the inverted spelling of the same thing), and the
 * narrow-screen drawer is gone. `Sidebar` is still exported for a standalone
 * nav column; this template no longer builds one.
 *
 * **The collapse control is still forwarded, not re-slotted.** `leftOpen` /
 * `onLeftOpenChange` plus the two toggle labels reach the column's own toggle,
 * and the template mounts no control of its own — the same reasoning 0.28.0
 * recorded for `Sidebar`'s toggle applies unchanged to `SidePanel`'s: it is
 * the only control that exists while the column is collapsed, and it carries
 * an `aria-expanded` + `aria-controls` contract pointing at an id only
 * `SidePanel` knows (`useId`, per mount). A slot here could not be held to
 * that contract and could not reach that id. What the slot pattern protects is
 * still true: the labels are props, so the control is localizable.
 *
 * **The left column's width is forwarded since 0.36.0** — `leftWidth` and
 * `leftResize`, both optional. Until then the nav column was the 256px default
 * and nothing else: a consumer could pass a whole `AppShellPanel` for the
 * right column (`rightPanel`, width and all) but had no way at all to widen
 * the left one, which is what forced JustRAG's KB screen to shrink its right
 * column to match (KI-94). The two props close that asymmetry without
 * changing a single existing call site.
 *
 * **The bar has three regions** (0.30.0): `pageLabel` on the left, `search`
 * clamped to the **bar's** centre, `headerActions` on the right. The two side
 * regions are identical flex children (`flex-1`, basis 0, one shared floor),
 * which is what makes the centre region centred on the row rather than in the
 * space the label leaves — the difference to 0.29.0's `mx-auto` recipe, which
 * centred the content of `headerActions` only when there was no label at all.
 * The row's height is `AppShell`'s: 64px in every state.
 *
 * **On a short bar the search gives way first** (0.44.1, KI-842): it shrinks
 * from 28rem to an 8rem floor while each side keeps an 11rem floor, and only
 * then do the sides narrow — equally, so the search stays centred. Until
 * 0.44.0 it was the other way round, and a 560px bar left the label 16px
 * (measured in JustRAG; the render body's `wideBar` note has the numbers).
 *
 * **The bar takes the column gutter since 0.37.0** — `px-gutter` (24px)
 * instead of the `Container` page measure it used until 0.36.0 (24px below
 * `md`, 40px from `md` up, centred and capped). The bar is chrome between two
 * columns, not page content, so it takes the plain column gutter rather than a
 * page measure, and the visible gap between the bar and the columns is gone.
 * **It is not a mirror of the column header's inset**: since 0.39.0 a
 * `SidePanel`'s `h-16` header row is `px-4` (16px), because its toggle is
 * aligned on the pane BODY's first control and not on this bar. The bar is
 * inset for its own content; the two numbers are independent by decision.
 */
export interface AppShellLayoutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    // Forwarded verbatim, names included: a consumer reading `AppShell`'s
    // documentation finds the same four props here, and the descriptions in
    // the Controls table cannot drift from the component's. All four are
    // required there and stay required here — below `lg` the shell shows one
    // area at a time, and without tabs the nav column would be unreachable.
    Pick<
      AppShellProps,
      "mobileTabs" | "activeMobileTab" | "onMobileTabChange" | "mobileTabBarLabel"
    > {
  /** Brand block — shown in the left column's header row and in the narrow-screen bar. */
  logo: React.ReactNode;
  /** Navigation content, typically a list of <NavItem>s. */
  nav: React.ReactNode;
  /** Pinned bottom of the left column (user menu). */
  sidebarFooter?: React.ReactNode;
  /** Accessible name of the navigation landmark, and of the column around it. */
  navLabel?: string;
  /**
   * Current location (e.g. "Dashboard") — shown H1-sized and bold on the left
   * of the chrome bar. A `<p>`, never a heading: see the note in the render
   * body.
   *
   * **Optional since 0.29.0.** Omitted (or falsy), the bar renders **no
   * element at all** for the label — the region that holds it stays, because
   * since 0.30.0 it is that empty region which keeps `search` centred on the
   * row.
   *
   * The bar itself stays either way: `h-16` / 64px with a label, with only
   * actions, with both, and with neither. It is chrome above the page content,
   * and consumers derive overlay offsets from that height (JustRAG's
   * `Toast.css`: `top: 76px` = 64 + 12), so a bar that collapsed when empty
   * would move their toasts, not just this template's markup.
   */
  pageLabel?: React.ReactNode;
  /**
   * The bar's **centre** region (0.30.0) — a search field, 28rem wide at most
   * and centred on the bar itself, with or without a `pageLabel`. On a short
   * bar it shrinks, down to 8rem, before the label and the actions lose their
   * 11rem each (0.44.1); see the `wideBar` note in the render body.
   *
   * It exists because "centred" could not be expressed from the outside: the
   * 0.29.0 recipe (`w-full max-w-md mx-auto` inside `headerActions`) centres
   * the content in *the space the label leaves*, so it only looked right when
   * there was no label. A search field that shifts sideways when the page name
   * changes is the bug that recipe could not avoid. Pass the node itself; the
   * template supplies the width cap and the centring.
   *
   * Chrome, like `pageLabel` and `headerActions`: no heading element belongs
   * here.
   */
  search?: React.ReactNode;
  /**
   * Chrome controls at the **right** end of the bar: a `ThemeToggle`, a menu,
   * several of them, or nothing. The template renders **no** control of its
   * own here — until 0.26.0 it hardcoded a `<ThemeToggle />`, which a consumer
   * could neither move, suppress, localize nor address; deciding what belongs
   * in an app's chrome bar is the app's job, not the template's.
   *
   * Below `lg` this region is rendered next to the `logo` in the narrow bar,
   * so the app's chrome controls stay reachable when the wide bar's other two
   * regions are gone. `search` is not: a `max-w-md` field centred on a 360px
   * bar has no room to be centred in, and an app that needs search on a narrow
   * screen owns that decision (a compact control in `headerActions`, or a tab
   * of its own).
   *
   * Whatever goes in is **chrome**, like `pageLabel`: no heading element
   * belongs here. The page's heading is the content template's
   * (`docs/COMPONENT_GUIDELINES.md` → „Page headings: who owns them").
   */
  headerActions?: React.ReactNode;
  /**
   * The left column is expanded (`true`) or collapsed to the rail (`false`).
   *
   * **Replaces 0.28.0's `collapsed`, and means the opposite of it** —
   * `leftOpen={true}` is `collapsed={false}`. The name follows `SidePanel`'s
   * `isOpen` and `WorkspacePane`'s, so the three frames in this library spell
   * one state one way. Required and controlled, with no `defaultOpen`: a
   * column width is exactly the kind of value an app persists per user, and a
   * default here would be a second truth next to it.
   */
  leftOpen: boolean;
  /** The toggle was pressed; carries the REQUESTED state, never the old one. */
  onLeftOpenChange: (isOpen: boolean) => void;
  /** Accessible name of the toggle while expanded. Default "Navigation einklappen". */
  collapseLabel?: string;
  /** Accessible name of the toggle while collapsed. Default "Navigation ausklappen". */
  expandLabel?: string;
  /**
   * Expanded width of the left column in px (0.36.0). Omitted, `AppShell`'s
   * 256 default applies — exactly the width every call site written before
   * this release gets.
   *
   * **Flat, and spelled like the column's other props** (`leftOpen`,
   * `collapseLabel`): the left column is not handed over as an object here, it
   * is assembled from `logo` / `nav` / `sidebarFooter` / `navLabel` /
   * `leftOpen`, so its width joins that list rather than introducing a
   * half-panel object beside it. The *right* column already arrives whole as
   * `rightPanel`, so nothing new is needed there — its `width` and `resize`
   * sit on that object.
   */
  leftWidth?: number;
  /**
   * Makes the left column drag-resizable (0.36.0) — the same all-or-nothing
   * contract `AppShellPanel.resize` carries, forwarded verbatim rather than
   * re-spelled, so the two cannot drift. Omitted, there is no separator,
   * exactly as before this release.
   *
   * The width stays the app's state: `onWidthChange` reports every clamped
   * value and the app hands it back in through `leftWidth`. This package
   * stores nothing — a remembered width here would be a second truth next to
   * the one the app persists (the same reasoning as `leftOpen`'s missing
   * `defaultOpen`).
   */
  leftResize?: AppShellPanel["resize"];
  /**
   * An optional second column on the right (details, sources, help), passed
   * whole — `AppShell`'s own `AppShellPanel`, not re-spelled as six props. The
   * shell renders no right column when it is omitted: no rail, no landmark.
   */
  rightPanel?: AppShellPanel;
  /**
   * Forwarded to `AppShell` verbatim (0.37.0): `false` keeps `rightPanel` out
   * of the **desktop** arrangement without touching its `isOpen`, and is
   * ignored below `lg`. Say what you mean instead of dropping `rightPanel`
   * for a view — JustRAG's KB screen hides its sources column exactly this
   * way, and omitting the prop instead destroyed the collapse state of the
   * column each time the view came back.
   */
  showRight?: boolean;
}

const AppShellLayout = React.forwardRef<HTMLDivElement, AppShellLayoutProps>(
  (
    {
      logo,
      nav,
      sidebarFooter,
      navLabel = "Hauptnavigation",
      pageLabel,
      search,
      headerActions,
      leftOpen,
      onLeftOpenChange,
      collapseLabel = "Navigation einklappen",
      expandLabel = "Navigation ausklappen",
      leftWidth,
      leftResize,
      rightPanel,
      showRight,
      mobileTabs,
      activeMobileTab,
      onMobileTabChange,
      mobileTabBarLabel,
      children,
      ...props
    },
    ref,
  ) => {
    // The same hook, the same boundary and the same reason as `AppShell`'s own
    // branch (`lib/pane-layout.ts`): what belongs in the chrome bar is not a
    // narrower version of itself below `lg` — the wide bar's three regions are
    // a different composition, not the same one with utilities on top.
    const isDesktop = useIsDesktop();

    /* A `<p>`, deliberately, and not a heading: this bar is chrome — it names
       the current location, while the page's heading belongs to the content
       template hung in as `children` (see `docs/COMPONENT_GUIDELINES.md` →
       „Page headings: who owns them"). An `<h1>` here would collide with the
       one every content template already renders. The same is true of
       everything a consumer puts in `search` or `headerActions`: they are two
       further chrome locations in the same bar, not a route around that rule.
       `m-0` pins the `<p>`'s user-agent margin (1em, measured in Chromium)
       against a consumer's `@layer base` revert.

       Rendered only when there IS a label (0.29.0) — the test is truthiness,
       the same one the other two regions use, so `pageLabel={t('x')}` with an
       empty translation renders nothing rather than a blank slot. `truncate`
       is new in 0.30.0 and belongs to the three-region bar: the label's region
       is one of two equal halves, so a label longer than its half has to clip
       instead of pushing the centred `search` off the bar's centre. The
       accessible text is unchanged — clipping is visual. */
    const label = pageLabel ? (
      <p className="m-0 truncate font-headline-md text-headline-md-mobile font-bold text-on-surface md:text-headline-md">
        {pageLabel}
      </p>
    ) : null;

    /* The narrow bar's right-hand region — the wide bar builds its own below,
       because there the region has to exist even when empty. Rendering
       `headerActions` in BOTH bars is the point: an app's chrome controls must
       not disappear at a breakpoint. `gap-2` keeps several of them apart,
       `justify-end` pins a single one to the right edge, where the hardcoded
       toggle used to sit. Omitted, nothing is rendered at all. */
    const actions = headerActions ? (
      <div className="flex min-w-0 items-center justify-end gap-2">{headerActions}</div>
    ) : null;

    /* The wide bar: three regions.

       The two side regions are identical flex items (`flex-1`, i.e. basis 0,
       and the same `min-w-*` floor) and are rendered whether or not they have
       content — that is the mechanism, not an oversight. Two items with the
       same flex values get the same width in every state of the flex
       algorithm, so the centre region sits on the row's exact middle,
       independent of how wide the label or the actions are; an omitted region
       would hand its space to the other side and move the centre by half of
       it. (0.29.0 had the opposite rule for the opposite reason: with a single
       `mx-auto` region, an empty `<p>` next to it shifted the centring by half
       the row's `gap-4` — measured, 8px. Both facts are about the same bar,
       one about elements with content, this one about the regions that hold
       them; an empty region carries no text and no box of its own.)

       **What gives way first when the row is short (0.44.1, KI-842).** Until
       0.44.0 the centre was `w-full max-w-md min-w-0` and the sides had no
       floor, so the centre kept its full 28rem and the two sides absorbed the
       whole shortfall. Measured in Chromium (JustRAG KI-838, both columns open
       at 320px, a 560px bar; reproduced by `NarrowBarKeepsTheLabel`): the
       label's region was 16px, a back button plus topic title in it got 0px
       of title, and the back button and the gear each reached 4px into the
       field, which stayed at 448px. Now the order is:

       1. **Spare room** — the sides are `flex-1` and the centre does not grow,
          so a long row splits what the capped search leaves equally between
          the sides (the pre-0.44.1 layout, unchanged).
       2. **Then the search.** The centre is `w-md` (a 28rem flex basis) and
          shrinks, down to its floor `--bar-search-min` (8rem), while the sides
          hold their floor `--bar-side-min` (11rem: a 36px icon button plus a
          ~120px truncated title). Flex does this without a priority knob: a
          side's basis is 0, below its floor, so in the shrink pass it is
          frozen at the floor and the centre alone takes the shortfall. The
          560px case lands exactly on this step's end: 512 content − 32 gaps =
          2 × 176 + 128.
       3. **Only then the sides**, equally: the side floor is
          `min(side-min, (100% − search-min − 2 × gap-4) / 2)`, so once the
          search sits at its floor the floor itself shrinks with the row and
          the two sides give way half each. The label truncates further; the
          search stays usable and centred.
       4. Below a row of search-min + 2 × gap (a 208px bar), the sides are 0
          and the search overflows — not reachable with two open columns on an
          `lg` window. `BarGivesWayInOrder` measures steps 1–3.

       So the search is on the row's exact centre at every width down to that
       last step. Known limit: the floor is a length, not the content's own
       minimum — `headerActions` wider than 11rem (a single `ThemeToggle` is
       102px) is not reserved for and reaches toward the search on a short
       row. A content-derived floor cannot be expressed here: the label's
       min-content is its full untruncated text, so it would switch
       `truncate` off, and two different content floors would break the
       symmetry the centring rests on.

       **The row's inset is `px-gutter` (24px), not a page measure** (0.37.0).
       Until 0.36.0 both bars were a `Container` — `mx-auto w-full px-gutter
       md:px-margin-page` plus a `max-w-(--max-width-container-page)` cap, i.e.
       the measure of the PAGE's content column. But this row is not page
       content, it is chrome between two `SidePanel`s, and with the page
       measure its first content started 40px from the column edge while the
       column's logo started 24px — the gap the developer saw on JustRAG's KB
       screen, measured in Chromium at 1280px. No `md:` step, no cap and no
       `mx-auto`: the three-region flex below is what centres `search`, so the
       row wants the full width of its column.

       **This is the bar's own inset, not a copy of the column header's**
       (0.39.0). It used to be justified as "the inset of a `SidePanel`'s
       `h-16` header row"; that row is `px-4` (16px) now, because the pane's
       toggle is aligned on the pane BODY's first control (`side-panel.tsx`).
       The gutter stays here on its own merit — this row holds page-level
       chrome, not a pane's body — so the two insets are deliberately
       different and neither follows the other. */
    const wideBar = (
      <div className="flex w-full items-center gap-4 px-gutter [--bar-search-min:8rem] [--bar-side-min:11rem]">
        <div className="flex min-w-[min(var(--bar-side-min),(100%_-_var(--bar-search-min)_-_2rem)/2)] flex-1 items-center">
          {label}
        </div>
        {search ? <div className="w-md min-w-(--bar-search-min)">{search}</div> : null}
        <div className="flex min-w-[min(var(--bar-side-min),(100%_-_var(--bar-search-min)_-_2rem)/2)] flex-1 items-center justify-end gap-2">
          {headerActions}
        </div>
      </div>
    );

    /* Is the nav being rendered as the rail's icon strip rather than as the
       column body? `isDesktop &&`, not `!leftOpen` alone: below `lg` the shown
       column IS the screen and deliberately ignores the collapse state (there
       is no rail and no toggle there), so a stored "minimised" must not empty
       it. Without the guard a user who had minimised the column on a desktop
       got a narrow screen whose navigation tab showed nothing at all. */
    const railNav = isDesktop && !leftOpen;

    /* The narrow bar: brand, plus whatever chrome controls the app placed. No
       burger button — there is no drawer to open since 0.30.0; the areas are
       reached through the `BottomTabBar` the shell renders. */
    const narrowBar = (
      <div className="flex w-full items-center gap-4 px-gutter">
        <div className="flex min-w-0 flex-1 items-center">{logo}</div>
        {actions}
      </div>
    );

    return (
      <AppShell
        ref={ref}
        topBar={isDesktop ? wideBar : narrowBar}
        left={{
          /* THE NAV MOVES INTO THE RAIL WHEN THE COLUMN COLLAPSES; it is not
             rendered in both places, and it is not dropped.
 
             `SidePanel` hides its whole BODY in the rail — deliberately, so a
             pane's scroll position and half-typed input survive a collapse —
             and the nav is the body. Left at that, minimising the column would
             hide the navigation outright rather than shrink it to icons, which
             is what `Sidebar`'s 80px column did before 0.30.0 and what an app
             persisting "sidebar minimised" means by it.
 
             So the SAME node is handed to `content` while open and to
             `collapsedPreview` while collapsed. Two copies would have been the
             easy shape and are the wrong one: a second mount duplicates every
             `id` and every `aria-current` a consumer put in a `NavItem` — the
             exact failure the drawer's removal fixed in this release. Moving it
             costs the nav's own scroll position across a collapse, the same
             trade `footer` makes, and a nav column has far less to lose than a
             pane body.
 
             `NavItem` shrinks itself: `SidePanel` publishes the collapsed state
             on `SidebarCollapsedContext`, so the rows in the rail are the
             icon-only form with their label on `aria-label`.
 
             `nav` keeps its own `<nav aria-label>` landmark in both positions,
             exactly as it had inside `Sidebar`; the column around it is the
             `complementary` landmark `SidePanel` renders, named by the same
             string so a screen-reader user meets one name for one column. */
          content: railNav ? null : (
            // A `SidebarPanel` brings its own insets (same frame as the right
            // column's), so the nav adds none around it and lets it fill.
            <nav
              aria-label={navLabel}
              className="flex flex-col gap-2 p-4 has-[>[data-slot=sidebar-panel]]:h-full has-[>[data-slot=sidebar-panel]]:gap-0 has-[>[data-slot=sidebar-panel]]:p-0"
            >
              {nav}
            </nav>
          ),
          collapsedPreview: !railNav ? undefined : (
            // No horizontal padding: the rail is 60px and already centres its
            // children, so the rows get the full width to sit an icon in.
            <nav aria-label={navLabel} className="flex w-full flex-col items-center gap-2">
              {nav}
            </nav>
          ),
          header: logo,
          footer: sidebarFooter ? <div className="p-4">{sidebarFooter}</div> : undefined,
          label: navLabel,
          isOpen: leftOpen,
          onOpenChange: onLeftOpenChange,
          collapseLabel,
          expandLabel,
          /* Both `undefined` unless the app asked: `width: undefined` is what
             makes `AppShell` fall back to its 256 default, and `resize:
             undefined` is what leaves the column without a separator — so an
             unchanged call site renders the unchanged DOM. */
          width: leftWidth,
          resize: leftResize,
        }}
        right={rightPanel}
        /* `undefined` unless the consumer said otherwise, so `AppShell`'s own
           `true` default applies and no call site written before 0.37.0
           changes. */
        showRight={showRight}
        mobileTabs={mobileTabs}
        activeMobileTab={activeMobileTab}
        onMobileTabChange={onMobileTabChange}
        mobileTabBarLabel={mobileTabBarLabel}
        {...props}
      >
        {children}
      </AppShell>
    );
  },
);
AppShellLayout.displayName = "AppShellLayout";

export { AppShellLayout };
