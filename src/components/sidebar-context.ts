import * as React from "react";

/**
 * The collapsed state a nav column publishes to its own subtree. In its own
 * module so `side-panel.tsx` exports nothing but a component (react-refresh's
 * "only export components" rule — same reason the `*-variants.ts` files
 * exist).
 *
 * `SidebarSurfaceContext` used to live here too. It told a `Sidebar` whether it
 * was the desktop column or `AppShell`'s second copy inside the mobile drawer.
 * The drawer is gone (0.30.0) — below `lg` the shell shows one area at a time
 * plus a `BottomTabBar`, so no node is mounted twice and nothing produced the
 * value any more. Deleted rather than left declared and unread.
 */

/**
 * Whether the surrounding nav column is currently rendering its collapsed,
 * icon-width form.
 *
 * Provided by `SidePanel` (its 60px rail) — which is what `AppShell`'s nav
 * column is. Until 0.30.0 only the legacy 80px `Sidebar` provided it, and
 * moving the shell onto `SidePanel` left the context at its `false` default,
 * so `NavItem` and `SidebarUserMenu` rendered their full-width form inside a
 * 60px rail. `Sidebar` was removed in KI-846; `SidePanel` is now the only
 * provider.
 *
 * Consumed by `NavItem` and `SidebarUserMenu`, and exported for consumers who
 * hang their own node into the `header`/`footer` slots and need to shrink it
 * the same way. Defaults to `false`, so every component reading it behaves
 * exactly as before when used outside a `SidePanel`.
 */
export const SidebarCollapsedContext = React.createContext(false);

export function useSidebarCollapsed(): boolean {
  return React.useContext(SidebarCollapsedContext);
}
