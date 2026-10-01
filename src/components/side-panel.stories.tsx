import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { expect } from "storybook/test";
import { FileText, History, MessageSquare } from "lucide-react";
import { SidePanel } from "./side-panel";

const meta = {
  title: "Layout/SidePanel",
  component: SidePanel,
  args: {
    side: "left",
    isOpen: true,
    width: 320,
    expandLabel: "Verlauf ausklappen",
    collapseLabel: "Verlauf einklappen",
    onExpand: () => {},
    onCollapse: () => {},
    children: null,
  },
  argTypes: {
    onExpand: { control: false },
    onCollapse: { control: false },
    header: { control: false },
    collapsedPreview: { control: false },
    children: { control: false },
  },
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const entries = ["Zulassungsfristen", "Prüfungsordnung", "Bibliothek", "Mensa"];

const panelBody = (
  <ul className="flex min-h-0 flex-1 flex-col gap-stack-sm overflow-y-auto px-gutter py-stack-md">
    {entries.map((entry) => (
      <li
        key={entry}
        className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 font-body-base text-body-base text-on-surface"
      >
        {entry}
      </li>
    ))}
  </ul>
);

/**
 * Titel-Knoten für den `header`-Slot. `truncate` steht am Knoten des
 * Konsumenten, nicht im Rahmen: der Slot ist `min-w-0`, entscheiden muss die
 * Anwendung, ob ihr Titel kürzt, umbricht oder gar nicht schrumpft.
 */
const paneTitle = (text: string) => (
  <h2 className="truncate font-body-base text-body-base text-on-surface">{text}</h2>
);

const preview = (
  <>
    <History className="h-5 w-5 text-on-surface-variant" aria-hidden />
    <MessageSquare className="h-5 w-5 text-on-surface-variant" aria-hidden />
    <FileText className="h-5 w-5 text-on-surface-variant" aria-hidden />
  </>
);

/** Frame with a page-like neighbour, so the border edge is visible. */
const Frame = ({ children }: { children: ReactNode }) => (
  <div className="flex h-120 overflow-hidden rounded-xl border border-outline-variant bg-surface">
    {children}
  </div>
);

const Interactive = ({
  side,
  title = "Verlauf",
}: {
  side: "left" | "right";
  title?: string;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const panel = (
    <SidePanel
      side={side}
      isOpen={isOpen}
      width={320}
      onExpand={() => setIsOpen(true)}
      onCollapse={() => setIsOpen(false)}
      expandLabel="Verlauf ausklappen"
      collapseLabel="Verlauf einklappen"
      header={paneTitle(title)}
      collapsedPreview={preview}
      aria-label="Verlauf"
    >
      {panelBody}
    </SidePanel>
  );
  const content = (
    <div className="flex flex-1 items-center justify-center font-body-base text-body-base text-on-surface-variant">
      Seiteninhalt
    </div>
  );
  return (
    <Frame>
      {side === "left" ? panel : content}
      {side === "left" ? content : panel}
    </Frame>
  );
};

/**
 * Kontrolliert: `isOpen` und `width` liegen beim Konsumenten. Der
 * Einklapp-Knopf gehört zum Rahmen — er ist im zugeklappten Zustand das
 * einzige Bedienelement. Links steht er am **nachlaufenden** Rand, also dem
 * zum Inhalt zeigenden; `header` füllt den Rest der Zeile.
 */
export const Playground: Story = {
  render: () => <Interactive side="left" />,
};

/**
 * Rechte Leiste: Rand und Chevron spiegeln sich über `side` — und der
 * Umschalter wandert mit. Er steht **vor** dem `header`, wieder am zum Inhalt
 * zeigenden Rand, so dass die beiden Kopfzeilen eines Workspace zur Mitte hin
 * spiegelsymmetrisch sind.
 */
export const RightSide: Story = {
  render: () => <Interactive side="right" />,
};

/**
 * Langer Titel: Der `header`-Slot ist `min-w-0`, ein `truncate`-Knoten kürzt
 * deshalb mit Ellipse, statt den Umschalter aus der Zeile zu drängen. Die
 * Zeile ist in beiden Richtungen `h-16` hoch — dieselbe Chrome-Einheit wie die
 * Leiste von `AppShellLayout`, damit die Kopfzeilen auf einer Linie liegen.
 */
export const LongHeaderTitle: Story = {
  render: () => (
    <Interactive
      side="left"
      title="Gesprächsverlauf zur Prüfungsordnung des Fachbereichs 07"
    />
  ),
};

/**
 * Zugeklappt: 60px-Schiene mit Ausklapp-Knopf und optionaler
 * `collapsedPreview`. Der Inhalt bleibt montiert, ist aber ausgeblendet —
 * Scrollposition und halb getippte Eingaben überleben das Einklappen. Der
 * `header` dagegen wird **gar nicht** gerendert: in der Schiene ist Platz für
 * genau ein Bedienelement (hier mit gesetztem `header`, der trotzdem fehlt).
 */
export const Collapsed: Story = {
  args: {
    isOpen: false,
    header: paneTitle("Verlauf"),
    collapsedPreview: preview,
    children: panelBody,
  },
  render: (args) => (
    <Frame>
      <SidePanel {...args} aria-label="Verlauf" />
      <div className="flex flex-1 items-center justify-center font-body-base text-body-base text-on-surface-variant">
        Seiteninhalt
      </div>
    </Frame>
  ),
};

/** Ohne `collapsedPreview` bleibt nur der Ausklapp-Knopf in der Schiene. */
export const CollapsedWithoutPreview: Story = {
  args: { isOpen: false, children: panelBody },
  render: (args) => (
    <Frame>
      <SidePanel {...args} aria-label="Verlauf" />
      <div className="flex flex-1 items-center justify-center font-body-base text-body-base text-on-surface-variant">
        Seiteninhalt
      </div>
    </Frame>
  ),
};

/**
 * **Header-row geometry: the toggle sits on the body's first control.** The
 * row is inset `px-4` (16px) and the button is 32px wide (`p-1.5` + a 20px
 * icon), so its centre is 32px from the column's edge. A `p-4`-padded body
 * (how `AppShellLayout` pads its navigation) puts a 32px control at the
 * trailing end of its first row on the same centre: 16px padding + 16px half
 * width. (The 10px miss this fixed: Changelog, 0.39.0.)
 *
 * **The oracle is the body control's rectangle, not a number in the test.**
 * The `play` function measures both centres in the same browser layout and
 * compares them: swapping `px-4` for another measure, or setting the button
 * back to `p-2`, fails the comparison. Only the button's width (32px) and the
 * row's padding (16px) are also pinned as numbers, because otherwise two
 * measures moved together would look valid.
 */
export const ToggleAlignsWithBodyControl: Story = {
  args: {
    header: paneTitle("Verlauf"),
    children: (
      <div className="p-4">
        <div className="flex">
          <button className="ml-auto h-8 w-8" data-testid="body-control" />
        </div>
      </div>
    ),
  },
  render: (args) => (
    <Frame>
      <SidePanel {...args} aria-label="Verlauf" />
      <div className="flex flex-1 items-center justify-center font-body-base text-body-base text-on-surface-variant">
        Seiteninhalt
      </div>
    </Frame>
  ),
  play: async ({ canvas }) => {
    const toggle = await canvas.findByRole("button", { name: "Verlauf einklappen" });
    const bodyControl = await canvas.findByTestId("body-control");
    const glyph = toggle.querySelector("svg") as SVGSVGElement;

    // The actual assertion: the DRAWN outer edge of the glyph lies on the
    // outer edge of the filled button below it. That is what the eye reads as
    // flush on a ghost button with no visible box. Not the svg box: lucide
    // draws 3..21 of 24, i.e. 2.5px inside the 20px box, and that remainder
    // is exactly the step that used to show. The drawn edge comes from
    // `getBBox()` (user units), scaled to the rendered box.
    const box = glyph.getBoundingClientRect();
    const bbox = glyph.getBBox();
    const scale = box.width / glyph.viewBox.baseVal.width;
    const drawnRight = box.left + (bbox.x + bbox.width) * scale;
    await expect(Math.abs(drawnRight - bodyControl.getBoundingClientRect().right)).toBeLessThan(1);

    // Und die beiden Maße, aus denen sich das ergibt — ohne sie wären zwei
    // gemeinsam verschobene Werte (etwa `px-6` plus ein 48px-Knopf) genauso
    // grün.
    await expect(toggle.getBoundingClientRect().width).toBeCloseTo(32, 0);
    // Der Elternknoten des Umschalters IST die Kopfzeile — `SidePanel` rendert
    // ihn direkt in die `h-16`-Zeile.
    const headerRow = toggle.parentElement as HTMLElement;
    await expect(getComputedStyle(headerRow).paddingLeft).toBe("16px");
  },
};
