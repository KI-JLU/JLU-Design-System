import * as React from "react";
import { cn } from "../lib/utils";
import {
  MOBILE_PANE_STYLE,
  PANE_FILL,
  useIsDesktop,
  type MobilePaneTab,
} from "../lib/pane-layout";
import { BottomTabBar } from "./bottom-tab-bar";
import { ResizeHandle } from "./resize-handle";
import { SidePanel } from "./side-panel";

/**
 * Default expanded width of a shell column, in px.
 *
 * 256 = 16rem = the `--width-sidebar` token at the 16px default root size,
 * i.e. exactly what the fixed sidebar column measured before 0.30.0, so a
 * shell that names no width does not move. It is a number and not the token
 * because `SidePanel.width` is consumer state carried as a number (inline
 * style, next to a drag-resize value) — reading a CSS variable back out of the
 * CSSOM to hand it to React would be a second source for one measurement.
 *
 * TODO: whether a *default* width belongs here at all — rather than making
 * `width` required — is a convenience decision for the shell only; not confirmed with the design-system owner.
 */
const DEFAULT_PANEL_WIDTH = 256;

/**
 * Makes a shell column drag-resizable (0.36.0). Present on an `AppShellPanel`,
 * `AppShell` renders a `ResizeHandle` on that column's content-facing edge —
 * the same widget a standalone pane uses, not a second mechanism.
 *
 * **One object, all-or-nothing, and that is the point.** As four loose
 * optionals („handle without bounds" — a separator whose `aria-valuemin` /
 * `-valuemax` are missing, i.e. an APG splitter that is not one) would be
 * expressible; here it cannot be. `width` stays separate because it exists
 * without resizing too (it has a default, these have none: bounds are the
 * app's decision).
 *
 * **No persistence here.** The consumer stores the number — see the note on
 * `AppShellPanel` — so this carries a callback and no storage key.
 */
export interface AppShellPanelResize {
  /** Smallest width the handle allows, in px (`aria-valuemin`, Home). */
  minWidth: number;
  /** Largest width the handle allows, in px (`aria-valuemax`, End). */
  maxWidth: number;
  /** Receives every clamped width — from the arrow keys and from the drag. */
  onWidthChange: (width: number) => void;
  /** Accessible name of the separator, e.g. „Breite der Navigation ändern". */
  label: string;
}

/**
 * One shell column: its content plus the controlled state it shares with the
 * consumer. Both columns have the identical shape, so they are one object type
 * rather than two flat prop lists.
 *
 * **Controlled, with no `defaultOpen`.** `isOpen` is the app's state — a
 * column width is exactly the kind of thing an app persists per user — and a
 * remembered value here would be a second truth next to it.
 */
export interface AppShellPanel {
  /** Column body: nav rows, a source list, whatever the column is for. */
  content: React.ReactNode;
  /**
   * Node in the column's `h-16` header row, inline with the collapse toggle
   * (`SidePanel.header`): a logo on the left column, a pane title on the
   * right. Unmounted while collapsed — the rail holds only the expand button
   * and `collapsedPreview`.
   */
  header?: React.ReactNode;
  /**
   * Pinned to the bottom of the column, below the scrolling `content` (a user
   * menu). Forwarded to `SidePanel.footer`, so it stays reachable in the
   * collapsed rail — a `SidebarUserMenu` there renders as its avatar alone.
   */
  footer?: React.ReactNode;
  /**
   * Accessible name of the column's `complementary` landmark. Required: a
   * shell can have two of them on screen, and unnamed landmarks cannot be told
   * apart.
   */
  label: string;
  /** Expanded (`true`) or collapsed to the rail (`false`). Consumer state. */
  isOpen: boolean;
  /** Collapse/expand was requested; carries the REQUESTED state. */
  onOpenChange: (isOpen: boolean) => void;
  /** Expanded width in px. Default 256 (= the `--width-sidebar` token). */
  width?: number;
  /**
   * Given, the column is drag-resizable: `AppShell` renders a `ResizeHandle`
   * on its content-facing edge (0.36.0). Omitted, there is no separator at
   * all — every call site written before this release is unchanged.
   *
   * The handle appears **only while the column is expanded** (the collapsed
   * rail is a fixed 60px, so a separator there would report a value with no
   * visible effect) and **only from
   * `lg` up** (below it the shell shows one area at a time; there is nothing
   * to resize a column against).
   */
  resize?: AppShellPanelResize;
  /** Accessible name of the expand button (collapsed state). */
  expandLabel: string;
  /** Accessible name of the collapse button (expanded state). */
  collapseLabel: string;
  /** Optional icon strip shown in the collapsed rail. */
  collapsedPreview?: React.ReactNode;
}

/**
 * Responsive application frame: an optional collapsible column on each side of
 * a main column that carries one chrome bar (`topBar`) above the page's one
 * `<main>`.
 *
 * ```
 * | left SidePanel        | main column                 | right SidePanel   |
 * | header: logo + toggle | topBar (h-16)               | header + toggle   |
 * | content … footer      | <main> scrolls on its own   | content … footer  |
 * ```
 *
 * **Both side columns are `SidePanel`** (0.30.0), with its own toggle, its own
 * rail and its `h-16` header row, which is why the two column headers and
 * `topBar` land on one baseline. The collapsed form **is** the 60px rail; a
 * shell that wants icons in it passes `collapsedPreview`. (The legacy 80px
 * `Sidebar` this frame rendered before 0.30.0 was removed in KI-846.)
 *
 * **Both columns are drag-resizable since 0.36.0** — opt-in, through
 * `AppShellPanel.resize`. Given, the shell composes `SidePanel` +
 * `ResizeHandle` per column; before 0.36.0 the shell had the panes but not the
 * handles, so an app on `AppShellLayout`
 * could not widen its nav column at all (JustRAG's KB screen, KI-94). Omitted,
 * nothing changes: no separator, no id on the `<aside>`, the 256px default.
 * The width itself stays the consumer's number — this package stores nothing.
 *
 * **Below `lg`: one area at a time plus a `BottomTabBar`**, chosen in JS
 * (`useIsDesktop`, `lib/pane-layout.ts`) for the reason given there: a shown
 * area is not a narrower version of itself — it
 * fills the screen, ignores the collapse state and must lose its collapse
 * control. The consumer declares which tab shows which area (`mobileTabs`) and
 * which tab is current; it writes no breakpoint check.
 *
 * **No drawer, no dialog, and therefore no focus management.** Until 0.29.0
 * the narrow-screen navigation was a Radix `Dialog`, which brought a focus
 * trap, Escape-to-close and a scroll lock *because it was an overlay*: content
 * behind a modal must not be reachable, and a modal needs a way out. The
 * tab-bar arrangement is not an overlay — the shown area **is** the page,
 * nothing is layered over anything, so there is no "behind" to trap focus away
 * from and no dismissal to bind Escape to. Removing the dialog removes all
 * three requirements rather than leaving them unimplemented; what stays is the
 * tab bar's own contract (a `navigation` landmark, exactly one
 * `aria-current="page"`).
 *
 * **Every node is mounted once.** The drawer rendered the *same* nav node a
 * second time, so a consumer's `id` inside it existed twice while the drawer
 * was open (JustRAG hit exactly this and documented it in `AppChrome.tsx`).
 * With the drawer gone there is one mount per node in every state — which is
 * also why `SidebarSurfaceContext`, the mechanism that told the two copies
 * apart, is deleted.
 *
 * **One `<main>` per arrangement, never two** — and when a side column is the
 * area on screen below `lg`, there is no `main` landmark at all: the main
 * column is not in the tree, and wrapping a `complementary` in `main` would be
 * a worse lie than its absence. A workspace screen (two side panes around the
 * main area) is this frame too, through `AppShellLayout` + `rightPanel`;
 * `mainLabel` and `showRight` (0.37.0) are the props that case needed. The
 * former `WorkspaceLayout` wrapper was removed in KI-846, so there is one
 * frame in this library, not two.
 * TODO: that a narrow screen showing a side column has no `main` landmark is a
 * consequence, not a confirmed decision with the design-system owner.
 *
 * TODO: below `lg` a shown column renders its `content` and its `footer` but
 * **not** its `header` — the header row exists to carry the collapse toggle
 * (which must be gone there) and the brand (which `topBar` already shows),
 * while the footer is typically the only route to sign-out. Reasoned from
 * those two facts, not confirmed with the design-system owner.
 *
 * **The collapsed rail keeps the footer** (0.30.0): `SidePanel` renders it
 * below the rail's scrolling strip, and publishes its collapsed state on
 * `SidebarCollapsedContext`, so a `SidebarUserMenu` there shrinks to its
 * avatar. Without both halves a collapsed column had no route to sign-out and
 * rendered full-width nav labels in 60px.
 */
export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Left column, usually the navigation. Omit it for a shell without one. */
  left?: AppShellPanel;
  /** Right column (sources, details, …). Omit it for a shell without one. */
  right?: AppShellPanel;
  /**
   * Keeps the right column out of the **desktop** arrangement without touching
   * its `isOpen` (default `true`). „Hidden is not collapsed" (0.37.0): an app
   * state that needs the horizontal space must not travel through the user's
   * collapse preference — hiding *by* collapsing leaves the column collapsed
   * once that state passes, which is the bug recorded for workspace screens
   * before this flag moved here in 0.37.0.
   *
   * **Ignored below `lg`**, deliberately: hiding buys horizontal space, and
   * one area on screen has none to win — a tab whose column refused to appear
   * would be a dead control. Omitting `right` is the other thing: then the
   * column does not exist at all, in either arrangement.
   *
   * TODO: that the flag is ignored below `lg` (a consumer reading only the
   * prop name could expect otherwise), and that there is no symmetric
   * `showLeft`, is reasoning carried over with the arrangement in 0.37.0 —
   * not confirmed with the design-system owner.
   */
  showRight?: boolean;
  /**
   * Content of the `h-16` chrome bar above `<main>`, in **both**
   * arrangements — the page-label/search/actions row on a wide screen, the
   * brand row on a narrow one. The frame owns the row's height (64px in every
   * state: consumers position overlays under that edge), the consumer owns
   * what is in it. Omitted entirely, no bar and no `banner` landmark render.
   */
  topBar?: React.ReactNode;
  /**
   * Accessible name of the shell's `<main>` landmark, in **both**
   * arrangements (0.37.0). Optional: a shell whose page content already names
   * itself needs no second name, and every call site written before this
   * release renders the unchanged `<main>`. A shell that is the whole page
   * passes it, because nothing above it contributes the page's `main`
   * landmark.
   */
  mainLabel?: string;
  /** Tabs of the narrow-screen bar, each declaring which area it shows. */
  mobileTabs: MobilePaneTab[];
  /**
   * Id of the current tab — the **single** input that decides which area is on
   * screen below `lg`. Any derivation the app needs (two tabs on one area, a
   * tab implied by other view state) stays in the app.
   */
  activeMobileTab: string;
  /** A tab was tapped. */
  onMobileTabChange: (id: string) => void;
  /** Accessible name of the tab bar's `navigation` landmark. */
  mobileTabBarLabel: string;
}

const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  (
    {
      className,
      left,
      right,
      showRight = true,
      topBar,
      mainLabel,
      mobileTabs,
      activeMobileTab,
      onMobileTabChange,
      mobileTabBarLabel,
      children,
      ...props
    },
    ref,
  ) => {
    const isDesktop = useIsDesktop();

    /*
      Ids for the two columns, so a handle's `aria-controls` can name the
      column it resizes (APG splitter). Minted HERE and not inside `SidePanel`,
      because this component is the one place that
      composes column and handle, so it is the one place that knows both ends
      of the reference. The id lands on the pane ROOT (`SidePanel`'s `<aside>`,
      through its pass-through `id`) — the element carrying the inline width
      that `aria-valuenow` reports — not on the inner body region the collapse
      toggle points at: that reference is about visibility, this one about
      size.

      `useId` is called unconditionally (hooks rule) but the attribute is only
      *rendered* on a resizable column, so a shell without `resize` produces
      exactly the DOM it produced before 0.36.0.
    */
    const leftPaneId = React.useId();
    const rightPaneId = React.useId();

    /*
      The chrome bar. `h-16` is on the row itself and not derived from its
      contents, so the bar is 64px tall whatever is hung into it — the same
      chrome unit as a `SidePanel` header row, and a published geometry
      contract outside this repo (JustRAG's `Toast.css`: `top: 76px` = 64 + 12).
    */
    const bar = topBar ? (
      <header className="flex h-16 shrink-0 items-center bg-surface-container-lowest">
        {topBar}
      </header>
    ) : null;

    /*
      A column, as the desktop arrangement renders it. `content` scrolls and
      `footer` is pinned under it — both are `SidePanel`'s own slots since
      0.30.0, so the footer also survives into the collapsed rail instead of
      disappearing with the hidden body. `content` stays mounted while
      collapsed, so scroll position and half-typed input survive.
    */
    const column = (panel: AppShellPanel, side: "left" | "right", paneId: string) => (
      <SidePanel
        // Only on a resizable column — see the id comment above.
        id={panel.resize ? paneId : undefined}
        side={side}
        isOpen={panel.isOpen}
        width={panel.width ?? DEFAULT_PANEL_WIDTH}
        onExpand={() => panel.onOpenChange(true)}
        onCollapse={() => panel.onOpenChange(false)}
        expandLabel={panel.expandLabel}
        collapseLabel={panel.collapseLabel}
        header={panel.header}
        collapsedPreview={panel.collapsedPreview}
        footer={panel.footer}
        aria-label={panel.label}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">{panel.content}</div>
      </SidePanel>
    );

    /*
      The column's separator, or nothing. Two gates: no `resize` contract → the column is not resizable at all, and a
      collapsed column is the fixed-width rail, where a separator would report
      a value nothing responds to. The third gate — „not below `lg`" — is the
      arrangement itself: the narrow branch below returns before this is
      called.

      `value` reads the same `panel.width ?? DEFAULT_PANEL_WIDTH` the column
      does, so `aria-valuenow` and the inline width are one number and not two.
    */
    const handle = (panel: AppShellPanel, side: "left" | "right", paneId: string) =>
      panel.resize && panel.isOpen ? (
        <ResizeHandle
          side={side}
          value={panel.width ?? DEFAULT_PANEL_WIDTH}
          min={panel.resize.minWidth}
          max={panel.resize.maxWidth}
          label={panel.resize.label}
          controls={paneId}
          onValueChange={panel.resize.onWidthChange}
        />
      ) : null;

    if (!isDesktop) {
      // One lookup in the consumer's own table — not a derivation: the app
      // decides which tab is active, the table says which area that tab shows.
      // A tab pointing at a column this shell does not have (and an id that is
      // in no tab at all) falls back to the main area rather than to a blank
      // screen.
      const activePane = mobileTabs.find((tab) => tab.id === activeMobileTab)?.pane;
      const panel =
        activePane === "left" ? left : activePane === "right" ? right : undefined;

      return (
        <div
          ref={ref}
          className={cn(
            "flex h-dvh min-h-0 flex-col overflow-hidden bg-surface text-on-surface",
            className,
          )}
          {...props}
        >
          {bar}
          {panel ? (
            <aside
              aria-label={panel.label}
              className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-container-lowest"
              style={MOBILE_PANE_STYLE}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">{panel.content}</div>
              {panel.footer && <div className="shrink-0">{panel.footer}</div>}
            </aside>
          ) : (
            <main aria-label={mainLabel} className={PANE_FILL} style={MOBILE_PANE_STYLE}>
              {children}
            </main>
          )}
          <BottomTabBar
            items={mobileTabs}
            activeId={activeMobileTab}
            onChange={onMobileTabChange}
            label={mobileTabBarLabel}
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          // `h-dvh`, not `min-h-dvh`: the columns are full-height flex children
          // and `<main>` scrolls inside the frame, so the frame has to HAVE a
          // height. With `min-h-dvh` the heights inside resolve against the
          // content, and a long page would push the columns past the viewport
          // instead of scrolling the main area.
          "flex h-dvh overflow-hidden bg-surface text-on-surface",
          className,
        )}
        {...props}
      >
        {/* Column, then its separator: the handle sits on the edge that faces
            the content, which is the right edge of a left column and the left
            edge of a right one — carried by DOM order, so tab order matches
            the visual one. */}
        {left && (
          <>
            {column(left, "left", leftPaneId)}
            {handle(left, "left", leftPaneId)}
          </>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {bar}
          <main aria-label={mainLabel} className={PANE_FILL}>
            {children}
          </main>
        </div>
        {/* `showRight` gates the DESKTOP arrangement only — see the prop. */}
        {right && showRight && (
          <>
            {handle(right, "right", rightPaneId)}
            {column(right, "right", rightPaneId)}
          </>
        )}
      </div>
    );
  },
);
AppShell.displayName = "AppShell";

export { AppShell };
