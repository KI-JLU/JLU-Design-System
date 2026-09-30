import { cva } from "class-variance-authority";

/**
 * NavItem style variants (cva). Formalizes the sidebar-row pattern:
 * rows whose corners follow the app-wide Style (`--ui-radius-control`:
 * rounded squares or pills, UiShapeProvider), `level` picks top-level vs. nested sizing, `active`
 * carries the current-page state (bg-primary top / secondary-container sub).
 * Note: the active top-level row deliberately switches to the label font
 * (font-label-sm) — that is the app's established look, kept 1:1.
 *
 * `collapsed` is the icon-only form a collapsed `SidePanel` puts its rows into. It hides
 * every **element** child that is not an `<svg>` and centers what is left, so
 * the row keeps its own `px-4`/`py-3` (and therefore its hit target and its
 * pill shape) at the narrower column width. Two consequences worth knowing:
 *  - the rule is written as a child selector on the row itself, so it works
 *    identically when `asChild` renders a router `<a>` — the class lands on
 *    the `<a>`, and the `<a>`'s children are what gets hidden;
 *  - it cannot hide a bare **text node** (`<NavItem>Team</NavItem>`), because
 *    CSS has no selector for one. That is why `NavItem`'s `label` prop also
 *    sets `aria-label`: the accessible name is then guaranteed regardless, and
 *    the visual contract ("put the row's text in an element") is stated on the
 *    prop.
 */
export const navItemVariants = cva(
  "flex w-full items-center rounded-[var(--ui-radius-control,var(--radius-action))] transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface [&_svg]:shrink-0",
  {
    variants: {
      level: {
        top: "gap-4 px-4 py-3 font-body-base text-body-base",
        sub: "gap-3 px-3 py-2 font-body-base text-sm",
      },
      active: {
        true: "",
        false: "text-on-surface-variant hover:bg-secondary-container",
      },
      collapsed: {
        true: "justify-center [&>*:not(svg)]:hidden",
        false: "",
      },
    },
    compoundVariants: [
      {
        level: "top",
        active: true,
        className: "bg-primary text-on-primary font-label-sm",
      },
      {
        level: "sub",
        active: true,
        className: "bg-secondary-container text-on-secondary-container",
      },
    ],
    defaultVariants: {
      level: "top",
      active: false,
      collapsed: false,
    },
  },
);
