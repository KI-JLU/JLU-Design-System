import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Star } from "lucide-react";
import { FilterChips } from "./filter-chips";

/**
 * Oracles, all outside the component:
 *
 * 1. **WAI-ARIA's button / group role mapping and `aria-pressed`**, as
 *    testing-library resolves them. „Exactly one chip is active" is therefore
 *    checkable as a property of the accessibility tree rather than of a class
 *    name — and a class-only selection would fail here, which is the point.
 * 2. **The consumer's own `onValueChange` / `onAdd` spies.** The component
 *    keeps no state, so „the click reached the caller" is the whole contract of
 *    a press; a component that painted itself active without calling back would
 *    pass every visual check and fail these.
 * 3. **`Node.compareDocumentPosition`** (WHATWG DOM) for „the + is last",
 *    which is the tab order a keyboard user walks.
 */

const OPTIONS = [
  { value: "all", label: "Alle" },
  { value: "favourites", label: "Favoriten" },
  { value: "research", label: "Forschung" },
];

describe("FilterChips", () => {
  it("renders every option and marks exactly one active", () => {
    render(
      <FilterChips
        options={OPTIONS}
        value="favourites"
        onValueChange={() => {}}
        aria-label="Themen filtern"
      />,
    );

    expect(screen.getByRole("group", { name: "Themen filtern" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);

    expect(screen.getByRole("button", { name: "Favoriten" })).toHaveAttribute("aria-pressed", "true");
    // The other half: „one active" is only a fact if the rest are inactive.
    expect(screen.getByRole("button", { name: "Alle" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Forschung" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the pressed chip's value and changes nothing on its own", async () => {
    const onValueChange = vi.fn();
    render(
      <FilterChips
        options={OPTIONS}
        value="all"
        onValueChange={onValueChange}
        aria-label="Themen filtern"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Forschung" }));

    expect(onValueChange).toHaveBeenCalledWith("research");
    /* Controlled: `value` is still "all", so the strip must still show "all" as
       the pressed one. A component that moved the selection itself would hold a
       second truth next to the consumer's state. */
    expect(screen.getByRole("button", { name: "Alle" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Forschung" })).toHaveAttribute("aria-pressed", "false");
  });

  it("renders no action chip without onAdd", () => {
    render(<FilterChips options={OPTIONS} value="all" onValueChange={() => {}} aria-label="f" />);

    // Three chips, no fourth: a consumer who cannot add a category must not be
    // offered a control that does nothing.
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("renders the action chip last and calls onAdd", async () => {
    const onAdd = vi.fn();
    const onValueChange = vi.fn();
    render(
      <FilterChips
        options={OPTIONS}
        value="all"
        onValueChange={onValueChange}
        onAdd={onAdd}
        addLabel="Kategorie hinzufügen"
        aria-label="Themen filtern"
      />,
    );

    const add = screen.getByRole("button", { name: "Kategorie hinzufügen" });
    const last = screen.getByRole("button", { name: "Forschung" });

    /* ORACLE: the DOM's own answer to „which comes first". The + is an action,
       not an option, so it sits after every option in the tab order. */
    expect(last.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await userEvent.click(add);
    expect(onAdd).toHaveBeenCalledTimes(1);
    // And it is not a filter: pressing it selects nothing.
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("leaves every chip inactive when value matches no option", () => {
    // The readable failure when a stored filter outlives the category it named.
    render(<FilterChips options={OPTIONS} value="deleted-category" onValueChange={() => {}} aria-label="f" />);

    for (const name of ["Alle", "Favoriten", "Forschung"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("keeps an option's accessible name when it carries an icon", () => {
    /* The icon is decorative — the label is the name. A chip whose icon leaked
       into the accessible name would be unaddressable by the text a user reads,
       which is how icon+label controls usually break. */
    render(
      <FilterChips
        options={[{ value: "favourites", label: "Favoriten", icon: <Star aria-hidden /> }]}
        value="favourites"
        onValueChange={() => {}}
        aria-label="f"
      />,
    );

    expect(screen.getByRole("button", { name: "Favoriten" })).toBeInTheDocument();
  });
});

describe("FilterChips colour-coding", () => {
  it("draws a dot in the option's colour and tints only the active chip", () => {
    const { container } = render(
      <FilterChips
        aria-label="Themen filtern"
        value="a"
        onValueChange={() => {}}
        options={[
          { value: "a", label: "Lehre", color: "rgb(238, 69, 137)" },
          { value: "b", label: "Forschung", color: "rgb(21, 185, 156)" },
          { value: "c", label: "Alle" },
        ]}
      />,
    );
    const dots = container.querySelectorAll<HTMLElement>('[data-slot="filter-chip-dot"]');
    expect(dots).toHaveLength(2);
    expect(dots[0].style.backgroundColor).toBe("rgb(238, 69, 137)");
    const [lehre, forschung] = screen.getAllByRole("button");
    expect(lehre.style.borderColor).toBe("rgb(238, 69, 137)");
    expect(forschung.style.borderColor).toBe("");
  });
});
