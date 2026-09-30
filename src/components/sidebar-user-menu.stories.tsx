import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect, waitFor, within } from "storybook/test";
import { ExternalLink, LogOut, Palette, Settings, User } from "lucide-react";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "./dropdown-menu";
import { SettingsDialog, SettingsRow } from "./settings-dialog";
import { AppearanceSettings } from "./appearance-settings";

const meta = {
  title: "Components/SidebarUserMenu",
  component: SidebarUserMenu,
  args: {
    initials: "JL",
    name: "Jamie Lee",
    role: "Admin",
  },
  // Im echten Einsatz sitzt die Zeile im 256px breiten Sidebar-Footer —
  // hier nachgestellt, damit Truncation und volle Breite sichtbar sind.
  decorators: [
    (Story) => (
      <div className="w-64 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SidebarUserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    children: (
      <>
        <DropdownMenuItem>
          <Settings width="1em" height="1em" aria-hidden />
          Einstellungen
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut width="1em" height="1em" aria-hidden />
          Abmelden
        </DropdownMenuItem>
      </>
    ),
  },
};

/** Ohne `role`: nur der Name, vertikal zentriert neben dem Avatar. */
export const WithoutRole: Story = {
  args: {
    role: undefined,
    children: (
      <DropdownMenuItem variant="destructive">
        <LogOut width="1em" height="1em" aria-hidden />
        Abmelden
      </DropdownMenuItem>
    ),
  },
};

/** Lange Werte werden abgeschnitten, statt die Spalte zu verbreitern. */
export const TruncatesLongValues: Story = {
  args: {
    initials: "MB",
    name: "Maximiliane Bergstrom-Lindqvist",
    role: "Wissenschaftliche Mitarbeiterin (Institut)",
    children: (
      <DropdownMenuItem asChild>
        <a href="#profil">
          <ExternalLink width="1em" height="1em" aria-hidden />
          Profil öffnen
        </a>
      </DropdownMenuItem>
    ),
  },
};

/**
 * Der Weg zu den Einstellungen: „Einstellungen" im Nutzermenü öffnet per
 * `onSelect` den `SettingsDialog`, dessen Abschnitt „Darstellung" die
 * `AppearanceSettings` trägt — verdrahtet mit den echten Providern, die der
 * Storybook-Decorator mountet. Eine Wahl im Dialog stellt also die ganze
 * Canvas um (die nächste Änderung in der Toolbar gewinnt wieder).
 */
function SettingsFlow({ initials, name, role }: { initials: string; name: ReactNode; role?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SidebarUserMenu initials={initials} name={name} role={role}>
        <DropdownMenuItem onSelect={() => setOpen(true)}>
          <Settings width="1em" height="1em" aria-hidden />
          Einstellungen
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut width="1em" height="1em" aria-hidden />
          Abmelden
        </DropdownMenuItem>
      </SidebarUserMenu>
      <SettingsDialog
        open={open}
        onOpenChange={setOpen}
        sections={[
          {
            value: "appearance",
            label: "Darstellung",
            icon: <Palette aria-hidden="true" />,
            keywords: ["Farbschema", "Kontrast", "Akzentfarbe", "Stil"],
            content: <AppearanceSettings />,
          },
          {
            value: "profile",
            label: "Profil",
            icon: <User aria-hidden="true" />,
            content: (
              <SettingsRow label="Benutzername" control={<span className="text-on-surface-variant">@jlee</span>} />
            ),
          },
        ]}
      />
    </>
  );
}

const page = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

export const OpensSettings: Story = {
  args: { children: null },
  render: (args) => <SettingsFlow initials={args.initials} name={args.name} role={args.role} />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const body = page(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Jamie Lee/ }));
    await userEvent.click(await body.findByRole("menuitem", { name: "Einstellungen" }));

    const dialog = await body.findByRole("dialog", { name: "Einstellungen" });
    await expect(within(dialog).getByRole("heading", { level: 2, name: "Darstellung" })).toBeVisible();
    for (const row of ["Farbschema", "Kontrast", "Akzentfarbe", "Stil"]) {
      await expect(within(dialog).getByRole("combobox", { name: row })).toBeVisible();
    }
    // The menu has closed behind the dialog.
    await expect(body.queryByRole("menu")).toBeNull();

    await userEvent.click(within(dialog).getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    // TODO: focus lands on <body> here, not back on the menu trigger (WCAG
    // 2.4.3). Radix Dialog's modal content always moves focus to its own
    // DialogTrigger on close (react-dialog 1.1.19, index.mjs `onCloseAutoFocus`),
    // and SettingsDialog renders none — so this holds for every way of opening
    // it, a plain button included. Not fixed on this card (KI-850); reported as
    // a follow-up. Deferring setOpen (setTimeout / rAF) was tried: no effect.
    // Menu → dialog is the case where two Radix layers hand over
    // `pointer-events: none` on <body>; after closing the page must be usable
    // again — the menu opens a second time.
    await waitFor(() => expect(canvasElement.ownerDocument.body.style.pointerEvents).not.toBe("none"));
    await userEvent.click(canvas.getByRole("button", { name: /Jamie Lee/ }));
    await expect(await body.findByRole("menuitem", { name: "Einstellungen" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
  },
};
