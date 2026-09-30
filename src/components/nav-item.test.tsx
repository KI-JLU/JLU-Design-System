import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavItem } from "./nav-item";
import { SidePanel } from "./side-panel";

/**
 * A row inside a `SidePanel` in the given state. That is the only way to reach
 * the collapsed form, since it is not a consumer prop. The row is mounted where
 * `AppShellLayout` mounts its nav: in the pane body while the pane is open, in
 * `collapsedPreview` (the visible part of the 60px rail) while it is collapsed.
 * The collapsed state reaches the row on `SidebarCollapsedContext`, which
 * `SidePanel` publishes as `!isOpen`. Until KI-846 this host was the legacy
 * 80px `Sidebar`, which published the same context.
 */
const inSidePanel = (collapsed: boolean, row: React.ReactNode) =>
  render(
    <SidePanel
      side="left"
      isOpen={!collapsed}
      width={256}
      onExpand={() => {}}
      onCollapse={() => {}}
      expandLabel="Expand navigation"
      collapseLabel="Collapse navigation"
      collapsedPreview={collapsed ? row : undefined}
    >
      {collapsed ? null : row}
    </SidePanel>,
  );

describe("NavItem", () => {
  it("marks the active item as the current page", () => {
    render(<NavItem active>Agenten</NavItem>);
    const item = screen.getByRole("button", { name: "Agenten" });
    expect(item).toHaveAttribute("aria-current", "page");
    expect(item).toHaveClass("bg-primary");
  });

  it("renders inactive items without aria-current", () => {
    render(<NavItem>Agenten</NavItem>);
    const item = screen.getByRole("button", { name: "Agenten" });
    expect(item).not.toHaveAttribute("aria-current");
    expect(item).toHaveClass("text-on-surface-variant");
  });

  it("renders the child element when asChild is set", () => {
    render(
      <NavItem asChild active>
        <a href="/statistiken">Statistiken</a>
      </NavItem>,
    );
    const link = screen.getByRole("link", { name: "Statistiken" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveClass("bg-primary");
  });

  it("uses the nested sizing for level=sub", () => {
    render(<NavItem level="sub">Unterpunkt</NavItem>);
    expect(screen.getByRole("button")).toHaveClass("px-3", "py-2");
  });

  /**
   * Oracles here: the accname spec as implemented by `getByRole({ name })`
   * (an `aria-label` overrides the contents), and the card's rule that a row
   * only collapses when it was told its own name. Whether the hide utility
   * actually resolves to `display: none` is asserted in `nav-item.stories.tsx`
   * (`CollapsedInRail`), where Tailwind is compiled — jsdom loads no CSS.
   */
  describe("inside a collapsed SidePanel", () => {
    it("labels the row from `label` and hides its non-svg children", () => {
      inSidePanel(
        true,
        <NavItem label="Team">
          <svg aria-hidden />
          <span>Team</span>
        </NavItem>,
      );
      const item = screen.getByRole("button", { name: "Team" });
      expect(item).toHaveAttribute("aria-label", "Team");
      expect(item).toHaveClass("justify-center", "[&>*:not(svg)]:hidden");
    });

    it("leaves a row without `label` exactly as it was", () => {
      inSidePanel(
        true,
        <NavItem>
          <svg aria-hidden />
          <span>Ohne Label</span>
        </NavItem>,
      );
      const item = screen.getByRole("button", { name: "Ohne Label" });
      expect(item).not.toHaveAttribute("aria-label");
      expect(item).not.toHaveClass("justify-center");
      // …and no tooltip was wrapped around it.
      expect(item).not.toHaveAttribute("aria-describedby");
      expect(item).not.toHaveAttribute("data-state");
    });

    it("collapses an asChild row too — the class and the name land on the <a>", () => {
      inSidePanel(
        true,
        <NavItem asChild label="Statistiken" active>
          <a href="/statistiken">
            <svg aria-hidden />
            <span>Statistiken</span>
          </a>
        </NavItem>,
      );
      const link = screen.getByRole("link", { name: "Statistiken" });
      expect(link).toHaveAttribute("aria-label", "Statistiken");
      expect(link).toHaveAttribute("aria-current", "page");
      expect(link).toHaveClass("[&>*:not(svg)]:hidden");
    });

    /*
      Moved from the deleted `sidebar.test.tsx` (KI-846). Oracles: the APG
      tooltip pattern as Radix implements it (`role="tooltip"`, referenced by
      the trigger's `aria-describedby`), and the accname rule that a
      description does not become the name.
    */
    it("gives a labelled row a tooltip carrying the same text", async () => {
      inSidePanel(
        true,
        <NavItem label="Team">
          <svg aria-hidden />
          <span>Team</span>
        </NavItem>,
      );
      const item = screen.getByRole("button", { name: "Team" });
      await userEvent.hover(item);
      await waitFor(() => expect(item).toHaveAttribute("aria-describedby"));
      const tip = document.getElementById(item.getAttribute("aria-describedby")!);
      expect(tip).toHaveAttribute("role", "tooltip");
      expect(tip).toHaveTextContent("Team");
      expect(screen.getByRole("button", { name: "Team" })).toBe(item);
    });
  });

  it("ignores `label` outside a SidePanel and in an expanded one", () => {
    render(<NavItem label="Team">Team</NavItem>);
    expect(screen.getByRole("button", { name: "Team" })).not.toHaveAttribute("aria-label");

    inSidePanel(false, <NavItem label="Andere">Andere</NavItem>);
    const expanded = screen.getByRole("button", { name: "Andere" });
    expect(expanded).not.toHaveAttribute("aria-label");
    expect(expanded).not.toHaveClass("justify-center");
  });
});
