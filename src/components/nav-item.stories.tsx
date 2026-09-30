import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { ChevronDown, LayoutDashboard, Settings, Users } from "lucide-react";
import { NavItem } from "./nav-item";
import { SidePanel } from "./side-panel";

const meta = {
  title: "Components/NavItem",
  component: NavItem,
  argTypes: {
    level: { control: "select", options: ["top", "sub"] },
    active: { control: "boolean" },
    asChild: { control: false },
  },
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    children: (
      <>
        <LayoutDashboard width="1em" height="1em" aria-hidden />
        <span>Übersicht</span>
      </>
    ),
    active: false,
  },
};

/** Die komplette Sidebar-Navigation, 1:1 wie in den Apps. */
export const SidebarExample: Story = {
  render: () => (
    <nav className="flex w-64 flex-col gap-2 rounded-xl bg-surface-container-low border border-outline-variant p-4">
      <NavItem>
        <LayoutDashboard width="1em" height="1em" aria-hidden />
        <span>Übersicht</span>
      </NavItem>
      <NavItem active>
        <Users width="1em" height="1em" aria-hidden />
        <span>Team</span>
        <ChevronDown width="1em" height="1em" aria-hidden className="ml-auto" />
      </NavItem>
      <div className="ml-4 flex flex-col gap-1 border-l border-outline-variant pl-3">
        <NavItem level="sub" active>
          <Users width="1em" height="1em" aria-hidden />
          <span className="truncate">Mitglieder</span>
        </NavItem>
        <NavItem level="sub">
          <Users width="1em" height="1em" aria-hidden />
          <span className="truncate">Rollen</span>
        </NavItem>
      </div>
      <NavItem>
        <Settings width="1em" height="1em" aria-hidden />
        <span>Einstellungen</span>
      </NavItem>
    </nav>
  ),
};

/** Mit asChild rendert NavItem einen Router-Link statt eines Buttons. */
export const AsLink: Story = {
  render: () => (
    <NavItem asChild active className="w-64">
      <a href="#uebersicht">
        <LayoutDashboard width="1em" height="1em" aria-hidden />
        <span>Übersicht</span>
      </a>
    </NavItem>
  ),
};

/**
 * **Collapsed, in the 60px rail.** A row with `label`, inside a collapsed
 * `SidePanel`'s `collapsedPreview`, which is where `AppShellLayout` moves its
 * nav when the column collapses. The row shows its icon only; its name is the
 * `aria-label`, and hovering it shows a tooltip with the same text.
 *
 * The `play` function checks what jsdom cannot: that the arbitrary variant
 * `[&>*:not(svg)]:hidden` really compiles to `display: none`, and that the
 * icon-only row fits inside the rail and sits on its axis. This check lived in
 * the legacy `Sidebar`'s `Collapsed` story until that component was removed
 * (KI-846). Oracles: the browser's computed style, and the rail's own
 * bounding box measured in the same layout. No expected pixel value is
 * written here.
 */
export const CollapsedInRail: Story = {
  render: () => (
    <div className="flex h-120 overflow-hidden rounded-xl border border-outline-variant bg-surface">
      <SidePanel
        side="left"
        isOpen={false}
        width={256}
        onExpand={() => {}}
        onCollapse={() => {}}
        expandLabel="Expand navigation"
        collapseLabel="Collapse navigation"
        collapsedPreview={
          <nav aria-label="Main navigation" className="flex w-full flex-col items-center gap-2">
            <NavItem label="Overview" active>
              <LayoutDashboard width="1em" height="1em" aria-hidden />
              <span>Overview</span>
            </NavItem>
            <NavItem label="Team" data-testid="row-team">
              <Users width="1em" height="1em" aria-hidden />
              <span>Team</span>
            </NavItem>
          </nav>
        }
      >
        {null}
      </SidePanel>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector("[data-testid='row-team']") as HTMLElement;
    await expect(row).toHaveAttribute("aria-label", "Team");

    // 1. The hide utility compiles. A class-name check (as in the jsdom test)
    //    would stay green even if the arbitrary variant compiled to nothing.
    await expect(getComputedStyle(row.querySelector("span")!).display).toBe("none");
    await expect(getComputedStyle(row.querySelector("svg")!).display).not.toBe("none");

    // 2. Nothing sticks out of the rail, and the icon sits on its axis.
    const rail = (canvasElement.querySelector("aside") as HTMLElement).getBoundingClientRect();
    for (const [el, what] of [
      [row, "row"],
      [row.querySelector("svg")!, "row icon"],
    ] as const) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) throw new Error(`${what} is not visible`);
      if (r.left < rail.left || r.right > rail.right) {
        throw new Error(`${what} overflows the rail: ${r.left}–${r.right} vs ${rail.left}–${rail.right}`);
      }
    }
    const icon = row.querySelector("svg")!.getBoundingClientRect();
    const off = Math.abs((icon.left + icon.right) / 2 - (rail.left + rail.right) / 2);
    await expect(off).toBeLessThanOrEqual(1);
  },
};
