import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "../components/badge";
import { Container } from "../components/container";
import { Grid, type GridProps } from "../components/grid";
import { PageHeader } from "../components/page-header";
import { cn } from "../lib/utils";
import { headingTag, nextHeadingLevel, type HeadingLevel } from "../lib/heading-level";

/**
 * The header half of one section — identical for every body shape below.
 *
 * `isOpen`/`onOpenChange` are **consumer state**, like `SidePanel`'s and
 * `AppShellLayout`'s columns: the app owns it (a URL parameter, a context, or
 * `localStorage`), this template only arranges what it is told. There is no
 * `defaultOpen`, because a template that remembers anything would be a second
 * truth next to the app's.
 */
export interface SectionedGridSectionBase {
  /**
   * Stable, app-side id. Used as the React key and as the suffix of the
   * disclosure's element ids (prefixed with a `useId()` value, so two
   * instances on one page cannot collide).
   */
  id: string;
  /**
   * Section heading. Rendered inside a heading **one level below the
   * template's `headingLevel`** — not a hardcoded `<h2>`; see the
   * `headingLevel` prop.
   */
  title: React.ReactNode;
  /** Optional leading icon in the header row (lucide, `aria-hidden`). */
  icon?: React.ReactNode;
  /** Optional item count, rendered as a neutral `Badge` next to the title. */
  count?: number;
  /**
   * Optional control at the far end of the header row — deliberately
   * **outside** the disclosure trigger, so pressing it does not toggle the
   * section (the source implementation keeps the same separation).
   */
  headerAction?: React.ReactNode;
  /** Expanded (`true`) or collapsed (`false`). */
  isOpen: boolean;
  /** The trigger was pressed; carries the requested state, never the old one. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * The body half — exactly one of three shapes. The union makes the wrong
 * *combination* a type error; `SectionBody` below still resolves in a fixed
 * order (`emptyState` → `body` → `Grid`), so a JS consumer without type
 * checking that passes two shapes gets that precedence silently.
 *
 * **Why a union and not „items plus an optional emptyState".** The template
 * must not decide whether a section is empty: that would be a derivation
 * (`React.Children.count` of a mapped array, a fragment, or `false` are not
 * distinguishable in a way a consumer could predict), and the app already
 * branches on its own data — the source implementation writes
 * `list.length === 0 ? <empty/> : <grid/>` at every one of its sections. So
 * the app picks the shape and the template renders it, with no third state to
 * get wrong.
 */
export type SectionedGridSectionBody =
  | {
      /** Grid cells — one node per card. Laid out by `Grid`. */
      items: React.ReactNode;
      /**
       * Optional „create" tile, rendered as the **first** cell of the same
       * grid (the position the source implementation uses).
       */
      createCell?: React.ReactNode;
      emptyState?: never;
      body?: never;
    }
  | {
      /**
       * Rendered **instead of** a grid, in the muted body style — the
       * „nothing here yet" line. Pass a string; the template owns its type
       * and color tokens.
       */
      emptyState: React.ReactNode;
      items?: never;
      createCell?: never;
      body?: never;
    }
  | {
      /**
       * Free-form section body: rendered raw, with **no** `Grid` around it.
       * For a section whose content is not a card grid but a whole panel
       * (a catalog/discovery panel, a table, a filtered list).
       */
      body: React.ReactNode;
      items?: never;
      createCell?: never;
      emptyState?: never;
    };

export type SectionedGridSection = SectionedGridSectionBase & SectionedGridSectionBody;

export interface SectionedGridLayoutProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /**
   * Accessible name of the template's `region` landmark. Required: the
   * template is page **content** inside `AppShellLayout`'s `<main>`, and an
   * unnamed `<section>` is no landmark at all (HTML-AAM maps it to `generic`).
   */
  label: string;
  /** The sections, in the order they should appear. */
  sections: SectionedGridSection[];
  /**
   * Optional page title. When given, a `PageHeader` (h1 + description +
   * actions) sits above the sections, as in `DashboardLayout`. Omit it when
   * the app's title lives elsewhere — e.g. only in `AppShellLayout`'s
   * `pageLabel` bar.
   */
  title?: React.ReactNode;
  /**
   * The level the **page** title occupies in the document outline, `1`–`6`,
   * default `1`. It is one dial for both heading roles this template has: the
   * optional `PageHeader` sits at `headingLevel`, every section heading one
   * level below it. At the default that is `<h1>` + `<h2>`, exactly what this
   * template rendered before the prop existed — no call site moves.
   *
   * It applies **whether or not `title` is given**, because it declares where
   * the page title *is*, not only where this template draws it. Omit `title`
   * and keep the default and the sections stay `<h2>`s under the `<h1>` the
   * app renders elsewhere; pass `headingLevel={2}` inside a frame that owns
   * the `<h1>` and the whole template moves down one step together (`<h2>`
   * title, `<h3>` sections) instead of colliding with it.
   *
   * Two independent hardcoded levels were the defect this replaces: a forced
   * `<h1>` from `PageHeader` next to a forced `<h2>` per section could not
   * both be right, and could not be moved from any call site.
   */
  headingLevel?: HeadingLevel;
  /** Muted line under the title. Requires `title`. */
  description?: React.ReactNode;
  /** Right-aligned header actions next to the title. Requires `title`. */
  actions?: React.ReactNode;
  /**
   * Desktop column count of **every** section grid (`Grid cols`, default 3);
   * the responsive collapse is `Grid`'s. One dial for the whole page on
   * purpose — sections of differing column counts read as different pages.
   */
  cols?: GridProps["cols"];
}

/**
 * Template „Sectioned Grid": a page whose content is a **stack of
 * collapsible sections, each holding a card grid** — the overview/browse page
 * category (grouped collections a user enters from here). Optional
 * `PageHeader` on top, then one section per group: header row (title,
 * optional icon, optional count, optional action) plus a body that is either
 * a `Grid` of cells, an empty-state line, or a free-form node.
 *
 * Composes `Container` + `PageHeader` + `Grid` + `Badge`. It is page
 * **content**: hang it into `AppShellLayout` as `children`, exactly like
 * `DashboardLayout` — the branded header, the page label, the theme toggle
 * and the user menu belong to the shell, not here.
 *
 * **Composition only.** No data fetching, no derivation, no state of its own
 * — not even „which section is open". Grouping, sorting and the
 * owned-vs-shared split stay in the app; the sections arrive as given.
 *
 * **Responsive behaviour is pure CSS, and there is no `matchMedia` here.**
 * The card grid's collapse is `Grid`'s (`cols` is the desktop count), the
 * title row stacks in `PageHeader`, and the section header row wraps. Nothing
 * in this template renders a structurally different tree per viewport, so it
 * needs no viewport awareness at all — unlike `AppShell`, whose arrangement
 * genuinely changes.
 *
 * **The disclosure, and why it is not an `Accordion`.** The design system has
 * no `Accordion` primitive and this template does not smuggle one in: each
 * section is an ARIA **disclosure** (APG) built from a button and a panel.
 * The button carries `aria-expanded` and `aria-controls`; it sits *inside* the
 * section heading so it stays navigable (APG's accordion markup) — and that
 * heading's **level** is derived from `headingLevel`, one step inside the page
 * title, rather than the `<h2>` it used to be nailed to. The panel
 * element is **always** rendered — an `aria-controls` pointing at an id that
 * exists only while open would be a dangling reference that announces
 * nothing — and carries `hidden` while collapsed; its *children* are
 * unmounted. That mount behaviour is deliberate and load-bearing: in the
 * source implementation (`KbAccordion`) the discovery panel's fetch hangs off
 * mount, so expanding the section is what re-reads the catalog. It is also
 * the opposite of `SidePanel`, which keeps children mounted so a half-typed
 * input survives a collapse — a card grid has nothing to lose, a form does.
 *
 * The panel gets **no** `role="region"`: a disclosure needs none, and APG
 * warns against landmark proliferation past ~6 panels. This template
 * contributes exactly one landmark, its own `<section aria-label>`.
 *
 * TODO: two API points are reasoned above but **not yet confirmed** with the
 * design-system owner — (a) the name (`SectionedGridLayout` over `IndexLayout`
 * / `HomeLayout`, argued on the card) and (b) that collapsing unmounts the
 * body rather than only hiding it, which a consumer with expensive section
 * content may want to opt out of.
 */
const SectionedGridLayout = React.forwardRef<HTMLElement, SectionedGridLayoutProps>(
  (
    {
      className,
      label,
      sections,
      title,
      headingLevel = 1,
      description,
      actions,
      cols = 3,
      ...props
    },
    ref,
  ) => {
    // Element ids have to be unique per document, not per section list: two
    // instances of this template on one page would otherwise share them.
    const uid = React.useId();
    // Derived, never a second constant: the sections sit one step inside the
    // page title, so one prop moves both and they cannot contradict.
    const SectionHeading = headingTag(nextHeadingLevel(headingLevel));

    return (
      <section ref={ref} aria-label={label} className={cn("flex flex-col", className)} {...props}>
        <Container className="flex flex-col gap-stack-lg py-gutter md:py-margin-page">
          {title !== undefined && (
            <PageHeader
              title={title}
              headingLevel={headingLevel}
              description={description}
              actions={actions}
            />
          )}

          {sections.map((section) => {
            const triggerId = `${uid}-${section.id}-trigger`;
            const panelId = `${uid}-${section.id}-panel`;

            return (
              <div key={section.id} className="flex flex-col gap-stack-md">
                <div className="flex flex-wrap items-center gap-stack-sm">
                  {/* APG accordion markup: the heading wraps the trigger, so
                      the section stays reachable by heading navigation while
                      the whole row remains the click target. */}
                  <SectionHeading className="m-0 min-w-0 flex-1 font-headline-md text-headline-md-mobile text-on-surface">
                    <button
                      type="button"
                      id={triggerId}
                      aria-expanded={section.isOpen}
                      aria-controls={panelId}
                      onClick={() => section.onOpenChange(!section.isOpen)}
                      className="group flex w-full min-w-0 items-center gap-stack-sm rounded-action py-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "h-5 w-5 shrink-0 text-on-surface-variant transition-transform motion-reduce:transition-none",
                          section.isOpen && "rotate-180",
                        )}
                      />
                      {section.icon}
                      <span className="min-w-0 transition-colors group-hover:text-primary">
                        {section.title}
                      </span>
                      {section.count !== undefined && (
                        <Badge tone="neutral">{section.count}</Badge>
                      )}
                    </button>
                  </SectionHeading>
                  {section.headerAction && (
                    <div className="shrink-0">{section.headerAction}</div>
                  )}
                </div>

                {/* Always in the DOM so `aria-controls` always resolves; the
                    body itself is mounted only while open (see the doc block). */}
                <div id={panelId} hidden={!section.isOpen}>
                  {section.isOpen && <SectionBody section={section} cols={cols} />}
                </div>
              </div>
            );
          })}
        </Container>
      </section>
    );
  },
);
SectionedGridLayout.displayName = "SectionedGridLayout";

/**
 * Renders whichever of the three body shapes the section declared. Split out
 * of the map only for readability — it holds no state and no decision beyond
 * „which shape did the consumer pass". The order below is the precedence a JS
 * consumer would hit if it passed two shapes at once; TypeScript rules that
 * combination out (see `SectionedGridSectionBody`).
 */
function SectionBody({
  section,
  cols,
}: {
  section: SectionedGridSection;
  cols: GridProps["cols"];
}) {
  if (section.emptyState !== undefined) {
    return (
      <div className="text-body-base text-on-surface-variant">{section.emptyState}</div>
    );
  }
  if (section.body !== undefined) {
    return <>{section.body}</>;
  }
  return (
    <Grid cols={cols}>
      {section.createCell}
      {section.items}
    </Grid>
  );
}

export { SectionedGridLayout };
