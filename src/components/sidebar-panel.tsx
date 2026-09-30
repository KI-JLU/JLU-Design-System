import * as React from "react";
import { cn } from "../lib/utils";
import { SidebarScrollArea } from "./sidebar-scroll-area";

export interface SidebarPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** The column's heading ("Verlauf", "Quellen hinzufügen"). */
  title?: React.ReactNode;
  /** Beside the heading, right-aligned (a small control, a count). */
  titleAside?: React.ReactNode;
  /** Fixed content under the heading: the primary action, a search, a selection bar. */
  head?: React.ReactNode;
  /**
   * Navigation rows (`NavItem`s) that stay put between the head and the
   * scrolling list — so one column can carry page navigation AND a content
   * list (`SidebarCard`s). Omit for a list-only or a nav-only column (a
   * nav-only column passes its rows as `children` and lets them scroll).
   */
  nav?: React.ReactNode;
  /** Fade at scrollable edges in px (0 = hard crop). Default 24. */
  fade?: number;
}

/** A node React renders as nothing — `head`'s notion of "not passed". */
function rendersNothing(node: React.ReactNode) {
  return node == null || typeof node === "boolean" || node === "";
}

/**
 * The body of a side column — the SAME frame on the left and the right, so a
 * change to one is a change to both: a fixed head (title row + `head`, then
 * optional `nav` rows) and, below it, the column's list, which alone scrolls (`SidebarScrollArea`:
 * scrollbar kept in the right gutter, content fading at scrollable edges).
 *
 * Fills its column (`h-full`). `AppShellLayout` drops its nav padding around
 * a SidebarPanel, so the left and the right column start from the same box
 * and their headings share a baseline by construction.
 *
 * **Without `title`, `head` and `nav` there is no head** (KI-852): the
 * list carries the 16px top inset itself (`pt-4`) instead. That 16px is the
 * inset every column body starts with — the head's own `pt-4`,
 * `AppShellLayout`'s `p-4` nav wrapper, and the collapsed rail's
 * `py-stack-md` — so a nav-only column's first row sits on the same line
 * expanded and in the rail. Until then the empty head still rendered its
 * `pt-4 pb-3`, a 28px box, and the first row sat 12px lower expanded (92px
 * below the column's top) than in the rail (80px), measured in Chromium on
 * KI-852. Dropping the head without the `pt-4` would have put the row at
 * 64px, 16px too high: the head's `pb-3` is the 12px, its `pt-4` is not.
 *
 * `head` counts as passed unless React renders it as nothing (`null`,
 * `undefined`, a boolean, `""`). A component that returns `null` is still a
 * passed node — the panel cannot see inside it.
 */
const SidebarPanel = React.forwardRef<HTMLDivElement, SidebarPanelProps>(
  ({ title, titleAside, head, nav, fade = 24, className, children, ...props }, ref) => {
    const hasHead = Boolean(title) || !rendersNothing(head) || Boolean(nav);
    return (
      <div
        ref={ref}
        data-slot="sidebar-panel"
        className={cn("flex h-full min-h-0 flex-col", className)}
        {...props}
      >
        {hasHead && (
          <div
            data-slot="sidebar-panel-head"
            className="flex flex-none flex-col gap-3 px-4 pt-4 pb-3"
          >
            {title && (
              <div className="flex min-h-8 items-center justify-between gap-2">
                <h2 className="m-0 text-sm font-semibold text-primary">{title}</h2>
                {titleAside}
              </div>
            )}
            {head}
            {nav && (
              <div data-slot="sidebar-panel-nav" className="flex flex-col gap-1">
                {nav}
              </div>
            )}
          </div>
        )}
        {/* `pt-4` on the scroller, not on the panel: the list scrolls under the
            inset and fades there, exactly as the rail's `py-stack-md` box does. */}
        <SidebarScrollArea
          gutter={16}
          fade={fade}
          className={cn("pb-6 pl-4", !hasHead && "pt-4")}
        >
          {children}
        </SidebarScrollArea>
      </div>
    );
  },
);
SidebarPanel.displayName = "SidebarPanel";

export { SidebarPanel };
