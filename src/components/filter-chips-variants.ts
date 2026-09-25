import { cva } from "class-variance-authority";

/**
 * Chip style variants (cva), in their own module so `filter-chips.tsx` exports
 * only components (react-refresh's "only export components" rule — the same
 * reason every other `*-variants.ts` here exists).
 *
 * TWO SHAPES, ONE ROW. A `filter` chip carries a label and is selectable; an
 * `action` chip is the trailing icon-only control (the "+"), which is square by
 * construction so the circle reads as a circle rather than a squashed pill.
 * They share the height, the border and the focus ring so the row is one strip
 * of controls and not two.
 *
 * WHY THE ACTIVE STATE IS A TINTED FILL AND NOT A SOLID ONE. A solid `bg-primary`
 * chip has the visual weight of a primary BUTTON, and next to four of them the
 * row would read as five calls to action rather than as one selected filter.
 * `bg-primary/10` + `text-primary` + a primary border is the same treatment
 * `Button`'s ghost variant already uses for `aria-pressed=true`, so a selected
 * chip and a pressed ghost button look like the same idea — which they are.
 */
export const filterChipVariants = cva(
  [
    // Shared frame. `shrink-0` is what makes the row scroll instead of
    // compressing its chips into unreadable slivers on a narrow screen.
    //
    // h-8 / px-3, tightened from h-9 / px-4 (0.34.0): a filter strip sits ABOVE
    // a list as chrome, and at the button scale it read as a row of primary
    // actions competing with the content it filters.
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border",
    "font-label-sm text-label-sm whitespace-nowrap transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      kind: {
        filter: "px-3",
        // Square, so `rounded-full` is a circle. h-8 = 32px, w-8 matches it.
        action: "w-8",
      },
      // Both states sit on the lowest surface (white in light mode), so a chip
      // keeps its contrast on a tinted page; the active tint is mixed over it.
      active: {
        true: "border-primary bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-container-lowest))] text-primary",
        false:
          "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
      },
    },
    defaultVariants: { kind: "filter", active: false },
  },
);
