import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  FileText,
  Home,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell, type AppShellPanel } from "./app-shell";
import { Card } from "./card";
import { Container } from "./container";
import { Logo } from "./logo";
import { NavItem } from "./nav-item";
import { PageHeader } from "./page-header";
import { SIDE_PANEL_RAIL_WIDTH } from "./side-panel-variants";
import type { MobilePaneTab } from "../lib/pane-layout";

const TABS: MobilePaneTab[] = [
  { id: "nav", icon: <Home />, label: "Bereiche", pane: "left" },
  { id: "page", icon: <LayoutDashboard />, label: "Seite", pane: "main" },
  { id: "sources", icon: <FileText />, label: "Quellen", pane: "right" },
];

const meta = {
  title: "Layout/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  // Basis-Args nur für die Props-Tabelle: jede Story rendert über `render` mit
  // eigenem Zustand, weil Einklapp-Zustand und aktiver Reiter beim Konsumenten
  // liegen und in Storybook nur als lokaler State existieren können.
  args: {
    mobileTabs: TABS,
    activeMobileTab: "page",
    onMobileTabChange: () => {},
    mobileTabBarLabel: "Bereichswechsel",
  },
  argTypes: {
    left: { control: false },
    right: { control: false },
    mobileTabs: { control: false },
    onMobileTabChange: { control: false },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const brand = <Logo product="App" size="sm" />;

const navRows = (
  <nav aria-label="Hauptnavigation" className="flex flex-col gap-2 p-4">
    <NavItem label="Übersicht" active>
      <LayoutDashboard width="1em" height="1em" aria-hidden />
      <span>Übersicht</span>
    </NavItem>
    <NavItem label="Team">
      <Users width="1em" height="1em" aria-hidden />
      <span>Team</span>
    </NavItem>
    <NavItem label="Einstellungen">
      <Settings width="1em" height="1em" aria-hidden />
      <span>Einstellungen</span>
    </NavItem>
  </nav>
);

const collapsedPreview = (
  <>
    <LayoutDashboard className="h-5 w-5 text-on-surface-variant" aria-hidden />
    <Sparkles className="h-5 w-5 text-on-surface-variant" aria-hidden />
  </>
);

/**
 * Der Zustand beider Spalten liegt — wie in einer App — außerhalb der Shell.
 * Hier ist es lokaler Story-State statt eines Contexts oder `localStorage`.
 */
function Frame() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("page");

  const left: AppShellPanel = {
    content: navRows,
    header: brand,
    footer: (
      <div className="p-4 text-body-sm text-on-surface-variant">Jamie Lee</div>
    ),
    label: "Hauptnavigation",
    isOpen: leftOpen,
    onOpenChange: setLeftOpen,
    expandLabel: "Navigation ausklappen",
    collapseLabel: "Navigation einklappen",
    collapsedPreview,
  };

  const right: AppShellPanel = {
    content: (
      <div className="flex flex-col gap-stack-md p-gutter">
        <Card className="p-4">Quelle 1</Card>
        <Card className="p-4">Quelle 2</Card>
      </div>
    ),
    header: <span className="truncate font-title-md">Quellen</span>,
    label: "Quellen",
    isOpen: rightOpen,
    onOpenChange: setRightOpen,
    expandLabel: "Quellen ausklappen",
    collapseLabel: "Quellen einklappen",
  };

  return (
    <AppShell
      left={left}
      right={right}
      topBar={
        <Container className="flex items-center gap-4">
          <p className="m-0 font-headline-md text-headline-md font-bold text-on-surface">
            Übersicht
          </p>
        </Container>
      }
      mobileTabs={TABS}
      activeMobileTab={activeTab}
      onMobileTabChange={setActiveTab}
      mobileTabBarLabel="Bereichswechsel"
    >
      <Container className="py-gutter md:py-margin-page">
        <PageHeader title="Übersicht" description="Hauptbereich — Inhalt kommt von der Seite." />
        <Card className="mt-gutter p-6">Seiteninhalt</Card>
      </Container>
    </AppShell>
  );
}

/**
 * **The one reference story of the primitive** (KI-847): the frame with no
 * template around it — `SidePanel` left | main column with a free-form
 * `topBar` | `SidePanel` right. It is here to show what `AppShell` itself
 * owns; every page context, and every mechanism regression of the full app
 * chrome, is a story of `Templates/AppShellLayout`, which composes this frame
 * (an app uses that template and never builds the frame by hand).
 *
 * Both columns collapse to the 60px rail independently; the left column's
 * header row, the main column's bar and the right column's header row are
 * each 64px high and on one line. Below `lg` the same shell shows **one**
 * area plus the `BottomTabBar` — visible by making the window narrower than
 * 1024px; the narrow arrangement is asserted in `app-shell.test.tsx` (jsdom,
 * stubbed viewport), because the Storybook runner renders at 1280px.
 *
 * Until KI-847 this file held four stories. `ThreeColumns` and
 * `ColumnsCollapsed` are the two halves of this story's `play`;
 * `WithoutRightColumn` is `app-shell.test.tsx` → „renders no right column and
 * no rail when `right` is omitted"; `Mobile` was a visual control without
 * assertions — `Templates/AppShellLayout` → `Mobile` is that control now.
 */
export const Reference: Story = {
  render: () => <Frame />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    // Orakel: die Layout-Boxen, die Chromiums Engine liefert — keine
    // Klassennamen. Reihenfolge und Nebeneinander sind die Behauptung der
    // Skizze; in jsdom (0×0-Boxen) wäre dieselbe Prüfung wertlos.
    const left = await canvas.findByRole("complementary", { name: "Hauptnavigation" });
    const right = await canvas.findByRole("complementary", { name: "Quellen" });
    const main = canvasElement.querySelector("main")!;
    // Die Chrome-Zeile strukturell gesucht, nicht über `banner`: `PageHeader`
    // im Seiteninhalt rendert ebenfalls ein `<header>`, und aria-query (hinter
    // `getByRole`) bildet ein `<header>` **in** `<main>` noch auf `banner` ab,
    // während axe-core dafür den aktuellen Geltungsbereich `article, aside,
    // main, nav, section` verwendet und es nicht als Landmark zählt (geprüft in
    // `node_modules/axe-core`, `landmarkHasBodyContextMatches`). Das erste
    // `<header>` im Baum ist die Zeile der Shell.
    const bar = canvasElement.querySelector("header") as HTMLElement;

    const l = left.getBoundingClientRect();
    const m = main.getBoundingClientRect();
    const r = right.getBoundingClientRect();
    await expect(l.right).toBeLessThanOrEqual(m.left + 1);
    await expect(m.right).toBeLessThanOrEqual(r.left + 1);

    // Eine Chrome-Einheit: die Zeile über dem Inhalt ist 64px hoch und liegt
    // auf der Oberkante beider Spalten.
    await expect(bar.getBoundingClientRect().height).toBe(64);
    await expect(Math.round(bar.getBoundingClientRect().top)).toBe(Math.round(l.top));
    await expect(Math.round(r.top)).toBe(Math.round(l.top));

    // Beide Spalten eingeklappt: zwei 60px-Schienen (`SIDE_PANEL_RAIL_WIDTH`),
    // die linke mit `collapsedPreview`-Icons. **Die eingeklappte Form ist die
    // Schiene** — es gibt keinen Icon-Navigationsmodus mehr (Entscheidung des
    // Entwicklers, 17.09.2026). Bis KI-847 die Story `ColumnsCollapsed`, die
    // eingeklappt startete; hier über die beiden Schalter erreicht.
    await userEvent.click(await canvas.findByRole("button", { name: "Navigation einklappen" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Quellen einklappen" }));
    // Orakel: die exportierte Designkonstante — kein literales 60 hier.
    for (const name of ["Hauptnavigation", "Quellen"]) {
      const column = await canvas.findByRole("complementary", { name });
      await expect(column.getBoundingClientRect().width).toBe(SIDE_PANEL_RAIL_WIDTH);
    }
    // Nur der Weg zurück ist erreichbar; die Kopfzeilen sind abgeräumt.
    await expect(
      await canvas.findByRole("button", { name: "Navigation ausklappen" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("navigation", { name: "Hauptnavigation" })).toBeNull();
  },
};
