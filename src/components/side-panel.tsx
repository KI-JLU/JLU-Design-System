import * as React from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { SIDE_PANEL_RAIL_WIDTH, sidePanelVariants } from "./side-panel-variants";
import { SidebarCollapsedContext } from "./sidebar-context";

/**
 * Collapsible pane frame: width, collapsed state and border edge for a
 * workspace side pane (history on the left, sources on the right, …).
 *
 * **Controlled only.** `isOpen` and `width` are consumer state — a workspace
 * usually keeps both in a context and persists them, and two panes plus a
 * template have to agree on them. The frame keeps no open/width state of its
 * own, so there is one source of truth.
 *
 * **The collapse/expand control belongs to the frame, not to `children`:** it
 * is the only control that exists while the pane is collapsed. Passing it in
 * as content would make it disappear exactly when it is needed.
 *
 * **The toggle row can carry a `header`, and the toggle sits on the edge that
 * faces the content.** A left pane reads `[header … toggle]`, a right pane
 * `[toggle … header]` — mirrored, so both panes put their control next to the
 * main column rather than against the window edge, and so the two headers plus
 * the main column's bar line up as one `h-16` chrome row. `header` is
 * expanded-only; `footer` is **not** — it is pinned under the body when
 * expanded and moves into the rail when collapsed, because it is typically the
 * only route to sign-out and a control that vanished on collapse would strand
 * the user (0.30.0; it replaces the shell pinning its own footer inside
 * `children`).
 *
 * **The pane publishes its collapsed state** on `SidebarCollapsedContext`, so
 * `NavItem` and `SidebarUserMenu` hung into `children`/`footer` shrink to their
 * icon form in the rail without being told twice. Before 0.30.0 only the
 * legacy `Sidebar` (removed in KI-846) provided it, which is why a nav column moved onto this frame rendered
 * full-width labels inside a 60px rail.
 *
 * While collapsed the pane shrinks to a `SIDE_PANEL_RAIL_WIDTH` rail showing
 * the expand button, the optional `collapsedPreview` and — since 0.30.0 — the
 * `footer`. **The rail is the expanded column's vertical mirror** (0.35.0): the
 * same `h-16` chrome row for the toggle, then the slot, then the pinned footer
 * — so nothing jumps to a different height when the pane collapses. `children`
 * stay mounted but hidden (attribute `hidden` + `display:none`), so scroll
 * position and half-typed input survive a collapse. All labels are props — a consumer
 * may be bilingual; this follows `navLabel` on `AppShellLayout` rather than
 * inventing a second pattern. The `<aside>` is a `complementary` landmark: with
 * more than one pane on screen, pass an `aria-label` so they can be told apart.
 *
 * Viewport behaviour is **not** here. Deciding whether a pane is shown at all
 * on a narrow screen — typically one pane at a time plus a `BottomTabBar` —
 * belongs to the composing frame (`AppShell`, which reads `useIsDesktop` from
 * `lib/pane-layout.ts`), so the same pane works wherever it is composed.
 */
export interface SidePanelProps extends React.HTMLAttributes<HTMLElement> {
  /** Which edge the pane sits on — drives the border edge and the chevron direction. */
  side: "left" | "right";
  /** Expanded (true) or collapsed to the rail (false). Consumer state. */
  isOpen: boolean;
  /** Expanded width in px. Consumer state (drag-resizable via `ResizeHandle`). */
  width: number;
  onExpand: () => void;
  onCollapse: () => void;
  /** Accessible name of the expand button (shown while collapsed). */
  expandLabel: string;
  /** Accessible name of the collapse button (shown while expanded). */
  collapseLabel: string;
  /**
   * Brand/title node rendered in the toggle row while expanded (a pane title,
   * a logo, a small action pair). Hidden while collapsed — of the chrome only
   * the expand button survives there, beside `collapsedPreview` and the pinned
   * `footer`. Pass a node that can shrink (`className="truncate"` on a title):
   * the slot is `min-w-0`, so a long title clips instead of pushing the toggle
   * off the row.
   */
  header?: React.ReactNode;
  /** Optional icon strip shown in the collapsed rail below the expand button. */
  collapsedPreview?: React.ReactNode;
  /**
   * Pinned below the scrolling body (a user menu). Unlike `header` it survives
   * collapsing: it moves to the bottom of the rail, where a `SidebarUserMenu`
   * renders as its avatar alone. Keep it to one or two controls — the rail is
   * `SIDE_PANEL_RAIL_WIDTH` (60px) wide.
   */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SidePanel = React.forwardRef<HTMLElement, SidePanelProps>(
  (
    {
      side,
      isOpen,
      width,
      onExpand,
      onCollapse,
      expandLabel,
      collapseLabel,
      header,
      collapsedPreview,
      footer,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    // One id for the pane body, referenced by whichever toggle is on screen —
    // aria-expanded without aria-controls leaves the region unidentified.
    const bodyId = React.useId();
    // Two icons, not one: a chevron has to point the way the control moves the
    // pane. Collapsing pushes the pane at its own edge (a left pane goes left),
    // expanding pulls it back toward the content. lucide's path data is the
    // authority — panel-left-close's chevron apexes left, panel-left-open's
    // right, and the Right pair mirrors that.
    const CollapseIcon = side === "left" ? PanelLeftClose : PanelRightClose;
    const ExpandIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;

    // Defined once and placed twice (see the header row below): only the
    // POSITION differs per side, and the aria contract — label,
    // `aria-expanded`, `aria-controls` — must not be able to drift between two
    // copies of the same control. `ml-auto` is the left pane's only extra: it
    // pins the toggle to the trailing edge when no `header` fills the row.
    //
    // `p-1.5` (0.39.0) overrides the `icon` variant's `p-2` — `cn` is
    // tailwind-merge, so the later padding utility wins — which makes the
    // button 32px (6px + 20px icon + 6px) instead of 36px. Together with the
    // row's `px-4` that puts the toggle's centre 32px from the pane edge; see
    // the geometry note on the header row below. The RAIL's expand button
    // carries the same class: one control, two placements, and a 4px
    // difference between them would be visible across a collapse.
    //
    // The rail's copy carries an `eslint-disable` for
    // `design-system/layout-only-classname` and the reasoning for the override
    // in full; this one is NOT flagged only because the rule does not look
    // inside a `cn(...)` call — treat it as the same exception, not as an
    // approval.
    //
    // `-mr-2` / `-ml-2` (0.41.0; 0.40.0 had `-mr-1.5`): optical alignment. A
    // ghost button has no visible box, so the eye reads the DRAWN glyph's
    // edge, not the button's and not even the svg's; a filled 32px control in
    // the body below shows its box edge at the row's 16px inset. The lucide
    // chevron draws from x=3 to x=21 of its 24-unit viewBox, i.e. 2.5px inside
    // each edge of the 20px svg. 0.40.0 pulled the toggle out by its 6px
    // padding, which put the SVG edge on the inset line and left the strokes
    // 2.5px short — still a visible step (developer report, 21.09.2026). 8px
    // puts the strokes 0.5px inside the line, the nearest utility. The 32px
    // hit area is unchanged. Content-facing edge only: a left pane's toggle
    // moves right, a right pane's moves left.
    const collapseToggle = (
      <Button
        variant="ghost"
        size="icon"
        className={cn("shrink-0 p-1.5", side === "left" ? "ml-auto -mr-2" : "-ml-2")}
        aria-label={collapseLabel}
        aria-expanded={true}
        aria-controls={bodyId}
        onClick={onCollapse}
      >
        <CollapseIcon className="h-5 w-5" aria-hidden />
      </Button>
    );

    return (
      // Provided around the WHOLE pane, rail included: the rail is exactly
      // where `SidebarUserMenu` has to know it is collapsed, and `false` (the
      // context default) is what made it render its full-width form there.
      <SidebarCollapsedContext.Provider value={!isOpen}>
      <aside
        ref={ref}
        // Merged, not spread over: a consumer adding an unrelated style (a
        // z-index, say) must not silently drop the width.
        style={{ width: isOpen ? width : SIDE_PANEL_RAIL_WIDTH, ...style }}
        className={cn(sidePanelVariants({ side }), className)}
        {...props}
      >
        {!isOpen && (
          // THE RAIL IS THE EXPANDED COLUMN'S VERTICAL MIRROR: every slot keeps
          // the height it had, so nothing jumps when the pane collapses. Until
          // 0.35.0 the rail built a rhythm of its own — one padded scroll box
          // holding the button AND the preview — and the whole icon strip sat
          // 12px higher than the rows it replaces, with the toggle 2px off the
          // header row's centre and the footer 16px too high (all three
          // measured in Chromium by running
          // `CollapsedRailKeepsVerticalPositions` against the pre-0.35.0 rail:
          // toggle centre 34 vs 32, first nav row top 68 vs 80, footer bottom
          // 32 vs 16, each relative to the column's own box).
          //
          // Three boxes, matching the expanded body's three: the `h-16` chrome
          // row, the scrolling slot, the pinned footer. The footer is separate
          // rather than an `mt-auto` child of the scroll box because it would
          // otherwise ride off the end of a long preview strip — and it is the
          // sign-out route, the one thing in the rail that must stay reachable.
          <div className="flex min-h-0 flex-1 flex-col items-center">
            {/* The same `h-16` row the expanded header uses, so the toggle is
                one control that stays put rather than two that nearly line up.
                The height is the ROW's, not the button's — exactly as below. */}
            <div className="flex h-16 shrink-0 items-center justify-center">
              {/* `p-1.5` for the same reason as the collapse toggle (0.39.0):
                  the two are one control in two placements and must not differ
                  in size — the rail is 60px wide, so a 36px button here and a
                  32px one there would also sit on different centres.

                  `layout-only-classname` flags a positive padding on a control
                  as a shrink-to-fit hack, and normally it is right. Here the
                  32px IS the specified geometry (developer decision,
                  21.09.2026): the toggle has to land on the same vertical line
                  as a 32px control in a `p-4` body, and no label can stop
                  fitting — the button's only child is a fixed 20px icon and
                  its accessible name is the `aria-label`. It stays a
                  `className` rather than a new `size` variant because the same
                  4px would then have to be right for every icon button in the
                  library, which is not this card's decision to make.
                  TODO: if a second call site wants 32px, promote this to a
                  `size="icon-sm"` variant instead of repeating the override. */}
              <Button
                variant="ghost"
                size="icon"
                /* eslint-disable-next-line design-system/layout-only-classname -- specified geometry, reasoned above */
                className="p-1.5"
                aria-label={expandLabel}
                aria-expanded={false}
                aria-controls={bodyId}
                onClick={onExpand}
              >
                <ExpandIcon className="h-5 w-5" aria-hidden />
              </Button>
            </div>
            {/* `py-stack-md` is the rail's counterpart to the padding a pane
                body brings with it (`p-4` on `AppShellLayout`'s nav), which is
                what puts the first icon on the same line as the first row.
                `gap-stack-md` spaces the preview's own children — a consumer
                may pass a bare fragment of icons. */}
            <div className="flex min-h-0 flex-1 flex-col items-center gap-stack-md overflow-y-auto py-stack-md">
              {collapsedPreview}
            </div>
            {/* No padding of the rail's own, for the same reason the expanded
                footer wrapper has none: the consumer's node carries it, and a
                second helping here would lift the collapsed footer above the
                expanded one. */}
            {footer && <div className="shrink-0">{footer}</div>}
          </div>
        )}

        {/*
          Two mechanisms on purpose, and they agree rather than fight: the
          `hidden` *attribute* is what removes the collapsed body from the
          accessibility tree, the display *utility* is what removes it from the
          layout. Only the utility is ours — `[hidden] { display: none }` comes
          from Tailwind's preflight (verified in the built CSS, where it is even
          `!important`), and a consumer that compiles Tailwind without preflight
          would style the attribute not at all.
        */}
        <div
          id={bodyId}
          hidden={!isOpen}
          className={cn("min-h-0 flex-1 flex-col", isOpen ? "flex" : "hidden")}
        >
          {/*
            One fixed-height chrome row, `h-16` like `AppShellLayout`'s bar, so
            the left pane's header, the main
            column's bar and the right pane's header sit on one baseline. The
            height is on the row, not derived from the button, so it does not
            change when a taller or shorter `header` node is passed. (The
            collapsed RAIL keeps its 60px width — that is
            `SIDE_PANEL_RAIL_WIDTH`, a different measurement; see the TODO in
            `side-panel-variants.ts`.)

            **The row's inset is `px-4` (16px) since 0.39.0**, not the column
            gutter — and it is the pane BODY's inset, not the chrome bar's.
            A pane body is padded by its consumer (`AppShellLayout`'s nav uses
            `p-4`), so a 32px control at the trailing edge of the body's first
            row has its centre 16 + 16 = 32px from the pane edge. With
            `px-gutter` (24px) and the `icon` variant's 36px button the toggle
            sat at 24 + 18 = 42px, i.e. 10px off that line — visible on
            JustRAG's KB screen, where the pane's first body row carries such a
            control. `px-4` + the toggle's `p-1.5` put both centres on 32px.
            Measured in Chromium by
            `SidePanel` → `ToggleAlignsWithBodyControl`, whose expectation is
            read off the body control's own rect.
          */}
          <div className="flex h-16 items-center gap-stack-sm px-4">
            {/* The toggle sits on the edge that FACES THE CONTENT, in both
                directions: a left pane's row reads [header … toggle], a right
                pane's [toggle … header]. DOM order carries it — on a right
                pane the toggle is emitted first — so the tab order and a
                screen reader's reading order match what is on screen, which a
                purely visual `order-*` utility would break. */}
            {side === "right" && collapseToggle}
            {/* Wrapped rather than spread into the row: a multi-node header keeps the row's gap, and `min-w-0`
                lets a `truncate`d title clip instead of pushing the toggle out
                of the row. */}
            {/* Unmounted while collapsed, not just hidden — the opposite of
                `children`, on purpose. `children` are kept mounted because a
                pane body holds scroll position and half-typed input; a header
                is chrome (a title, a logo), it has nothing to lose, and the
                collapsed rail carries no title — only the expand button,
                `collapsedPreview` and the pinned `footer`. */}
            {isOpen && header && (
              <span className="flex min-w-0 flex-1 items-center gap-stack-sm">
                {header}
              </span>
            )}
            {side === "left" && collapseToggle}
          </div>
          {children}
          {/* `isOpen &&`, not just `footer &&`: the collapsed rail renders the
              same node, and the body is only HIDDEN, never unmounted — without
              the guard the footer exists twice in the DOM, which duplicates any
              `id` a consumer put in it (the drawer's old failure mode, removed
              in 0.30.0 precisely because every node must be mounted once).
              So the footer MOVES between the two mount points and, like
              `header`, loses component state across a collapse; `children` are
              the ones kept mounted, because a pane body holds scroll position
              and half-typed input and a user menu holds neither.
              `shrink-0` so a long `children` scrolls against the footer rather
              than squeezing it — the body is a flex column and the footer is
              the one row that must keep its height. */}
          {isOpen && footer && <div className="shrink-0">{footer}</div>}
        </div>
      </aside>
      </SidebarCollapsedContext.Provider>
    );
  },
);
SidePanel.displayName = "SidePanel";

export { SidePanel };
