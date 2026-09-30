import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Palette, User } from "lucide-react";
import { SettingsDialog, SettingsRow } from "./settings-dialog";
import { AppearanceSettings } from "./appearance-settings";
import { Button } from "./button";

const meta = {
  title: "Components/SettingsDialog",
  component: SettingsDialog,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SettingsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  // Starts closed: the dialog is modal and would cover the canvas (and the
  // docs page) on load. The button is the trigger an app would have.
  const [open, setOpen] = useState(false);
  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Einstellungen öffnen</Button>
      <SettingsDialog
        open={open}
        onOpenChange={setOpen}
        sections={[
          {
            value: "appearance",
            label: "Darstellung",
            icon: <Palette aria-hidden="true" />,
            // The row labels, so the search finds the section by them.
            keywords: ["Farbschema", "Kontrast", "Akzentfarbe", "Stil"],
            // Wired to the real providers: the Storybook decorator mounts
            // ThemeProvider + AppearanceProvider, so a choice here restyles the
            // whole canvas (the toolbar's next change wins again).
            content: <AppearanceSettings />,
          },
          {
            value: "profile",
            label: "Profil",
            icon: <User aria-hidden="true" />,
            keywords: ["Benutzername", "E-Mail"],
            content: (
              <>
                <SettingsRow label="Benutzername" control={<span className="text-on-surface-variant">@grace</span>} />
                <SettingsRow label="E-Mail" control={<span className="text-on-surface-variant">grace@uni-giessen.de</span>} />
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

export const Default: Story = {
  args: { open: false, onOpenChange: () => {}, sections: [] },
  render: () => <Demo />,
};
