import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Compass,
  FolderOpen,
  History,
  Home,
  LayoutGrid,
  Menu,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { AppShellLayout, type AppShellLayoutProps } from "../../templates/app-shell-layout";
import { Button } from "../../components/button";
import { Input } from "../../components/input";
import { Logo } from "../../components/logo";
import { NavItem } from "../../components/nav-item";
import { SidebarAction } from "../../components/sidebar-action";
import { SidebarCard, SidebarCardList } from "../../components/sidebar-card";
import { useSidebarCollapsed } from "../../components/sidebar-context";
import { SidebarPanel } from "../../components/sidebar-panel";
import { SidebarRail, SidebarRailItem } from "../../components/sidebar-rail";
import type { MobilePaneTab } from "../../lib/pane-layout";
import { usePersistedWidth } from "../../lib/persisted-width";
import { UserMenuWithSettings } from "./user-menu";

/* ---------------------------------------------------------------------------
 * Story fixture — the ONE app shell every `Templates/AppShellLayout` story
 * renders (KI-847). Not part of the package: `src/test` is excluded from the
 * type build, and nothing in `src/index.ts` imports it.
 *
 * Every app view is one `AppShellLayout`, adapted to its context. The two
 * contexts below mirror the two call sites of the reference consumer, JLURAG
 * (`web/src/components/`), with neutral content — German labels, no app
 * strings beyond what makes the shape recognisable:
 *
 *  - `overview` — `AppChrome.tsx` (the `AppShellLayout` call at l. 383–423):
 *    `Logo product="RAG"`, NavItem rows in a `SidebarPanel` (`SidebarNav.tsx`),
 *    the user menu as `sidebarFooter`, the search in `search`, no `pageLabel`,
 *    no `headerActions`, two narrow-screen tabs.
 *  - `workspace` — `KbWorkspaceLayout.tsx` (l. 132–208): the chat history as
 *    the left column (`history/HistoryPanel.tsx`: `SidebarPanel` expanded,
 *    `SidebarRail` collapsed), back button + title as `pageLabel`, a ghost gear
 *    in `headerActions`, the sources as `rightPanel` with a `collapsedPreview`
 *    rail (`sidebar/SourcesRail.tsx`), both columns resizable, three tabs.
 *
 * `search` is REQUIRED here although it is optional on the component: a
 * central search is the convention of every shell, so a story has to decide
 * it — and the one story that pins the empty bar says `search={null}` out
 * loud. The component's API is unchanged.
 *
 * Everything else a story passes overrides the context's value (spread last),
 * which is how the mechanism stories fix a width or add a label without a
 * second hand-built shell. Column state (open, width, active tab) is local
 * state here — in an app it is the app's (context, URL, `localStorage`).
 * ------------------------------------------------------------------------- */

export type ShellContext = "overview" | "workspace";

export interface AppShellFixtureProps
  extends Omit<Partial<AppShellLayoutProps>, "search" | "children" | "rightPanel"> {
  context: ShellContext;
  /** The bar's centre region — required by the fixture, see the note above. */
  search: ReactNode;
  children: ReactNode;
  /** `workspace` only: a fixed sources-column width instead of the resizable one. */
  rightWidth?: number;
}

/** The workspace's topic title — long enough to truncate in every bar measured. */
export const WORKSPACE_TITLE = "Prüfungsordnung Informatik (Master of Science), Fassung 2026";

/**
 * The search field of the bar's centre region: a DS `Input` with a leading
 * search icon. JLURAG renders a `Combobox` input with the same leading icon
 * there (`GlobalSearch.tsx`); the dropdown is not the fixture's subject — see
 * `Components/Combobox → InAppShellSearch` for it.
 */
export function ShellSearch({ label = "Suchen" }: { label?: string }) {
  return (
    <Input type="search" aria-label={label} placeholder={`${label} …`} leadingIcon={<Search />} />
  );
}

export function AppShellFixture({ context, rightWidth, ...props }: AppShellFixtureProps) {
  return context === "overview" ? (
    <OverviewShell {...props} />
  ) : (
    <WorkspaceShell rightWidth={rightWidth} {...props} />
  );
}

type ContextProps = Omit<AppShellFixtureProps, "context" | "rightWidth">;

const userMenu = <UserMenuWithSettings initials="JL" name="Jamie Lee" role="Admin" />;

/* -- overview (AppChrome.tsx) ------------------------------------------------ */

const OVERVIEW_TABS: MobilePaneTab[] = [
  { id: "nav", icon: <Menu aria-hidden="true" />, label: "Navigation", pane: "left" },
  { id: "page", icon: <LayoutGrid aria-hidden="true" />, label: "Inhalt", pane: "main" },
];

/**
 * The overview's NavItem rows, bare. Every row carries `label` and wraps its
 * text in a `<span>`: the first permits the icon-only form in the rail, the
 * second is what the collapsed variant hides.
 */
function OverviewNavRows() {
  return (
    <>
      <NavItem type="button" label="Meine Sammlungen" active>
        <Home size={20} aria-hidden="true" />
        <span>Meine Sammlungen</span>
      </NavItem>
      <NavItem type="button" label="Mit mir geteilt">
        <Users size={20} aria-hidden="true" />
        <span>Mit mir geteilt</span>
      </NavItem>
      <NavItem type="button" label="Entdecken">
        <Compass size={20} aria-hidden="true" />
        <span>Entdecken</span>
      </NavItem>
      <NavItem type="button" label="Werkzeuge">
        <Wrench size={20} aria-hidden="true" />
        <span>Werkzeuge</span>
      </NavItem>
    </>
  );
}

/**
 * The overview's `nav`: the rows in the column's `SidebarPanel` frame, and
 * bare in the 60px rail, where the panel's insets do not fit — JLURAG's
 * `SidebarNav.tsx`, one to one. The panel has no title, `head` or `nav`, so
 * it renders no head and its list starts on the rail's 16px inset (KI-852):
 * `CollapsedRailKeepsVerticalPositions` measures exactly this composition.
 */
function OverviewNav() {
  const collapsed = useSidebarCollapsed();
  if (collapsed) return <OverviewNavRows />;
  return (
    <SidebarPanel>
      <div className="flex flex-col gap-2">
        <OverviewNavRows />
      </div>
    </SidebarPanel>
  );
}

function OverviewShell(props: ContextProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [tab, setTab] = useState("page");
  return (
    <AppShellLayout
      logo={<Logo product="RAG" />}
      nav={<OverviewNav />}
      navLabel="Hauptnavigation"
      sidebarFooter={userMenu}
      leftOpen={leftOpen}
      onLeftOpenChange={setLeftOpen}
      collapseLabel="Navigation einklappen"
      expandLabel="Navigation ausklappen"
      mobileTabs={OVERVIEW_TABS}
      activeMobileTab={tab}
      onMobileTabChange={setTab}
      mobileTabBarLabel="Bereich wechseln"
      {...props}
    />
  );
}

/* -- workspace (KbWorkspaceLayout.tsx) --------------------------------------- */

const WORKSPACE_TABS: MobilePaneTab[] = [
  { id: "history", icon: <History aria-hidden="true" />, label: "Verlauf", pane: "left" },
  { id: "chat", icon: <MessageSquare aria-hidden="true" />, label: "Chat", pane: "main" },
  { id: "files", icon: <FolderOpen aria-hidden="true" />, label: "Quellen", pane: "right" },
];

const CHATS = [
  { id: "c1", title: "Zusammenfassung der Modulbeschreibungen", active: true },
  { id: "c2", title: "Fragen zur Anmeldung" },
  { id: "c3", title: "Fristen im Wintersemester" },
];

const SOURCES = [
  { id: "s1", name: "Modulhandbuch_2026.pdf", type: "PDF" },
  { id: "s2", name: "Prüfungsordnung.docx", type: "DOCX" },
  { id: "s3", name: "Termine.xlsx", type: "XLSX", muted: true },
];

const chatActions = [
  { label: "Umbenennen", icon: <Pencil size={16} aria-hidden="true" />, onSelect: () => {} },
  {
    label: "Löschen",
    icon: <Trash2 size={16} aria-hidden="true" />,
    destructive: true,
    separatorBefore: true,
    onSelect: () => {},
  },
];

const sourceActions = [
  {
    label: "Löschen",
    icon: <Trash2 size={16} aria-hidden="true" />,
    destructive: true,
    onSelect: () => {},
  },
];

/**
 * The left column: expanded, a `SidebarPanel` with the „Neuer Chat" action
 * under its heading and the chats as `SidebarCard`s; collapsed, the same
 * action plus one `SidebarRailItem` per chat (JLURAG `HistoryPanel.tsx`).
 */
function HistoryNav() {
  const collapsed = useSidebarCollapsed();
  if (collapsed) {
    return (
      <>
        <SidebarRailItem variant="action" title="Neuer Chat" aria-label="Neuer Chat">
          <Plus aria-hidden="true" />
        </SidebarRailItem>
        <SidebarRail>
          {CHATS.map((chat) => (
            <li key={chat.id}>
              <SidebarRailItem active={chat.active} title={chat.title} aria-label={chat.title}>
                <MessageSquare aria-hidden="true" />
              </SidebarRailItem>
            </li>
          ))}
        </SidebarRail>
      </>
    );
  }
  return (
    <SidebarPanel
      title="Verlauf"
      head={
        <SidebarAction type="button" icon={<Plus />}>
          Neuer Chat
        </SidebarAction>
      }
    >
      <SidebarCardList>
        {CHATS.map((chat) => (
          <SidebarCard
            key={chat.id}
            icon={<MessageSquare />}
            title={chat.title}
            onOpen={() => {}}
            active={chat.active}
            actionsLabel="Chat-Aktionen"
            actions={chatActions}
          />
        ))}
      </SidebarCardList>
    </SidebarPanel>
  );
}

/** The right column's body (JLURAG `sources/SourcesPanel.tsx`, reduced to its frame). */
function SourcesContent() {
  return (
    <SidebarPanel
      title="Quellen"
      head={
        <SidebarAction type="button" icon={<Plus />}>
          Quellen hinzufügen
        </SidebarAction>
      }
    >
      <SidebarCardList>
        {SOURCES.map((source) => (
          <SidebarCard
            key={source.id}
            iconText={source.type}
            title={source.name}
            onOpen={() => {}}
            actionsLabel="Quellen-Aktionen"
            actions={sourceActions}
          />
        ))}
      </SidebarCardList>
    </SidebarPanel>
  );
}

/** The collapsed right rail: „add" leads, one icon per source (JLURAG `SourcesRail.tsx`). */
function SourcesRail() {
  return (
    <>
      <SidebarRailItem variant="action" title="Quellen hinzufügen" aria-label="Quellen hinzufügen">
        <Plus aria-hidden="true" />
      </SidebarRailItem>
      <SidebarRail aria-label="Quellen">
        {SOURCES.map((source) => (
          <li key={source.id}>
            <SidebarRailItem iconText={source.type} muted={source.muted} aria-label={source.name} />
          </li>
        ))}
      </SidebarRail>
    </>
  );
}

/**
 * The fixture's `Storage`: in memory and per mount, so a story test never
 * writes into the runner's real `localStorage` and every story starts at the
 * default widths. An app omits `storage` — then it is `window.localStorage`.
 */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
  } satisfies Storage;
}

/** JLURAG's bounds (`hooks/useSidebarResize.ts`): 320 by default, left 150–600, right 300–800. */
const LEFT_BOUNDS = { min: 150, max: 600 };
const RIGHT_BOUNDS = { min: 300, max: 800 };
const DEFAULT_COLUMN_WIDTH = 320;

function WorkspaceShell({ rightWidth, ...props }: ContextProps & { rightWidth?: number }) {
  const [storage] = useState(memoryStorage);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [tab, setTab] = useState("chat");
  // `usePersistedWidth` is exactly the wiring an app writes, except for the
  // injected `storage`; the consumer passes the WHOLE key.
  const [leftWidth, setLeftWidth] = usePersistedWidth("storybook.workspace.leftWidth", {
    defaultWidth: DEFAULT_COLUMN_WIDTH,
    minWidth: LEFT_BOUNDS.min,
    maxWidth: LEFT_BOUNDS.max,
    storage,
  });
  const [persistedRightWidth, setRightWidth] = usePersistedWidth(
    "storybook.workspace.rightWidth",
    {
      defaultWidth: DEFAULT_COLUMN_WIDTH,
      minWidth: RIGHT_BOUNDS.min,
      maxWidth: RIGHT_BOUNDS.max,
      storage,
    },
  );

  return (
    <AppShellLayout
      logo={<Logo product="RAG" />}
      nav={<HistoryNav />}
      navLabel="Verlauf"
      pageLabel={
        <span className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Zurück zur Übersicht"
            aria-label="Zurück zur Übersicht"
            className="shrink-0"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Button>
          <span className="min-w-0 truncate">{WORKSPACE_TITLE}</span>
        </span>
      }
      headerActions={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Einstellungen des Themas"
          aria-label="Einstellungen des Themas"
        >
          <Settings size={20} aria-hidden="true" />
        </Button>
      }
      sidebarFooter={userMenu}
      leftOpen={leftOpen}
      onLeftOpenChange={setLeftOpen}
      leftWidth={leftWidth}
      leftResize={{
        minWidth: LEFT_BOUNDS.min,
        maxWidth: LEFT_BOUNDS.max,
        onWidthChange: setLeftWidth,
        label: "Breite des Verlaufs ändern",
      }}
      collapseLabel="Verlauf einklappen"
      expandLabel="Verlauf ausklappen"
      rightPanel={{
        content: <SourcesContent />,
        collapsedPreview: <SourcesRail />,
        label: "Quellen",
        isOpen: rightOpen,
        onOpenChange: setRightOpen,
        width: rightWidth ?? persistedRightWidth,
        resize: {
          minWidth: RIGHT_BOUNDS.min,
          maxWidth: RIGHT_BOUNDS.max,
          onWidthChange: setRightWidth,
          label: "Breite der Quellen ändern",
        },
        expandLabel: "Quellen ausklappen",
        collapseLabel: "Quellen einklappen",
      }}
      mobileTabs={WORKSPACE_TABS}
      activeMobileTab={tab}
      onMobileTabChange={setTab}
      mobileTabBarLabel="Bereich wechseln"
      {...props}
    />
  );
}
