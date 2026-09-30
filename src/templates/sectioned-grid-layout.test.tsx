import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShellLayout } from "./app-shell-layout";
import { gridVariants } from "../components/grid-variants";
import { NavItem } from "../components/nav-item";
import { ThemeProvider } from "../theme/ThemeContext";
import { SectionedGridLayout, type SectionedGridSection } from "./sectioned-grid-layout";

/**
 * Oracles used here — every one of them outside this template:
 *
 * 1. **ARIA landmark roles as HTML-AAM defines them** — `section` with an
 *    accessible name is `region`, `section` *without* one is `generic` (no
 *    landmark), `main` is `main`, `nav` is `navigation`. Testing Library
 *    computes those roles through aria-query + dom-accessibility-api and never
 *    reads our class names, so „the right areas are on screen" is checkable
 *    without asserting our own output.
 * 2. **The HTML spec's one-`main` rule** — „a document must not have more than
 *    one `main` element that does not have the hidden attribute". This
 *    template is documented to nest inside `AppShellLayout`, whose `children`
 *    already sit in a `<main>`, so it must claim none for itself.
 * 3. **The WAI-ARIA / APG disclosure contract** — the trigger carries
 *    `aria-expanded`, and `aria-controls` is an IDREF that must resolve to an
 *    element **in the same document**. The tests therefore resolve the
 *    attribute with `document.getElementById` and assert the resolved element
 *    *contains* the section body: a dangling or wrong reference passes a mere
 *    presence check while announcing nothing.
 * 4. **The accessible-name-from-content algorithm** (accname), implemented by
 *    dom-accessibility-api — used to check that the count reaches the
 *    trigger's name and that `aria-hidden` decoration does not.
 * 5. **The source implementation** `KbAccordion.tsx` / `HomeView.tsx` in
 *    JustRAG, which this template generalizes: the body is **unmounted** while
 *    collapsed (its discovery panel's fetch hangs off mount, so expanding is
 *    what re-reads the catalog), the header action is a **sibling** of the
 *    trigger rather than inside it, the count sits inside the trigger, and the
 *    „create" tile is the **first cell of the same grid**. Those are external
 *    behaviours this template is required to reproduce, not choices made by
 *    the code under test.
 * 6. **The DOM spec's `compareDocumentPosition` and parent relationship** —
 *    used instead of our class names to state „same grid, create cell first"
 *    and „the free-form body is rendered raw, with no `Grid` around it".
 * 7. **The controlled-component contract** `SidePanel`/`AppShell`
 *    established in this repo: the template owns no state, so a click reports
 *    the requested value and nothing on screen changes until the consumer
 *    re-renders.
 * 8. **`Grid`'s own variant map** (`gridVariants`, `grid-variants.ts`) — the
 *    expected class set for a column count is read from the primitive, not
 *    written out here, so „the `cols` prop reaches `Grid`" is checkable without
 *    restating a breakpoint ladder this template must never own.
 * 9. **WAI-ARIA's rule for decorative graphics** — an icon that carries no
 *    information is removed from the accessibility tree with
 *    `aria-hidden="true"`. Asserted as the attribute, because the *name* it
 *    would otherwise pollute is unchanged either way: an `<svg>` without a
 *    title contributes no text, so a name check cannot see this at all.
 *
 * This template needs **no** `matchMedia` stub of its own: it renders one tree
 * at every viewport (`Grid` owns the column collapse), so there is no viewport
 * branch to exercise — and no second breakpoint to get wrong. The one stub
 * below belongs to `ThemeProvider` (it reads `prefers-color-scheme`, and jsdom
 * 29 does not implement `matchMedia`), which the `AppShellLayout` nesting test
 * has to mount.
 */

const noop = () => {};

/** See the oracle note: this is `ThemeProvider`'s dependency, not ours. */
function stubMatchMedia(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    // The viewport query answers „desktop" so the shell renders its wide
    // arrangement; `prefers-color-scheme` (ThemeProvider's) still answers „no".
    matches: query === "(min-width: 64rem)",
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Open section with two cells and a create tile. */
function alpha(onOpenChange: (isOpen: boolean) => void = noop): SectionedGridSection {
  return {
    id: "alpha",
    title: "Alpha",
    count: 2,
    isOpen: true,
    onOpenChange,
    createCell: <div>Neu anlegen</div>,
    items: (
      <>
        <div>Karte A</div>
        <div>Karte B</div>
      </>
    ),
  };
}

/** Collapsed section, same body. */
function beta(onOpenChange: (isOpen: boolean) => void = noop): SectionedGridSection {
  return {
    id: "beta",
    title: "Beta",
    isOpen: false,
    onOpenChange,
    items: <div>Karte C</div>,
  };
}

function panelOf(trigger: HTMLElement): HTMLElement {
  const id = trigger.getAttribute("aria-controls");
  // Oracle 3: the IDREF has to resolve. `document.getElementById` is the
  // resolution a screen reader performs — not a check that the attribute
  // merely exists.
  expect(id).toBeTruthy();
  const panel = document.getElementById(id as string);
  expect(panel).not.toBeNull();
  return panel as HTMLElement;
}

describe("SectionedGridLayout — landmarks and nesting", () => {
  it("is the app shell's page content, inside its single <main>", () => {
    stubMatchMedia();
    render(
      <ThemeProvider>
        <AppShellLayout
          logo={<span>Marke</span>}
          pageLabel="Sammlungen"
          navLabel="Hauptnavigation"
          nav={<NavItem active>Übersicht</NavItem>}
          // Required since 0.30.0 and not what this test is about: the
          // controlled left column plus the narrow-screen tab table.
          leftOpen
          onLeftOpenChange={noop}
          mobileTabs={[]}
          activeMobileTab="page"
          onMobileTabChange={noop}
          mobileTabBarLabel="Bereichswechsel"
        >
          <SectionedGridLayout label="Sammlungen" sections={[alpha()]} />
        </AppShellLayout>
      </ThemeProvider>,
    );

    // Oracles 1 + 2: exactly one `main` in the document, and this template's
    // own region lives inside it with its content.
    const mains = screen.getAllByRole("main");
    expect(mains).toHaveLength(1);
    const region = screen.getByRole("region", { name: "Sammlungen" });
    expect(mains[0]).toContainElement(region);
    expect(region).toContainElement(screen.getByText("Karte A"));
    // The shell's navigation is still the only one.
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("claims no <main> of its own when rendered standalone", () => {
    const { container } = render(
      <SectionedGridLayout label="Sammlungen" sections={[alpha()]} />,
    );

    // Oracle 2: a second `main` is what this template would produce if it
    // claimed the element instead of being page content.
    expect(container.querySelectorAll("main")).toHaveLength(0);
    expect(screen.getByRole("region", { name: "Sammlungen" })).toBeInTheDocument();
  });

  it("contributes exactly one landmark, whatever the sections contain", () => {
    render(
      <SectionedGridLayout
        label="Sammlungen"
        sections={[
          alpha(),
          beta(),
          { id: "gamma", title: "Gamma", isOpen: true, onOpenChange: noop, emptyState: "Leer." },
        ]}
      />,
    );

    // Oracle 1 + APG's landmark-proliferation note: the open disclosure panels
    // are deliberately NOT `region`s, so three sections add no landmarks.
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });

  it("gives every section one level-2 heading, and the page title the only h1", () => {
    const { unmount } = render(
      <SectionedGridLayout label="Sammlungen" title="Sammlungen" sections={[alpha(), beta()]} />,
    );

    // Oracle 1 (HTML-AAM heading mapping) + APG's accordion markup, which puts
    // the trigger inside the heading so the section stays heading-navigable.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    unmount();

    render(<SectionedGridLayout label="Sammlungen" sections={[alpha(), beta()]} />);
    // No `title` → no PageHeader → no h1, and the sections are untouched.
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });
});

describe("SectionedGridLayout — disclosure contract", () => {
  it("points aria-controls at an element that actually contains the body", () => {
    render(<SectionedGridLayout label="Sammlungen" sections={[alpha()]} />);

    const trigger = screen.getByRole("button", { name: /Alpha/ });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Oracle 3: resolve the reference, then require containment. „Attribute is
    // present" would also pass with a dangling id.
    const panel = panelOf(trigger);
    expect(panel).toContainElement(screen.getByText("Karte A"));
    expect(panel).toContainElement(screen.getByText("Karte B"));
    // Oracle 4: the count is part of the trigger's name, the chevron is not,
    // and nothing else is. Anchored regex rather than a literal because the
    // accname algorithm inserts a separator per *rendered* display type: a
    // real browser reads „Alpha 2" (the Badge is `inline-flex`), jsdom applies
    // no CSS and concatenates to „Alpha2". The claim being made — title and
    // count, nothing more — is the same either way.
    expect(trigger).toHaveAccessibleName(/^Alpha\s*2$/);
    // Oracle 9: and the reason the chevron is absent from that name is the
    // attribute, not luck — an `<svg>` with no title contributes no text
    // either way, so the name check above cannot guard this. `alpha()` passes
    // no `icon`, so the trigger's only svg is the template's own chevron.
    const chevron = trigger.querySelector("svg");
    expect(chevron).not.toBeNull();
    expect(chevron).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the referenced element while collapsed but unmounts the body", () => {
    render(<SectionedGridLayout label="Sammlungen" sections={[beta()]} />);

    const trigger = screen.getByRole("button", { name: "Beta" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Oracle 3: a reference that only exists while open is a dangling IDREF —
    // the element stays, its content does not.
    const panel = panelOf(trigger);
    expect(panel).toBeEmptyDOMElement();
    // Oracle 5: the source implementation unmounts the collapsed body, which
    // is what makes expanding a section re-read its data.
    expect(screen.queryByText("Karte C")).not.toBeInTheDocument();
  });

  it("reports the requested state and changes nothing by itself", async () => {
    const onOpenChange = vi.fn();
    render(<SectionedGridLayout label="Sammlungen" sections={[alpha(onOpenChange)]} />);

    const trigger = screen.getByRole("button", { name: /Alpha/ });
    await userEvent.click(trigger);

    // Oracle 7: the flipped value goes out …
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // … and nothing changes here until the consumer re-renders with it.
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Karte A")).toBeInTheDocument();
  });

  it("asks to open a collapsed section", async () => {
    const onOpenChange = vi.fn();
    render(<SectionedGridLayout label="Sammlungen" sections={[beta(onOpenChange)]} />);

    await userEvent.click(screen.getByRole("button", { name: "Beta" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("keeps the header action out of the trigger", async () => {
    const onOpenChange = vi.fn();
    const onAction = vi.fn();
    render(
      <SectionedGridLayout
        label="Sammlungen"
        sections={[
          {
            id: "alpha",
            title: "Alpha",
            isOpen: true,
            onOpenChange,
            headerAction: (
              <button type="button" onClick={onAction}>
                Neu
              </button>
            ),
            items: <div>Karte A</div>,
          },
        ]}
      />,
    );

    // Oracle 5: the source implementation renders the header action as a
    // sibling of the trigger. Nested buttons are invalid HTML, and an action
    // that also toggles the section is a trap.
    await userEvent.click(screen.getByRole("button", { name: "Neu" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("gives two instances of the template disjoint element ids", () => {
    render(
      <>
        <SectionedGridLayout label="Erste" sections={[alpha(), beta()]} />
        <SectionedGridLayout label="Zweite" sections={[alpha(), beta()]} />
      </>,
    );

    const ids = screen
      .getAllByRole("button")
      .map((trigger) => trigger.getAttribute("aria-controls"));
    expect(ids).toHaveLength(4);
    // Oracle: the HTML spec's uniqueness requirement for `id`. The section ids
    // come from the consumer and repeat across instances, so the template has
    // to add a per-instance prefix.
    expect(new Set(ids).size).toBe(4);
    for (const id of ids) {
      expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
    }
  });
});

describe("SectionedGridLayout — the three body shapes", () => {
  it("puts the create cell first, in the same grid as the items", () => {
    render(<SectionedGridLayout label="Sammlungen" sections={[alpha()]} />);

    const create = screen.getByText("Neu anlegen");
    const first = screen.getByText("Karte A");
    // Oracle 6 + 5: same parent means „one grid, not a separate row above it",
    // and DOCUMENT_POSITION_FOLLOWING means the create tile comes first — the
    // position the source implementation uses.
    expect(create.parentElement).toBe(first.parentElement);
    expect(
      create.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders an empty state inside the panel instead of a grid", () => {
    render(
      <SectionedGridLayout
        label="Sammlungen"
        sections={[
          { id: "gamma", title: "Gamma", isOpen: true, onOpenChange: noop, emptyState: "Leer." },
        ]}
      />,
    );

    const panel = panelOf(screen.getByRole("button", { name: "Gamma" }));
    // Oracle 6: „instead of a grid" is a parent-relationship claim. Containment
    // alone would also hold with a `Grid` wrapped around the empty state, which
    // is exactly the shape this section must not have.
    expect(screen.getByText("Leer.").parentElement).toBe(panel);
  });

  it("hands the cols prop to Grid, and defaults it to 3", () => {
    const { unmount } = render(
      <SectionedGridLayout label="Sammlungen" cols={4} sections={[alpha()]} />,
    );

    // Oracle 8: the expected classes come from `Grid`'s variant map. 4 is
    // deliberately not the default, so a hardcoded column count fails here too.
    const grid = screen.getByText("Karte A").parentElement as HTMLElement;
    expect(grid).toHaveClass(...gridVariants({ cols: 4 }).split(" "));
    unmount();

    // The documented default — untested until now, and public API.
    render(<SectionedGridLayout label="Sammlungen" sections={[alpha()]} />);
    const defaultGrid = screen.getByText("Karte A").parentElement as HTMLElement;
    expect(defaultGrid).toHaveClass(...gridVariants({ cols: 3 }).split(" "));
  });

  it("renders a free-form body raw — the panel is its direct parent", () => {
    render(
      <SectionedGridLayout
        label="Sammlungen"
        sections={[
          {
            id: "delta",
            title: "Delta",
            isOpen: true,
            onOpenChange: noop,
            body: <div data-testid="panel-inhalt">Katalog</div>,
          },
        ]}
      />,
    );

    const panel = panelOf(screen.getByRole("button", { name: "Delta" }));
    // Oracle 6: „no Grid around it" is a parent-relationship claim, not a
    // class-name claim. With a grid wrapper this parent would be the grid.
    expect(screen.getByTestId("panel-inhalt").parentElement).toBe(panel);
  });
});
