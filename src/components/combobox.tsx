import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { LoaderCircle } from "lucide-react";

import { cn } from "../lib/utils";
import { Input, type InputProps } from "./input";
import { menuItemVariants } from "./menu-item-variants";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

/**
 * Combobox — a text field with a filterable, grouped listbox anchored under
 * it: the WAI-ARIA APG combobox pattern ("list autocomplete"). Assembled from
 * the two libraries the design system already ships, nothing hand-rolled:
 *
 * - **cmdk** (the engine behind `Command`) owns the listbox, the highlight,
 *   the keyboard model (↓/↑ with wrap-around, Home/End, Enter), grouping and
 *   client-side filtering;
 * - **Radix Popover** (`Popover`) owns anchoring, portalling (the list is
 *   never clipped by an `overflow` ancestor such as the app bar) and
 *   dismissal (outside click, focus leaving input + list, Escape).
 *
 * ```tsx
 * <Combobox>
 *   <ComboboxInput aria-label="Suchen" leadingIcon={<Search />} />
 *   <ComboboxContent>
 *     <ComboboxEmpty>Keine Treffer</ComboboxEmpty>
 *     <ComboboxList>
 *       <ComboboxGroup heading="Chats">
 *         <ComboboxItem onSelect={open}>Semesterplanung</ComboboxItem>
 *       </ComboboxGroup>
 *     </ComboboxList>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 *
 * **Focus never leaves the input** while the list is open: the popover does
 * not auto-focus itself, a mousedown in the list is cancelled so clicking an
 * option cannot blur the field, and the highlighted option is announced via
 * `aria-activedescendant`. Consequently nothing *inside* `ComboboxContent`
 * can receive focus — it holds options, not controls.
 *
 * **Two filtering modes.**
 * - *client* (default): cmdk filters and ranks the rendered items against
 *   the input text (`filter` swaps the scorer, `keywords` on an item widen
 *   the match).
 * - *server*: pass `shouldFilter={false}`, render exactly the items your
 *   request returned, show `ComboboxLoading` while it is in flight and
 *   `ComboboxEmpty` when it came back empty. **Stale responses are the
 *   consumer's job**: a slow answer to an old query that arrives after a
 *   newer one will be rendered unless you discard it (abort the previous
 *   request or compare the query it was made for).
 *
 * **Open state** is uncontrolled by default (`defaultOpen`), or controlled via
 * `open` / `onOpenChange` — e.g. to keep the list closed below a minimum
 * query length. Typing and ↓ request `onOpenChange(true)`; outside click,
 * focus leaving input + list, Escape and selecting an item request
 * `onOpenChange(false)`. On a keystroke `ComboboxInput`'s `onValueChange`
 * fires *before* `onOpenChange(true)`.
 *
 * `Command*`'s own props pass through (`shouldFilter`, `filter`, `loop`, …).
 * Two defaults differ from cmdk's, both because the list hangs off a text
 * field: `loop` is on (↓ on the last option wraps to the first), and
 * `vimBindings` is off (Ctrl+N/P/J/K are caret keys in a macOS text field,
 * which cmdk would otherwise swallow). cmdk's `value` / `onValueChange` (the
 * highlighted option) and its visually hidden `label` are not exposed — name
 * the field on `ComboboxInput`.
 */
interface ComboboxContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  /** DOM id of the highlighted option, as observed by `ComboboxList`. */
  activeId: string | undefined;
  setActiveId: (id: string | undefined) => void;
  /** Sets cmdk's highlighted value (held here, passed to cmdk controlled). */
  setHighlighted: (value: string) => void;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext(part: string): ComboboxContextValue {
  const context = React.useContext(ComboboxContext);
  if (!context) throw new Error(`<${part}> must be rendered inside <Combobox>.`);
  return context;
}

type CommandRootProps = React.ComponentPropsWithoutRef<typeof CommandPrimitive>;

export interface ComboboxProps
  extends Omit<CommandRootProps, "value" | "defaultValue" | "onValueChange" | "label"> {
  /** Controlled open state of the list. */
  open?: boolean;
  /** Initial open state when uncontrolled. Default `false`. */
  defaultOpen?: boolean;
  /** Called whenever the combobox asks to open or close the list. */
  onOpenChange?: (open: boolean) => void;
}

const Combobox = React.forwardRef<React.ComponentRef<typeof CommandPrimitive>, ComboboxProps>(
  (
    {
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      loop = true,
      vimBindings = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const isControlled = openProp !== undefined;
    const open = isControlled ? openProp : uncontrolledOpen;
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const [activeId, setActiveId] = React.useState<string | undefined>(undefined);
    // cmdk's highlight, held here so `ComboboxList` can restore it — see there.
    const [highlighted, setHighlighted] = React.useState("");

    const setOpen = React.useCallback(
      (next: boolean) => {
        if (next === open) return;
        if (!isControlled) setUncontrolledOpen(next);
        onOpenChange?.(next);
      },
      [open, isControlled, onOpenChange],
    );

    const context = React.useMemo(
      () => ({ open, setOpen, anchorRef, activeId, setActiveId, setHighlighted }),
      [open, setOpen, activeId],
    );

    return (
      <ComboboxContext.Provider value={context}>
        <Popover open={open} onOpenChange={setOpen}>
          <CommandPrimitive
            ref={ref}
            loop={loop}
            vimBindings={vimBindings}
            value={highlighted}
            onValueChange={setHighlighted}
            className={cn("relative w-full", className)}
            {...props}
          >
            {children}
          </CommandPrimitive>
        </Popover>
      </ComboboxContext.Provider>
    );
  },
);
Combobox.displayName = "Combobox";

export interface ComboboxInputProps
  extends Omit<InputProps, "value" | "defaultValue" | "onChange" | "type" | "id"> {
  /** Controlled text of the field. */
  value?: string;
  /** Initial text when uncontrolled. */
  defaultValue?: string;
  /** Called with the new text on every edit. */
  onValueChange?: (value: string) => void;
}

/**
 * The field: the design system's `Input` (same `fieldVariants` look, same
 * `leadingIcon` slot, so a combobox search field is pixel-identical to a plain
 * search `Input`), carrying cmdk's combobox semantics.
 *
 * ARIA — what cmdk emits and what this part corrects (read from cmdk 1.1.1's
 * source, where `Command.Input` hard-codes its attributes):
 * - from cmdk: `role="combobox"`, `aria-autocomplete="list"`,
 *   `aria-controls` → the listbox id, `autocomplete="off"`;
 * - corrected here: `aria-expanded` (cmdk hard-codes `true`; here it is the
 *   popover's real state); `aria-controls` is dropped while the list is
 *   closed (the listbox is not mounted then); `aria-labelledby` (cmdk points
 *   it at its own, empty, hidden label, which would silence your
 *   `aria-label`) is only set when you pass it; and `aria-activedescendant`
 *   comes from `ComboboxList`, which observes the option carrying
 *   `aria-selected="true"`. cmdk's own `aria-activedescendant` stays empty
 *   for the option it highlights by itself when the list opens (observed
 *   with cmdk 1.1.1), so a screen reader heard nothing until the first arrow
 *   key.
 *
 * **Name it** with `aria-label` or `aria-labelledby`. There is no `id` prop:
 * cmdk keeps focus in the field by looking it up under its own id.
 *
 * Keyboard while **closed**: ↓ opens the list; Enter, Home, End and ↑ keep
 * their native text-field meaning (a surrounding form submits on Enter).
 * While **open** cmdk owns ↓/↑/Home/End/Enter, and Enter never submits a
 * form. To act on Enter yourself (e.g. "search everything" when no option is
 * highlighted), handle `onKeyDown` and call `preventDefault()` — cmdk skips
 * a prevented event.
 *
 * Selecting an option does not write its text into the field; set `value` in
 * the item's `onSelect` if your pattern wants that.
 */
const ComboboxInput = React.forwardRef<HTMLInputElement, ComboboxInputProps>(
  (
    { value, defaultValue, onValueChange, onKeyDown, "aria-labelledby": ariaLabelledBy, ...props },
    ref,
  ) => {
    const { open, setOpen, anchorRef, activeId } = useComboboxContext("ComboboxInput");
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
    const isControlled = value !== undefined;
    const text = isControlled ? value : uncontrolledValue;

    const handleValueChange = (next: string) => {
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
      setOpen(true);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || open) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
      }
      // cmdk's root handler calls preventDefault() on these unconditionally —
      // with no list on screen that would only take the keys away from the
      // text field (caret movement, implicit form submission).
      if (["ArrowDown", "ArrowUp", "Enter", "Home", "End"].includes(event.key)) {
        event.stopPropagation();
      }
    };

    // The child's props win over cmdk's in Radix Slot's merge — that is what
    // lets these keys override the attributes `Command.Input` hard-codes.
    // A key present with `undefined` removes cmdk's attribute.
    const ariaOverrides: Record<string, unknown> = {
      "aria-expanded": open,
      "aria-labelledby": ariaLabelledBy,
      "aria-activedescendant": open ? activeId : undefined,
    };
    if (!open) ariaOverrides["aria-controls"] = undefined;

    return (
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="w-full">
          <CommandPrimitive.Input asChild value={text} onValueChange={handleValueChange}>
            <Input ref={ref} {...props} {...ariaOverrides} onKeyDown={handleKeyDown} />
          </CommandPrimitive.Input>
        </div>
      </PopoverAnchor>
    );
  },
);
ComboboxInput.displayName = "ComboboxInput";

export type ComboboxContentProps = React.ComponentPropsWithoutRef<typeof PopoverContent>;

/**
 * The popover panel under the field (portalled, `z-50`). Its width follows
 * the field (`--radix-popper-anchor-width`); a width utility in `className`
 * overrides it. `align` defaults to `start`.
 *
 * It never takes focus: opening does not auto-focus it, closing does not
 * move focus anywhere, a mousedown inside is cancelled so the field keeps
 * focus, and a pointer-down or focus on the field itself does not count as
 * an outside interaction. Radix's `role="dialog"` is removed — the popup's
 * semantics are the listbox inside it.
 */
const ComboboxContent = React.forwardRef<
  React.ComponentRef<typeof PopoverContent>,
  ComboboxContentProps
>(
  (
    {
      className,
      align = "start",
      onOpenAutoFocus,
      onCloseAutoFocus,
      onInteractOutside,
      onMouseDown,
      ...props
    },
    ref,
  ) => {
    const { anchorRef } = useComboboxContext("ComboboxContent");
    return (
      <PopoverContent
        ref={ref}
        align={align}
        role={undefined}
        className={cn("w-[var(--radix-popper-anchor-width)] overflow-hidden p-1", className)}
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event);
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          event.preventDefault();
        }}
        onInteractOutside={(event) => {
          onInteractOutside?.(event);
          const target = event.target;
          if (target instanceof Node && anchorRef.current?.contains(target)) {
            event.preventDefault();
          }
        }}
        onMouseDown={(event) => {
          onMouseDown?.(event);
          event.preventDefault();
        }}
        {...props}
      />
    );
  },
);
ComboboxContent.displayName = "ComboboxContent";

export interface ComboboxListProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.List> {
  /** Accessible name of the listbox. Default "Vorschläge". */
  label?: string;
}

/**
 * The `role="listbox"` (cmdk). Scrolls past 20rem; cmdk scrolls the
 * highlighted option into view.
 *
 * It watches its options (a `MutationObserver` on `aria-selected`, the
 * attribute cmdk renders) for two corrections to cmdk 1.1.1, both observed in
 * jsdom and Chromium rather than derived from cmdk's documentation:
 * - it reports the highlighted option's id to `ComboboxInput`'s
 *   `aria-activedescendant` (cmdk's own id misses its automatic highlight);
 * - when options are rendered but none is highlighted, it highlights the
 *   first enabled one — what cmdk itself does on every later keystroke, but
 *   skips when the first keystroke opens the list and mounts the options in
 *   the same update. Without it Enter did nothing right after the first
 *   character.
 * TODO: the root cause inside cmdk's internal update scheduler is not yet
 * confirmed; drop both corrections if a cmdk release fixes it.
 *
 * While it renders no option at all it is `hidden`: an empty `listbox` is an
 * ARIA error (axe `aria-required-children`) and says nothing useful. That is
 * why `ComboboxEmpty` and `ComboboxLoading` go **next to** the list inside
 * `ComboboxContent`, not into it — inside, they would be hidden with it.
 */
const ComboboxList = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.List>,
  ComboboxListProps
>(({ className, label = "Vorschläge", ...props }, ref) => {
  const { setActiveId, setHighlighted } = useComboboxContext("ComboboxList");
  const listRef = React.useRef<HTMLDivElement>(null);
  const [hasOptions, setHasOptions] = React.useState(false);
  React.useImperativeHandle(ref, () => listRef.current as HTMLDivElement, []);

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const sync = () => {
      setHasOptions(list.querySelector("[cmdk-item]") !== null);
      const active = list.querySelector<HTMLElement>('[cmdk-item][aria-selected="true"]');
      setActiveId(active?.id);
      if (active) return;
      const first = list.querySelector<HTMLElement>('[cmdk-item]:not([aria-disabled="true"])');
      const value = first?.getAttribute("data-value");
      if (value) setHighlighted(value);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-selected", "id"],
    });
    return () => {
      observer.disconnect();
      setActiveId(undefined);
    };
  }, [setActiveId, setHighlighted]);

  return (
    <CommandPrimitive.List
      ref={listRef}
      label={label}
      hidden={!hasOptions}
      className={cn("max-h-80 overflow-x-hidden overflow-y-auto", className)}
      {...props}
    />
  );
});
ComboboxList.displayName = "ComboboxList";

/**
 * A titled group of options. cmdk renders the items in a `role="group"`
 * labelled by the heading (`aria-labelledby`), and in client mode hides the
 * whole group when none of its items match. The heading has `Command`'s
 * group-heading look, inset like the option text (`px-3`, `MenuItem`'s).
 */
const ComboboxGroup = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden text-on-surface [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-on-surface-variant",
      className,
    )}
    {...props}
  />
));
ComboboxGroup.displayName = "ComboboxGroup";

/**
 * One option (`role="option"`, `aria-selected` on the highlighted one — cmdk).
 * Speaks the `MenuItem` vocabulary; the highlight uses its hover surface.
 * `onSelect(value)` fires on click and on Enter, then the list closes. Pass a
 * stable, unique `value` when the visible text is not unique or changes.
 */
const ComboboxItem = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, onSelect, ...props }, ref) => {
  const { setOpen } = useComboboxContext("ComboboxItem");
  return (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        menuItemVariants(),
        "cursor-default rounded-lg select-none",
        "data-[selected=true]:bg-surface-container-high",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60",
        "[&_svg]:size-4",
        className,
      )}
      onSelect={(value) => {
        onSelect?.(value);
        setOpen(false);
      }}
      {...props}
    />
  );
});
ComboboxItem.displayName = "ComboboxItem";

/**
 * Shown when no option is rendered (client mode: nothing matches; server
 * mode: nothing was returned). Place it in `ComboboxContent` next to
 * `ComboboxList`, not inside it (see `ComboboxList`). In server mode render
 * it only once the request has settled, otherwise it shows during loading
 * too.
 */
const ComboboxEmpty = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn("px-3 py-6 text-center text-sm text-on-surface-variant", className)}
    {...props}
  />
));
ComboboxEmpty.displayName = "ComboboxEmpty";

export interface ComboboxLoadingProps
  extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Loading> {
  /** Accessible name of the progress indicator. Default "Wird geladen …". */
  label?: string;
}

/**
 * Server mode's in-flight state (cmdk's `role="progressbar"`, with a spinner).
 * Render it conditionally while your request runs, in `ComboboxContent` next
 * to `ComboboxList` (a progressbar is not a valid listbox child); `children`
 * is the visible text (hidden from assistive tech — `label` is announced).
 */
const ComboboxLoading = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Loading>,
  ComboboxLoadingProps
>(({ className, label = "Wird geladen …", children, ...props }, ref) => (
  <CommandPrimitive.Loading
    ref={ref}
    label={label}
    className={cn(
      "flex items-center justify-center px-3 py-6 text-sm text-on-surface-variant [&>div]:flex [&>div]:items-center [&>div]:gap-2",
      className,
    )}
    {...props}
  >
    <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
    {children}
  </CommandPrimitive.Loading>
));
ComboboxLoading.displayName = "ComboboxLoading";

/**
 * A rule between groups. cmdk hides it while the field has text; pass
 * `alwaysRender` (e.g. in server mode) to keep it.
 */
const ComboboxSeparator = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-outline-variant", className)}
    {...props}
  />
));
ComboboxSeparator.displayName = "ComboboxSeparator";

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxGroup,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxLoading,
  ComboboxSeparator,
};
