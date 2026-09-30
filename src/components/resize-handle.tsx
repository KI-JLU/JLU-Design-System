import * as React from "react";
import { cn } from "../lib/utils";
import { resizeHandleVariants } from "./resize-handle-variants";

/**
 * Accessible drag handle for resizing a neighbouring pane (`SidePanel`).
 *
 * **Ownership — decided, do not split:** the handle owns the *interaction*,
 * the consumer owns the *value*. Every pointer move and every key press is
 * clamped here and reported through the single `onValueChange` callback, so
 * the consumer stores one number and nothing else; the transient "is being
 * dragged" flag stays internal (it is interaction state, like `:hover`, not
 * data). `onResizeStart` / `onResizeEnd` are *notifications* — use them to
 * suspend an expensive re-layout while dragging, never to run a second drag
 * loop. A consumer-side pointermove listener plus this one is the failure mode
 * this component exists to remove.
 *
 * **`side` is the side of the pane being resized**, and it flips the key
 * direction: a left pane's edge is on its right, so ArrowRight/dragging right
 * makes it wider; a right pane's edge is on its left, so ArrowLeft/dragging
 * right makes it *narrower*. That is the splitter semantics: a key moves the
 * *separator*, and `aria-valuenow` reports the *pane's* size, so the same key
 * raises the value on one side and lowers it on the other. Home/End are
 * side-independent — they are the advertised minimum resp. maximum *value*
 * (`aria-valuemin`/`aria-valuemax`), not a direction.
 *
 * `aria-valuenow` is always inside `[min, max]`: both input paths clamp.
 *
 * **Role — decided (owner, 2026-08): `separator`**, the WAI-ARIA APG "Window
 * Splitter" pattern, which is the pattern for exactly this widget; a focusable
 * separator keeps `tabIndex` and `aria-valuemin`/`-valuemax`/`-valuenow`.
 * `aria-orientation="vertical"` **stays**, and under `separator` it is finally
 * coherent: the attribute describes the orientation of the separator *itself* —
 * a vertical bar between two horizontally adjacent panes — and its default for
 * this role is `horizontal`, so it has to be stated explicitly. Under the
 * previous `slider` role the same attribute named the axis the *value* moves
 * along, which is horizontal here; that mismatch was the original defect.
 *
 * **`controls` — decided (owner card KI-597): the id of the pane root**, i.e.
 * the element whose width `aria-valuenow` reports (in a workspace that is
 * `SidePanel`'s `<aside>`, the named `complementary` landmark carrying the
 * inline width — not the inner body region its collapse toggle points at:
 * the toggle controls that region's *visibility*, this handle controls the
 * pane's *size*, and the two references stay distinct). Rendered as
 * `aria-controls`, which the APG splitter requires on the separator. The prop
 * is optional so a standalone handle stays usable, but without it the widget
 * is not fully APG-conformant — composed by `AppShell` (a column with
 * `AppShellPanel.resize`) it is always set. With `controls`, the pattern is complete: role, focusability,
 * `aria-valuemin`/`-max`/`-now`, label, stated orientation, the required
 * directional arrow keys, plus optional Home/End; of the pattern's optional
 * keys only Enter (collapse — `SidePanel`'s visible button owns that) and F6
 * (pane cycling — app chrome) are deliberately not implemented.
 */
export interface ResizeHandleProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    // Everything the component guarantees is withheld from the spread: without
    // this a consumer could set `aria-valuenow` past `max` and defeat the
    // clamp, or drop `tabIndex` and make the widget unreachable. The render
    // applies these after `{...props}`, so the two agree at compile time and at
    // runtime. `aria-valuetext` stays open on purpose — announcing „320 Pixel"
    // is the consumer's to translate.
    | "onKeyDown"
    | "onPointerDown"
    | "children"
    | "role"
    | "tabIndex"
    | "aria-label"
    | "aria-orientation"
    | "aria-valuemin"
    | "aria-valuemax"
    | "aria-valuenow"
    // Withheld so `controls` is the one way in: a spread `aria-controls` could
    // otherwise dangle (reference a nonexistent id), which is worse than none.
    | "aria-controls"
  > {
  /** Which side the pane being resized sits on — flips the arrow-key direction. */
  side: "left" | "right";
  /** Current pane width in px (`aria-valuenow`). Controlled by the consumer. */
  value: number;
  /** Smallest allowed width in px (`aria-valuemin`, Home). */
  min: number;
  /** Largest allowed width in px (`aria-valuemax`, End). */
  max: number;
  /** Arrow-key increment in px. */
  step?: number;
  /** Accessible name, e.g. „Verlaufsleiste breiter oder schmaler ziehen". */
  label: string;
  /**
   * Id of the pane this handle resizes (`aria-controls`) — the element whose
   * width `aria-valuenow` reports. Required for full APG splitter conformance;
   * optional so a standalone handle stays usable without an id at hand.
   */
  controls?: string;
  /** Receives every clamped width — from keys and from the pointer drag. */
  onValueChange: (value: number) => void;
  /** Pointer drag started (e.g. to suspend an expensive re-layout). */
  onResizeStart?: () => void;
  /** Pointer drag ended or was cancelled. */
  onResizeEnd?: () => void;
}

const ResizeHandle = React.forwardRef<HTMLDivElement, ResizeHandleProps>(
  (
    {
      side,
      value,
      min,
      max,
      step = 10,
      label,
      controls,
      onValueChange,
      onResizeStart,
      onResizeEnd,
      className,
      ...props
    },
    ref,
  ) => {
    const [dragging, setDragging] = React.useState(false);
    // Teardown of the running drag, so an unmount mid-drag cannot leave
    // window listeners behind.
    const endDragRef = React.useRef<(() => void) | null>(null);
    React.useEffect(() => () => endDragRef.current?.(), []);

    const clamp = (n: number) => Math.min(max, Math.max(min, n));
    // +1: moving right grows a left pane. -1: moving right shrinks a right pane.
    const grow = side === "left" ? 1 : -1;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      let next: number;
      switch (event.key) {
        // The splitter pattern assigns ArrowLeft/ArrowRight to a vertical
        // separator — those are the axis this bar actually moves along.
        // ArrowUp/ArrowDown are kept as aliases, mirrored per side exactly like
        // them: one widget, one behaviour, whichever axis the user reaches for.
        // The pattern gives the vertical keys no other meaning on a vertical
        // splitter, so the alias is a superset of it, not a contradiction.
        case "ArrowRight":
        case "ArrowUp":
          next = value + grow * step;
          break;
        case "ArrowLeft":
        case "ArrowDown":
          next = value - grow * step;
          break;
        case "Home":
          next = min;
          break;
        case "End":
          next = max;
          break;
        default:
          return;
      }
      event.preventDefault();
      const clamped = clamp(next);
      if (clamped !== value) onValueChange(clamped);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      // Keep the drag from turning into a text selection — which also
      // suppresses the default focus, so focus is moved explicitly: after
      // dragging, the arrow keys have to keep working.
      event.preventDefault();
      event.currentTarget.focus();
      const startX = event.clientX;
      const startValue = value;
      // Reported inside the drag closure, not read from props: `value` is a
      // prop of the render that started the drag and goes stale on the first
      // move, which would swallow a move back to the starting width.
      let last = startValue;

      const onMove = (moveEvent: PointerEvent) => {
        const next = clamp(startValue + grow * (moveEvent.clientX - startX));
        if (next === last) return;
        last = next;
        onValueChange(next);
      };
      const onEnd = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        endDragRef.current = null;
        setDragging(false);
        onResizeEnd?.();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
      endDragRef.current = onEnd;
      setDragging(true);
      onResizeStart?.();
    };

    return (
      <div
        ref={ref}
        className={cn(resizeHandleVariants({ dragging }), className)}
        {...props}
        /* After the spread on purpose: the type-level Omit above states these
           are ours, and this makes it true at runtime too (a JS consumer, or a
           cast, cannot smuggle an out-of-range aria-valuenow past the clamp). */
        role="separator"
        /* Not the default for `separator` (that is `horizontal`) and not
           redundant: this is the orientation of the bar itself. */
        aria-orientation="vertical"
        aria-label={label}
        /* `undefined` renders no attribute — an absent reference, never a
           dangling one; a spread `aria-controls` is overridden here too. */
        aria-controls={controls}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamp(value)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
      />
    );
  },
);
ResizeHandle.displayName = "ResizeHandle";

export { ResizeHandle };
