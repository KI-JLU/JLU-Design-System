import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarCard, SidebarSelectionBar } from "./sidebar-card";
import { SidebarRailItem } from "./sidebar-rail";
import { SidebarAction } from "./sidebar-action";
import { UiShapeProvider } from "./ui-shape-provider";
import { useUiShape } from "./ui-shape-context";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.uiShape;
});

const card = (props: Partial<React.ComponentProps<typeof SidebarCard>> = {}) => (
  <ul>
    <SidebarCard title="Budget" onOpen={props.onOpen ?? (() => {})} {...props} />
  </ul>
);

// Oracles: WAI-ARIA roles as testing-library resolves them, and the props
// handed in — nothing computed by the component itself.
describe("SidebarCard", () => {
  it("opens on a click anywhere on the card, but not on its own controls", async () => {
    const onOpen = vi.fn();
    const onSelect = vi.fn();
    const onSelectedChange = vi.fn();
    render(card({
      onOpen,
      selectable: true,
      selectLabel: "Auswählen",
      onSelectedChange,
      actionsLabel: "Aktionen für",
      actions: [{ label: "Umbenennen", onSelect }],
    }));

    await userEvent.click(screen.getByRole("listitem"));
    expect(onOpen).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("checkbox", { name: "Auswählen Budget" }));
    await userEvent.click(screen.getByRole("button", { name: "Aktionen für Budget" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Umbenennen" }));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("in selection mode toggles instead of opening and hides the menu", async () => {
    const onOpen = vi.fn();
    const onSelectedChange = vi.fn();
    render(card({
      onOpen, selectable: true, selectionMode: true, selected: false, onSelectedChange,
      actions: [{ label: "Umbenennen", onSelect: () => {} }],
    }));
    expect(screen.queryByRole("button", { name: /Budget$/ , hidden: false })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Budget" }));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("takes its shape from the app-wide Style unless told otherwise", () => {
    window.localStorage.setItem("ui-shape", "pill");
    render(
      <UiShapeProvider>
        {card()}
        <ul><SidebarCard title="Fix" shape="rounded" onOpen={() => {}} /></ul>
      </UiShapeProvider>,
    );
    const [fromContext, fixed] = screen.getAllByRole("listitem");
    expect(fromContext).toHaveAttribute("data-shape", "pill");
    expect(fixed).toHaveAttribute("data-shape", "rounded");
  });
});

/**
 * The provider on its own, without a switch component. `UiShapeToggle` was
 * the switch until it was removed (KI-846); the user-facing control is now
 * `AppearanceSettings`' Style row (covered in `appearance-settings.test.tsx`).
 * This probe is the smallest consumer of the context: it prints the shape and
 * requests `pill`.
 *
 * Oracles: the `<html data-ui-shape>` attribute and the `ui-shape`
 * localStorage key, both documented outputs of the provider that the probe
 * never writes itself.
 */
function ShapeProbe() {
  const { shape, setShape } = useUiShape();
  return (
    <button type="button" onClick={() => setShape("pill")}>
      {shape}
    </button>
  );
}

describe("UiShapeProvider", () => {
  it("defaults to rounded, mirrors to <html>, and remembers the switch", async () => {
    const { unmount } = render(<UiShapeProvider><ShapeProbe /></UiShapeProvider>);
    expect(document.documentElement.dataset.uiShape).toBe("rounded");
    expect(screen.getByRole("button")).toHaveTextContent("rounded");

    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.uiShape).toBe("pill");
    expect(window.localStorage.getItem("ui-shape")).toBe("pill");
    unmount();

    // A fresh mount reads the stored choice back.
    delete document.documentElement.dataset.uiShape;
    render(<UiShapeProvider><ShapeProbe /></UiShapeProvider>);
    expect(screen.getByRole("button")).toHaveTextContent("pill");
    expect(document.documentElement.dataset.uiShape).toBe("pill");
  });
});

describe("SidebarRailItem / SidebarSelectionBar", () => {
  it("marks the open entry and shows a type label when given", () => {
    render(<><SidebarRailItem aria-label="a.pdf" iconText="PDF" active /><SidebarRailItem aria-label="b" /></>);
    expect(screen.getByRole("button", { name: "a.pdf" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "a.pdf" })).toHaveTextContent("PDF");
    expect(screen.getByRole("button", { name: "b" })).not.toHaveAttribute("aria-current");
  });

  it("names its count and cancels", async () => {
    const onCancel = vi.fn();
    render(<SidebarSelectionBar aria-label="Auswahl" countLabel="2 ausgewählt" onCancel={onCancel} />);
    expect(screen.getByRole("toolbar", { name: "Auswahl" })).toHaveTextContent("2 ausgewählt");
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("SidebarScrollArea", () => {
  // Oracle: stubbed geometry — a classic scrollbar is offsetWidth − clientWidth
  // (here 300 − 285 = 15px), an overlay one is 0 (jsdom's default).
  it("takes the scrollbar's width out of the right gutter", async () => {
    const { SidebarScrollArea } = await import("./sidebar-scroll-area");
    const offset = vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(300);
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(285);
    render(<SidebarScrollArea data-testid="area" gutter={16}><p>x</p></SidebarScrollArea>);
    expect(screen.getByTestId("area").style.paddingRight).toBe("1px");
    offset.mockRestore();
    client.mockRestore();
  });

  it("keeps the full gutter when there is no scrollbar", async () => {
    const { SidebarScrollArea } = await import("./sidebar-scroll-area");
    render(<SidebarScrollArea data-testid="area" gutter={16}><p>x</p></SidebarScrollArea>);
    expect(screen.getByTestId("area").style.paddingRight).toBe("16px");
  });
});

describe("useScrollFade (via SidebarScrollArea)", () => {
  // Oracle: stubbed scroll geometry — 100px visible of 300px content.
  const geometry = (top: number) => {
    const spies = [
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(300),
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100),
      vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockReturnValue(top),
    ];
    return () => spies.forEach((s) => s.mockRestore());
  };

  it("fades only the bottom at the top, both edges mid-way, none without overflow", async () => {
    const { SidebarScrollArea } = await import("./sidebar-scroll-area");
    let restore = geometry(0);
    const { unmount } = render(<SidebarScrollArea data-testid="area"><p>x</p></SidebarScrollArea>);
    expect(screen.getByTestId("area")).toHaveAttribute("data-scroll-fade", "bottom");
    restore();
    unmount();

    restore = geometry(50);
    const second = render(<SidebarScrollArea data-testid="area"><p>x</p></SidebarScrollArea>);
    expect(screen.getByTestId("area")).toHaveAttribute("data-scroll-fade", "top bottom");
    restore();
    second.unmount();

    // jsdom default geometry: nothing to scroll → no mask.
    render(<SidebarScrollArea data-testid="area"><p>x</p></SidebarScrollArea>);
    expect(screen.getByTestId("area")).not.toHaveAttribute("data-scroll-fade");
  });
});

describe("SidebarPanel", () => {
  // Oracle: the props handed in; WAI-ARIA heading role.
  it("puts title and head in the fixed part, children in the scroll area", async () => {
    const { SidebarPanel } = await import("./sidebar-panel");
    render(
      <SidebarPanel title="Verlauf" head={<button type="button">Neuer Chat</button>}>
        <p>Liste</p>
      </SidebarPanel>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Verlauf" });
    const head = heading.closest('[data-slot="sidebar-panel-head"]');
    expect(head).toContainElement(screen.getByRole("button", { name: "Neuer Chat" }));
    const scroller = screen.getByText("Liste").closest('[data-slot="sidebar-scroll-area"]');
    expect(scroller).not.toBeNull();
    expect(head).not.toContainElement(screen.getByText("Liste"));
  });
});

describe("SidebarPanel without title, head or nav", () => {
  // Oracle: the props handed in and DOM containment — which slots a test
  // passes decides whether a head exists, not anything the component computes.
  // No class is asserted: the head-less panel's 16px top inset is a layout
  // fact, and its oracle is Chromium's layout boxes in
  // `Templates/AppShellLayout → CollapsedRailKeepsVerticalPositions` (KI-852).
  const headOf = (container: HTMLElement) =>
    container.querySelector('[data-slot="sidebar-panel-head"]');

  it("renders no head, and the children still go into the scroll area", async () => {
    const { SidebarPanel } = await import("./sidebar-panel");
    const { container } = render(
      <SidebarPanel>
        <button type="button">Übersicht</button>
      </SidebarPanel>,
    );
    expect(headOf(container)).toBeNull();
    const row = screen.getByRole("button", { name: "Übersicht" });
    expect(row.closest('[data-slot="sidebar-scroll-area"]')).not.toBeNull();
    expect(row.closest('[data-slot="sidebar-panel"]')).toBe(container.firstElementChild);
  });

  it("treats a head React renders as nothing as not passed", async () => {
    const { SidebarPanel } = await import("./sidebar-panel");
    for (const head of [null, undefined, false, ""]) {
      const { container, unmount } = render(<SidebarPanel head={head}>x</SidebarPanel>);
      expect(headOf(container), `head=${JSON.stringify(head)}`).toBeNull();
      unmount();
    }
  });

  it("keeps no head for a titleAside alone — it only renders beside a title", async () => {
    const { SidebarPanel } = await import("./sidebar-panel");
    const { container } = render(<SidebarPanel titleAside={<span>3</span>}>x</SidebarPanel>);
    expect(headOf(container)).toBeNull();
  });

  it("renders the head as soon as any one of title, head or nav is passed", async () => {
    const { SidebarPanel } = await import("./sidebar-panel");
    const cases = [
      { name: "title", props: { title: "Verlauf" }, marker: () => screen.getByRole("heading", { name: "Verlauf" }) },
      { name: "head", props: { head: <button type="button">Neu</button> }, marker: () => screen.getByRole("button", { name: "Neu" }) },
      { name: "nav", props: { nav: <button type="button">Start</button> }, marker: () => screen.getByRole("button", { name: "Start" }) },
    ];
    for (const { name, props, marker } of cases) {
      const { container, unmount } = render(<SidebarPanel {...props}>x</SidebarPanel>);
      const head = headOf(container);
      expect(head, name).not.toBeNull();
      expect(head, name).toContainElement(marker());
      unmount();
    }
  });
});

describe("HoverCardContent", () => {
  // Oracle: DOM containment — a portaled card is not a descendant of the
  // scroll container that holds its trigger.
  it("renders outside its trigger's scroll container", async () => {
    const { HoverCard, HoverCardContent, HoverCardTrigger } = await import("./hover-card");
    render(
      <div data-testid="scroller" style={{ overflow: "auto" }}>
        <HoverCard open>
          <HoverCardTrigger>row</HoverCardTrigger>
          <HoverCardContent>preview</HoverCardContent>
        </HoverCard>
      </div>,
    );
    expect(screen.getByText("preview")).toBeInTheDocument();
    expect(screen.getByTestId("scroller")).not.toContainElement(screen.getByText("preview"));
  });
});

describe("SidebarPanel nav slot", () => {
  // Oracle: the props handed in and DOM containment.
  it("keeps nav rows fixed in the head and the list in the scroll area", async () => {
    const { SidebarPanel } = await import("./sidebar-panel");
    render(
      <SidebarPanel title="Arbeitsbereich" nav={<button type="button">Übersicht</button>}>
        <p>Karte</p>
      </SidebarPanel>,
    );
    const nav = screen.getByRole("button", { name: "Übersicht" }).closest('[data-slot="sidebar-panel-nav"]');
    expect(nav?.closest('[data-slot="sidebar-panel-head"]')).not.toBeNull();
    expect(screen.getByText("Karte").closest('[data-slot="sidebar-scroll-area"]')).not.toBeNull();
  });
});

// Oracle: the shared row inset (sidebarRowInsetX) — the action row must carry
// the same side padding as a card of the same shape, so both icons share an axis.
describe("SidebarAction", () => {
  it("left-aligns its label and uses the card rows' side inset per shape", () => {
    const { rerender } = render(<SidebarAction icon={<svg />} shape="pill">Neuer Chat</SidebarAction>);
    const button = screen.getByRole("button", { name: "Neuer Chat" });
    expect(button).toHaveClass("justify-start", "px-[7px]", "border");
    rerender(<SidebarAction icon={<svg />} shape="rounded">Neuer Chat</SidebarAction>);
    expect(button).toHaveClass("px-3");
    expect(button).not.toHaveClass("justify-center");
  });
});
