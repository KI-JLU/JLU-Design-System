import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { SidebarCard, SidebarSelectionBar } from "./sidebar-card";
import { SidebarRail, SidebarRailItem } from "./sidebar-rail";
import { Button } from "./button";

const meta = {
  title: "Components/SidebarCard",
  component: SidebarCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SidebarCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const actions = [
  { label: "Umbenennen", icon: <Pencil aria-hidden="true" className="size-4" />, onSelect: () => {} },
  { label: "Löschen", icon: <Trash2 aria-hidden="true" className="size-4" />, destructive: true, separatorBefore: true, onSelect: () => {} },
];

/**
 * Chats and sources side by side. The app-wide Style comes from the Storybook
 * toolbar's `Stil` global: the preview decorator wraps every story in an
 * `AppearanceProvider` (which `UiShapeProvider` aliases), so this story sets
 * up no provider of its own. An inner provider would shadow the toolbar.
 */
function Panels() {
  const [selected, setSelected] = useState<Record<string, boolean>>({ a: true, b: false });
  const [selecting, setSelecting] = useState(false);
  return (
    <div className="flex gap-8">
      <div className="flex w-80 flex-col gap-2">
        {selecting && (
          <SidebarSelectionBar aria-label="Auswahl" countLabel="1 ausgewählt" onCancel={() => setSelecting(false)}>
            <Button variant="ghost" size="icon" aria-label="Löschen"><Trash2 aria-hidden="true" className="size-4" /></Button>
          </SidebarSelectionBar>
        )}
        <ul className="flex flex-col gap-2">
          <SidebarCard title="🧪 Chemische Formelextraktion" icon="🧪" onOpen={() => {}} active actions={actions} actionsLabel="Aktionen für"
            selectable={selecting} selectionMode={selecting} selected onSelectedChange={() => {}} />
          <SidebarCard title="Projektstatusbericht" icon={<MessageSquare />} onOpen={() => {}}
            actions={[...actions, { label: "Auswählen", onSelect: () => setSelecting(true) }]} actionsLabel="Aktionen für"
            selectable={selecting} selectionMode={selecting} onSelectedChange={() => {}} />
        </ul>
      </div>
      <ul className="flex w-80 flex-col gap-3">
        <SidebarCard title="1.2_AI_Fluency_Summary_One-Pager.pdf" iconText="PDF" onOpen={() => {}} actions={actions}
          selectable selected={selected.a} onSelectedChange={(v) => setSelected((s) => ({ ...s, a: v }))} />
        <SidebarCard title="Haushalt 2027.xlsx" iconText="XLSX" onOpen={() => {}} actions={actions}
          meta={<div className="text-xs text-on-surface-variant">Wartet auf Verarbeitung</div>}
          selectable selected={selected.b} onSelectedChange={(v) => setSelected((s) => ({ ...s, b: v }))} />
      </ul>
      <div className="flex w-[60px] flex-col items-center gap-2 border-l border-outline-variant pt-2">
        <SidebarRailItem variant="action" aria-label="Neuer Chat"><Plus /></SidebarRailItem>
        <SidebarRail>
          <li><SidebarRailItem aria-label="Chemie" active>🧪</SidebarRailItem></li>
          <li><SidebarRailItem aria-label="Projekt"><MessageSquare /></SidebarRailItem></li>
          <li><SidebarRailItem aria-label="a.pdf" iconText="PDF" /></li>
          <li><SidebarRailItem aria-label="b.xlsx" iconText="XLSX" muted /></li>
        </SidebarRail>
      </div>
    </div>
  );
}

export const SidePanels: Story = {
  args: { title: "", onOpen: () => {} },
  render: () => <Panels />,
};
