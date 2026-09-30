import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { filterChipVariants } from "./filter-chips-variants";

/**
 * Single-select filter strip: a row of pill chips above a list, exactly one of
 * them active, with an optional trailing action chip for adding a new one.
 *
 * The shape is the one a messenger's chat filter uses — „Alle · Favoriten ·
 * <category> · +" — and it is for the case `SegmentedControl` and `FilterMenu`
 * both get wrong:
 *   - `SegmentedControl` is a JOINED row inside one rounded border. It reads as
 *     one control with segments, which suits a fixed axis (Tag/Woche/Monat) and
 *     not an open-ended list the user extends at runtime;
 *   - `FilterMenu` hides the options behind a dropdown, so the available
 *     filters are invisible until opened — the opposite of what this strip is
 *     for, where seeing the categories IS the point.
 *
 * **Controlled, and exactly one chip is active.** `value` always names a chip;
 * there is deliberately no „nothing selected" state, because the first option
 * is „Alle" — an unfiltered list is a selection, not the absence of one. A
 * `value` matching no option renders every chip inactive rather than throwing,
 * which is the readable failure when a stored filter outlives the category it
 * named.
 *
 * **ARIA: a group of toggle buttons, not a tablist and not a radiogroup.**
 *   - not `tablist`: tabs switch PANELS and owe the reader arrow-key roving
 *     focus. These chips filter one list in place; there is no second panel;
 *   - not `radiogroup`: APG's radio pattern also requires roving focus and
 *     Home/End, which would make Tab skip past the whole strip — wrong for a
 *     row whose chips are individually reachable controls;
 *   - so `role="group"` + `aria-pressed` per chip, which is exactly what
 *     `SegmentedControl` in this library already does for the same "one of
 *     these is on" shape. One convention, not two.
 * Name the group: pass `aria-label` saying what is being filtered.
 *
 * The strip SCROLLS horizontally rather than wrapping (`overflow-x-auto` +
 * `shrink-0` chips). Wrapping would change the height of the chrome above a
 * list as categories are added, which moves the list under the reader's cursor;
 * scrolling keeps the row one line tall whatever it holds.
 */

export interface FilterChipsOption {
  /** Stable id. `value` is compared against this. */
  value: string;
  label: string;
  /** Optional leading icon — a star on „Favoriten", say. */
  icon?: React.ReactNode;
  /**
   * Colour-codes the chip: a leading dot, and the active state is tinted in it
   * instead of `primary`. Any CSS colour; `categoryColor(id)` gives a stable
   * one from the category palette. The label stays `on-surface` for contrast.
   */
  color?: string;
}

export interface FilterChipsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: FilterChipsOption[];
  /** The active option's `value`. */
  value: string;
  onValueChange: (value: string) => void;
  /**
   * Shows the trailing „+" chip and is called when it is pressed. Omitted, no
   * action chip renders — a consumer who cannot create a category must not be
   * shown a control that does nothing.
   */
  onAdd?: () => void;
  /**
   * Accessible name of the „+" chip. Required with `onAdd`: the chip is
   * icon-only, so without it the button has no name at all. Deliberately not
   * defaulted to a German string — every other label here comes from the
   * consumer, and a hidden default is the bug the since-removed `ThemeToggle`
   * had.
   */
  addLabel?: string;
}

const FilterChips = React.forwardRef<HTMLDivElement, FilterChipsProps>(
  ({ options, value, onValueChange, onAdd, addLabel, className, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      className={cn(
        // `-mx-*`/`px-*` pair: the scroll area runs edge to edge so a chip
        // scrolled to the boundary is not clipped by the page gutter, while the
        // resting row still lines up with the content above it.
        "flex items-center gap-stack-sm overflow-x-auto",
        className,
      )}
      {...props}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            // The state, not a style hook: a screen reader announces "pressed"
            // and the class only paints it.
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              filterChipVariants({ kind: "filter", active }),
              option.color && active && "text-on-surface",
            )}
            style={
              option.color && active
                ? {
                    borderColor: option.color,
                    backgroundColor: `color-mix(in srgb, ${option.color} 18%, var(--color-surface-container-lowest))`,
                  }
                : undefined
            }
          >
            {option.icon}
            {option.color && (
              <span
                data-slot="filter-chip-dot"
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: option.color }}
              />
            )}
            {option.label}
          </button>
        );
      })}

      {onAdd && (
        <button
          type="button"
          aria-label={addLabel}
          onClick={onAdd}
          className={filterChipVariants({ kind: "action" })}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  ),
);
FilterChips.displayName = "FilterChips";

export { FilterChips };
