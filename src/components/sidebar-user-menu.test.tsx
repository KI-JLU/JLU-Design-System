import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidePanel } from "./side-panel";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { DropdownMenuItem } from "./dropdown-menu";

/**
 * `SidebarUserMenu` in both states of the column it sits in. These cases lived
 * in `sidebar.test.tsx` and were hosted by the legacy `Sidebar`. That
 * component was removed in KI-846, so the host is now `SidePanel`'s `footer`,
 * the slot `AppShellLayout` puts `sidebarFooter` into. It survives collapsing
 * and publishes the collapsed state on `SidebarCollapsedContext`.
 *
 * Oracles, both outside `sidebar-user-menu.tsx`:
 * 1. The accname computation (dom-accessibility-api, through Testing
 *    Library's `getByRole({ name })` / `toHaveAccessibleName`). It reads
 *    none of this library's class names.
 * 2. Radix DropdownMenu's `menu` / `menuitem` roles, which show the trigger
 *    still opens its menu while collapsed.
 */

const userMenu = (
  <SidebarUserMenu initials="JL" name="Jamie Lee" role="Admin">
    <DropdownMenuItem>Abmelden</DropdownMenuItem>
  </SidebarUserMenu>
);

/**
 * What the accname algorithm computes for the trigger: the name and the role
 * line concatenated with no separator, because both sit in inline-ish boxes.
 * One constant, so the expanded and the collapsed assertions cannot drift.
 * TODO: the missing separator is arguably a defect in `SidebarUserMenu`'s
 * markup, but fixing it changes a published accessible name. Carried over
 * unchanged from `sidebar.test.tsx`; not this card's call.
 */
const USER_MENU_NAME = "Jamie LeeAdmin";

const inSidePanel = (collapsed: boolean) =>
  render(
    <SidePanel
      side="left"
      isOpen={!collapsed}
      width={256}
      onExpand={() => {}}
      onCollapse={() => {}}
      expandLabel="Expand navigation"
      collapseLabel="Collapse navigation"
      footer={userMenu}
    >
      <p>Navigation</p>
    </SidePanel>,
  );

describe("SidebarUserMenu in a SidePanel footer", () => {
  it("gives the trigger the same accessible name expanded and collapsed", () => {
    const { unmount } = inSidePanel(false);
    expect(screen.getByRole("button", { name: /Jamie Lee/ })).toHaveAccessibleName(
      USER_MENU_NAME,
    );
    unmount();

    inSidePanel(true);
    expect(screen.getByRole("button", { name: /Jamie Lee/ })).toHaveAccessibleName(
      USER_MENU_NAME,
    );
  });

  it("stays reachable in the collapsed rail and still opens its menu", async () => {
    inSidePanel(true);
    const trigger = screen.getByRole("button", { name: USER_MENU_NAME });
    expect(trigger).toBeVisible();
    await userEvent.click(trigger);
    expect(await screen.findByRole("menuitem", { name: "Abmelden" })).toBeInTheDocument();
  });
});
