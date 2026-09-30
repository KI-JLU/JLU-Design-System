import * as React from "react";
import type { BottomTabBarItem } from "../components/bottom-tab-bar";
import { SIDE_PANEL_RAIL_WIDTH } from "../components/side-panel-variants";

/**
 * The one responsive arrangement rule this library has, in one place.
 *
 * `AppShell` (left nav column, main column, right pane) answers it: "one area
 * at a time plus a `BottomTabBar` below `lg`". Until KI-846 a second frame,
 * `WorkspaceLayout`, asked the same question, which is why the hook, the
 * breakpoint and the two data shapes live here and not inside `AppShell`. A
 * second `matchMedia` boundary in this package would be a second answer to
 * "when is this a desktop".
 */

/**
 * Tailwind's `lg` breakpoint, as a media query: `--breakpoint-lg: 64rem` in
 * `node_modules/tailwindcss/theme.css` (this repo adds no `--breakpoint-*`
 * override). The same value the `lg:` utilities elsewhere in this library use,
 * and the boundary the source implementation uses (JustRAG's `useIsMobile`:
 * `max-width: 1023px` = 1024px = 64rem at the 16px default root size).
 */
export const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribeToViewport(onStoreChange: () => void): () => void {
  // `matchMedia` is missing in jsdom (verified: jsdom 29 does not implement
  // it), so a consumer's unit test would otherwise crash on rendering one of
  // these frames. Degrading to the desktop arrangement keeps every area in the
  // tree, which is the more useful default for a test or a non-browser
  // renderer.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function readViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function assumeDesktop(): boolean {
  return true;
}

/**
 * `true` from `lg` up. `useSyncExternalStore` rather than an effect + state:
 * the first render already reads the real viewport, so the layout does not
 * flash the wrong arrangement.
 *
 * **Why a frame asks this in JS at all** — and why it is not a `lg:` utility:
 * below `lg` an area is not a narrower version of itself. It fills the screen,
 * it ignores the collapse state, and its collapse control must be gone (a
 * control that collapses the only visible area would leave an empty screen and
 * would destroy the desktop preference on the way). None of those three is
 * expressible as a class on the same markup.
 */
export function useIsDesktop(): boolean {
  return React.useSyncExternalStore(subscribeToViewport, readViewport, assumeDesktop);
}

/** Which of the three areas a narrow-screen tab shows. */
export type PaneId = "left" | "main" | "right";

/**
 * A tab of the narrow-screen bar plus the area it shows. The mapping is
 * **declared by the consumer**, not derived by a frame: an app may well have
 * two tabs that show the same area (JustRAG's „Chat" and „Workspace" both
 * render the main area and are told apart by its own view state).
 */
export interface MobilePaneTab extends BottomTabBarItem {
  /** Which area this tab shows below `lg`. */
  pane: PaneId;
}

/** Fills its column and scrolls on its own — one per area, all alike. */
export const PANE_FILL = "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto";

/**
 * `BottomTabBar` is `fixed`, so the area below `lg` has to reserve its height
 * or the last row of content sits behind it. The bar is one „chrome unit"
 * tall — the same number as the collapsed rail, which is why
 * `SIDE_PANEL_RAIL_WIDTH` is reused here instead of a second literal 60 (see
 * the notes in `side-panel-variants.ts` and `bottom-tab-bar-variants.ts`) —
 * plus the iOS safe area the bar itself pads with.
 *
 * Imported from `side-panel-variants` rather than restated, so the reserved
 * space cannot drift from the bar's actual height.
 */
export const MOBILE_PANE_STYLE: React.CSSProperties = {
  paddingBottom: `calc(${SIDE_PANEL_RAIL_WIDTH}px + env(safe-area-inset-bottom, 0px))`,
};
