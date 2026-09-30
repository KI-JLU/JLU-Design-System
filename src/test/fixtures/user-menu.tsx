import { useState, type ReactNode } from "react";
import { LogOut, Palette, Settings, User } from "lucide-react";
import { AppearanceSettings } from "../../components/appearance-settings";
import { DropdownMenuItem, DropdownMenuSeparator } from "../../components/dropdown-menu";
import { SettingsDialog, SettingsRow } from "../../components/settings-dialog";
import { SidebarUserMenu } from "../../components/sidebar-user-menu";

/**
 * Story fixture — not part of the package (`src/test` is excluded from the
 * type build, and nothing in `src/index.ts` imports it).
 *
 * The user menu every app shell story mounts, and the path to the settings
 * window: „Einstellungen" sets the `open` state of a `SettingsDialog` through
 * `onSelect`, whose „Darstellung" section carries `AppearanceSettings`, wired
 * to the real providers the Storybook decorator mounts. A choice in the dialog
 * therefore switches the whole canvas (the toolbar's next change wins again).
 *
 * One copy for two users: `Components/SidebarUserMenu → OpensSettings` (the
 * flow on its own, KI-850) and the `AppShellLayout` fixture in `./app-shell`
 * (the flow in its real position, the column footer).
 *
 * The item list mirrors JLURAG's `AppUserMenu.tsx` (Profil · Einstellungen ·
 * separator · Abmelden, destructive) minus its role-gated admin row.
 */
export function UserMenuWithSettings({
  initials,
  name,
  role,
}: {
  initials: string;
  name: ReactNode;
  role?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SidebarUserMenu initials={initials} name={name} role={role}>
        <DropdownMenuItem>
          <User width="1em" height="1em" aria-hidden />
          Profil
        </DropdownMenuItem>
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
              <SettingsRow
                label="Benutzername"
                control={<span className="text-on-surface-variant">@jlee</span>}
              />
            ),
          },
        ]}
      />
    </>
  );
}
