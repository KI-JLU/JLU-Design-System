import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { FileText, LayoutDashboard, MessageSquare, Search, Settings } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxLoading,
  ComboboxSeparator,
} from "./combobox";
import { Button } from "./button";
import { Logo } from "./logo";
import { NavItem } from "./nav-item";
import { AppShellLayout } from "../templates/app-shell-layout";

/*
 * Oracle for every play function below: the DOM as the browser and assistive
 * technology see it — `document.activeElement`, ARIA attributes, roles and
 * accessible names, layout boxes, `elementFromPoint` — never component state.
 * The list is portalled to <body>, so it is queried there, not in the canvas.
 */

const meta = {
  title: "Components/Combobox",
  component: Combobox,
  // Stricter than the repo-wide `todo`: the ARIA wiring is this component's
  // whole point, so an axe violation in any story's end state fails the test.
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

/** The option `aria-activedescendant` points at, resolved through the DOM. */
const activeOption = (input: HTMLElement) => {
  const id = input.getAttribute("aria-activedescendant");
  return id ? input.ownerDocument.getElementById(id) : null;
};

/* ------------------------------------------------------------------------ */
/* Client-filtered                                                          */
/* ------------------------------------------------------------------------ */

const FACULTIES = [
  "01 Rechtswissenschaft",
  "02 Wirtschaftswissenschaften",
  "03 Sozial- und Kulturwissenschaften",
  "04 Geschichts- und Kulturwissenschaften",
  "05 Sprache, Literatur, Kultur",
];
const CENTRES = ["Hochschulrechenzentrum", "Universitätsbibliothek", "Zentrum für Medien und Interaktivität"];

function ClientCombobox() {
  const [selected, setSelected] = useState("—");
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Combobox>
        <ComboboxInput
          aria-label="Einrichtung suchen"
          placeholder="Fachbereich oder Einrichtung …"
          leadingIcon={<Search />}
        />
        <ComboboxContent>
          <ComboboxEmpty>Keine Treffer</ComboboxEmpty>
          <ComboboxList>
            <ComboboxGroup heading="Fachbereiche">
              {FACULTIES.map((name) => (
                <ComboboxItem key={name} onSelect={setSelected}>
                  {name}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
            <ComboboxSeparator />
            <ComboboxGroup heading="Zentrale Einrichtungen">
              {CENTRES.map((name) => (
                <ComboboxItem key={name} onSelect={setSelected}>
                  {name}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="m-0 text-sm text-on-surface-variant" data-testid="selected">
        Ausgewählt: {selected}
      </p>
      <p className="m-0 text-sm text-on-surface-variant">Außerhalb der Liste</p>
      <Button variant="outline">Weiter</Button>
    </div>
  );
}

/**
 * Client mode (default): cmdk filters and ranks the rendered items against
 * the text; groups without a match disappear, `ComboboxEmpty` shows when
 * nothing matches. Typing opens the list, and focus stays in the field.
 */
export const ClientFiltered: Story = {
  render: () => <ClientCombobox />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "Einrichtung suchen" });
    await expect(input).toHaveAttribute("aria-expanded", "false");
    // The first keystroke opens the list AND highlights (and announces) its
    // first option, so Enter already has something to select.
    await userEvent.type(input, "w");
    await page(canvasElement).findByRole("listbox");
    await waitFor(() => expect(activeOption(input)).toHaveAttribute("aria-selected", "true"));
    await userEvent.type(input, "issen");
    const listbox = await page(canvasElement).findByRole("listbox");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(input).toHaveAttribute("aria-controls", listbox.id);
    const names = within(listbox)
      .getAllByRole("option")
      .map((o) => o.textContent);
    await expect(names).toHaveLength(4);
    await expect(names.every((n) => n?.toLowerCase().includes("wissen"))).toBe(true);
    await expect(page(canvasElement).queryByRole("group", { name: "Zentrale Einrichtungen" })).toBeNull();
    // The auto-highlighted option is announced before any arrow key.
    await waitFor(() => expect(activeOption(input)).toHaveAttribute("aria-selected", "true"));
    await expect(document.activeElement).toBe(input);

    await userEvent.clear(input);
    await userEvent.type(input, "xyz");
    await expect(await page(canvasElement).findByText("Keine Treffer")).toBeVisible();
    await expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
    // No options → no empty listbox in the accessibility tree.
    await waitFor(() => expect(listbox).not.toBeVisible());
  },
};

/**
 * ↓ opens a closed list; ↓/↑ move the highlight and wrap around (cmdk
 * `loop`); Home/End jump to the first/last option; Enter selects the
 * highlighted one and closes the list. Focus never leaves the field — the
 * highlight travels as `aria-activedescendant`.
 */
export const KeyboardNavigation: Story = {
  render: () => <ClientCombobox />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "Einrichtung suchen" });
    await userEvent.click(input);
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{ArrowDown}");
    const listbox = await page(canvasElement).findByRole("listbox");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    const options = within(listbox).getAllByRole("option");
    const first = options[0];
    const last = options[options.length - 1];

    await waitFor(() => expect(activeOption(input)).toBe(first));
    await userEvent.keyboard("{ArrowDown}");
    await expect(activeOption(input)).toBe(options[1]);
    await expect(options[1]).toHaveAttribute("aria-selected", "true");
    await expect(first).toHaveAttribute("aria-selected", "false");
    await userEvent.keyboard("{End}");
    await expect(activeOption(input)).toBe(last);
    await userEvent.keyboard("{ArrowDown}");
    await expect(activeOption(input)).toBe(first); // wrapped past the last
    await userEvent.keyboard("{ArrowUp}");
    await expect(activeOption(input)).toBe(last); // wrapped past the first
    await userEvent.keyboard("{Home}");
    await expect(activeOption(input)).toBe(first);
    await expect(document.activeElement).toBe(input);

    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(page(canvasElement).queryByRole("listbox")).toBeNull());
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.getByTestId("selected")).toHaveTextContent(`Ausgewählt: ${FACULTIES[1]}`);
    await expect(document.activeElement).toBe(input);
  },
};

/** Escape closes the list and leaves both focus and text in the field. */
export const EscapeCloses: Story = {
  render: () => <ClientCombobox />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "Einrichtung suchen" });
    await userEvent.type(input, "recht");
    await page(canvasElement).findByRole("listbox");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page(canvasElement).queryByRole("listbox")).toBeNull());
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveValue("recht");
    await expect(document.activeElement).toBe(input);
  },
};

/**
 * A click on an option selects it and closes the list — without the field
 * losing focus first (the list cancels its mousedown).
 */
export const ClickSelectKeepsFocus: Story = {
  render: () => <ClientCombobox />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "Einrichtung suchen" });
    await userEvent.type(input, "bib");
    const option = await page(canvasElement).findByRole("option", {
      name: "Universitätsbibliothek",
    });
    let blurred = false;
    const onBlur = () => (blurred = true);
    input.addEventListener("blur", onBlur);
    await userEvent.click(option);
    input.removeEventListener("blur", onBlur);
    await waitFor(() => expect(page(canvasElement).queryByRole("listbox")).toBeNull());
    await expect(blurred).toBe(false);
    await expect(document.activeElement).toBe(input);
    await expect(canvas.getByTestId("selected")).toHaveTextContent(
      "Ausgewählt: Universitätsbibliothek",
    );
  },
};

/**
 * A click outside field and list closes it; a click into the field itself
 * does not.
 */
export const OutsideClickCloses: Story = {
  render: () => <ClientCombobox />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "Einrichtung suchen" });
    await userEvent.type(input, "zentrum");
    await page(canvasElement).findByRole("listbox");
    await userEvent.click(input);
    await expect(page(canvasElement).getByRole("listbox")).toBeVisible();
    await userEvent.click(canvas.getByText("Außerhalb der Liste"));
    await waitFor(() => expect(page(canvasElement).queryByRole("listbox")).toBeNull());
    await expect(input).toHaveAttribute("aria-expanded", "false");
  },
};

/** Focus moving on to anything outside field and list closes it (Tab). */
export const BlurCloses: Story = {
  render: () => <ClientCombobox />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "Einrichtung suchen" });
    await userEvent.type(input, "0");
    await page(canvasElement).findByRole("listbox");
    await userEvent.tab();
    await expect(document.activeElement).toBe(canvas.getByRole("button", { name: "Weiter" }));
    await waitFor(() => expect(page(canvasElement).queryByRole("listbox")).toBeNull());
    await expect(input).toHaveAttribute("aria-expanded", "false");
  },
};

/* ------------------------------------------------------------------------ */
/* Server mode                                                              */
/* ------------------------------------------------------------------------ */

type Results = { group: string; items: string[] }[];

const INDEX: Results = [
  { group: "Chats", items: ["Semesterplanung WS 26/27", "Fragen zur Prüfungsordnung", "Modulwahl Informatik"] },
  { group: "Dokumente", items: ["Modulhandbuch_Informatik.pdf", "Pruefungsordnung_2024.pdf", "Semesterplan.xlsx"] },
  { group: "Wissensbasen", items: ["Studienberatung", "Prüfungsamt"] },
];

/** A fake backend: substring match, answered after `delay` ms. */
function mockSearch(query: string, delay: number): Promise<Results> {
  const q = query.trim().toLowerCase();
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          INDEX.map(({ group, items }) => ({
            group,
            items: items.filter((item) => item.toLowerCase().includes(q)),
          })).filter(({ items }) => items.length > 0),
        ),
      delay,
    ),
  );
}

const MIN_QUERY = 2;

/**
 * The consumer's side of server mode, as JustRAG's global search needs it:
 * `shouldFilter={false}`, the list kept closed below `MIN_QUERY` characters
 * through the controlled `open`, loading and empty states, and — the part the
 * component cannot do for you — stale responses dropped by a request counter.
 */
function ServerSearch({ delay = 300 }: { delay?: number }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [selected, setSelected] = useState("—");
  const latest = useRef(0);

  const onQuery = (next: string) => {
    setQuery(next);
    const request = ++latest.current;
    if (next.trim().length < MIN_QUERY) {
      setLoading(false);
      setResults(null);
      return;
    }
    setLoading(true);
    void mockSearch(next, delay).then((found) => {
      if (request !== latest.current) return; // an older query answered late
      setResults(found);
      setLoading(false);
    });
  };

  return (
    <>
      <Combobox
        shouldFilter={false}
        open={open && query.trim().length >= MIN_QUERY}
        onOpenChange={setOpen}
      >
        <ComboboxInput
          aria-label="Suchen"
          placeholder="Chats, Dokumente, Wissensbasen …"
          leadingIcon={<Search />}
          value={query}
          onValueChange={onQuery}
        />
        <ComboboxContent>
          {loading ? <ComboboxLoading>Suche läuft …</ComboboxLoading> : null}
          {!loading && results ? (
            <ComboboxEmpty>Keine Treffer für „{query.trim()}“</ComboboxEmpty>
          ) : null}
          <ComboboxList>
            {!loading && results ? (
              <>
                {results.map(({ group, items }) => (
                  <ComboboxGroup key={group} heading={group}>
                    {items.map((item) => (
                      <ComboboxItem
                        key={item}
                        value={`${group}/${item}`}
                        onSelect={() => setSelected(item)}
                      >
                        {group === "Chats" ? <MessageSquare aria-hidden /> : <FileText aria-hidden />}
                        {item}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                ))}
              </>
            ) : null}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <span className="sr-only" data-testid="selected">
        {selected}
      </span>
    </>
  );
}

/**
 * Server mode with grouped async results behind a mocked 300ms delay:
 * nothing opens below two characters, `ComboboxLoading` shows while the
 * request runs, groups arrive unfiltered by cmdk, and a query with no hits
 * shows `ComboboxEmpty`.
 */
export const ServerGroupedAsync: Story = {
  render: () => (
    <div className="max-w-md">
      <ServerSearch />
    </div>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const body = page(canvasElement);
    const input = canvas.getByRole("combobox", { name: "Suchen" });
    await userEvent.type(input, "p");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(body.queryByRole("listbox")).toBeNull();

    await userEvent.type(input, "r");
    await expect(await body.findByRole("progressbar", { name: "Wird geladen …" })).toBeVisible();
    await expect(input).toHaveAttribute("aria-expanded", "true");
    const chats = await body.findByRole("group", { name: "Chats" });
    await expect(within(chats).getByRole("option")).toHaveTextContent("Fragen zur Prüfungsordnung");
    await expect(body.getByRole("group", { name: "Dokumente" })).toBeVisible();
    await expect(body.getByRole("group", { name: "Wissensbasen" })).toBeVisible();
    await expect(body.queryByRole("progressbar")).toBeNull();
    await expect(document.activeElement).toBe(input);

    await userEvent.type(input, "zzz");
    await expect(await body.findByText("Keine Treffer für „przzz“")).toBeVisible();
    await expect(body.queryAllByRole("option")).toHaveLength(0);
  },
};

/* ------------------------------------------------------------------------ */
/* In the AppShellLayout search slot                                        */
/* ------------------------------------------------------------------------ */

const nav = (
  <>
    <NavItem label="Übersicht" active>
      <LayoutDashboard width="1em" height="1em" aria-hidden />
      <span>Übersicht</span>
    </NavItem>
    <NavItem label="Einstellungen">
      <Settings width="1em" height="1em" aria-hidden />
      <span>Einstellungen</span>
    </NavItem>
  </>
);

/**
 * The real consumer placement: server search in `AppShellLayout`'s `search`
 * slot. The bar stays **64px** open or closed (JustRAG's `Toast.css`
 * `top: 76px` = 64 + 12 depends on it), the list is portalled so the bar
 * cannot clip it, and focus stays in the field while ↓ moves the highlight.
 */
export const InAppShellSearch: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <AppShellLayout
      logo={<Logo product="RAG" size="sm" />}
      nav={nav}
      leftOpen
      onLeftOpenChange={() => {}}
      pageLabel="Übersicht"
      search={<ServerSearch />}
      mobileTabs={[
        { id: "nav", icon: <LayoutDashboard />, label: "Bereiche", pane: "left" },
        { id: "page", icon: <FileText />, label: "Seite", pane: "main" },
      ]}
      activeMobileTab="page"
      onMobileTabChange={() => {}}
      mobileTabBarLabel="Bereichswechsel"
    >
      <div className="p-gutter text-on-surface-variant">Seiteninhalt</div>
    </AppShellLayout>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const body = page(canvasElement);
    const bar = canvasElement.querySelector("header") as HTMLElement;
    await expect(getComputedStyle(bar).height).toBe("64px");

    const input = canvas.getByRole("combobox", { name: "Suchen" });
    await userEvent.type(input, "ng");
    const listbox = await body.findByRole("listbox");
    await body.findAllByRole("option");
    await expect(getComputedStyle(bar).height).toBe("64px");

    // Not clipped: the list is outside the bar's subtree, reaches below it,
    // and its last option is what the browser hit-tests at that option's
    // centre — nothing (the bar included) covers or cuts it.
    await expect(bar.contains(listbox)).toBe(false);
    const barBottom = bar.getBoundingClientRect().bottom;
    await expect(listbox.getBoundingClientRect().bottom).toBeGreaterThan(barBottom);
    const options = within(listbox).getAllByRole("option");
    const lastBox = options[options.length - 1].getBoundingClientRect();
    await expect(lastBox.top).toBeGreaterThan(barBottom);
    const hit = document.elementFromPoint(
      lastBox.left + lastBox.width / 2,
      lastBox.top + lastBox.height / 2,
    );
    await expect(options[options.length - 1].contains(hit)).toBe(true);

    // Focus stays in the field while ↓ moves the highlight.
    await waitFor(() => expect(activeOption(input)).toBe(options[0]));
    await userEvent.keyboard("{ArrowDown}");
    await expect(activeOption(input)).toBe(options[1]);
    await userEvent.keyboard("{ArrowDown}");
    await expect(activeOption(input)).toBe(options[2]);
    await expect(document.activeElement).toBe(input);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("listbox")).toBeNull());
    await expect(getComputedStyle(bar).height).toBe("64px");
  },
};
