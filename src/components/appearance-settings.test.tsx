import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearanceSettings } from "./appearance-settings";
import { AppearanceProvider } from "./ui-shape-provider";
import { ThemeProvider } from "../theme/ThemeContext";

// A controllable matchMedia for both queries the providers ask:
// `prefers-color-scheme: dark` (ThemeProvider) and `prefers-contrast: more`
// (AppearanceProvider). Both OS signals start "off".
let osDark = false;
let osMoreContrast = false;
beforeEach(() => {
  window.localStorage.clear();
  const root = document.documentElement;
  delete root.dataset.theme;
  delete root.dataset.contrast;
  delete root.dataset.accent;
  delete root.dataset.uiShape;
  osDark = false;
  osMoreContrast = false;
  window.matchMedia = ((query: string) => ({
    get matches() {
      if (query.includes("prefers-color-scheme")) return osDark;
      if (query.includes("prefers-contrast")) return osMoreContrast;
      return false;
    },
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => window.localStorage.clear());

function renderSettings(ui = <AppearanceSettings />) {
  return render(
    <ThemeProvider>
      <AppearanceProvider>{ui}</AppearanceProvider>
    </ThemeProvider>,
  );
}

/** Open a row's Select with the keyboard (Radix Select's jsdom-safe path) and pick an option. */
async function choose(row: string, option: string) {
  const trigger = screen.getByRole("combobox", { name: row });
  trigger.focus();
  await userEvent.keyboard("{Enter}");
  await userEvent.click(await screen.findByRole("option", { name: option }));
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
}

// Oracles, throughout: the attributes the *providers* write on <html>
// (`data-theme`, `data-contrast`, `data-accent`, `data-ui-shape` — the same
// observation point ThemeContext.test.tsx and appearance.test.tsx use), the
// localStorage keys the providers document, stubbed OS signals, and
// hand-written expected label strings. Nothing the component under test
// returns is fed back into an assertion.
describe("AppearanceSettings", () => {
  it("names each Select by its row label (and describes it by the row description)", () => {
    renderSettings();
    // Accessible name/description as dom-accessibility-api computes them.
    expect(screen.getByRole("combobox", { name: "Farbschema" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Kontrast" })).toHaveAccessibleDescription(
      "Erhöht: deutliche Fokusrahmen und kräftigere Linien. „System“ folgt der Kontrasteinstellung des Geräts.",
    );
    expect(screen.getByRole("combobox", { name: "Akzentfarbe" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Stil" })).toHaveAccessibleDescription("Abgerundete Ecken oder Pillenform.");
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
  });

  it("choosing „Dunkel“ makes ThemeProvider write data-theme=dark and persist it", async () => {
    renderSettings();
    expect(document.documentElement.dataset.theme).toBe("light");
    await choose("Farbschema", "Dunkel");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  it("choosing „System“ for the colour scheme follows the stubbed OS preference", async () => {
    window.localStorage.setItem("theme", "light");
    osDark = true;
    renderSettings();
    expect(document.documentElement.dataset.theme).toBe("light");
    await choose("Farbschema", "System");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("contrast: „Erhöht“ writes data-contrast=more; „System“ resolves against the OS signal", async () => {
    renderSettings();
    expect(document.documentElement.dataset.contrast).toBe("normal");
    await choose("Kontrast", "Erhöht");
    expect(document.documentElement.dataset.contrast).toBe("more");
    expect(window.localStorage.getItem("ui-shape-contrast")).toBe("more");

    await choose("Kontrast", "Normal");
    expect(document.documentElement.dataset.contrast).toBe("normal");

    // The stubbed OS asks for no extra contrast, so "system" resolves to normal.
    await choose("Kontrast", "System");
    expect(window.localStorage.getItem("ui-shape-contrast")).toBe("system");
    expect(document.documentElement.dataset.contrast).toBe("normal");
  });

  it("contrast „System“ on a device asking for more contrast resolves to more", async () => {
    osMoreContrast = true;
    window.localStorage.setItem("ui-shape-contrast", "normal");
    renderSettings();
    expect(document.documentElement.dataset.contrast).toBe("normal");
    await choose("Kontrast", "System");
    expect(document.documentElement.dataset.contrast).toBe("more");
  });

  it("accent: lists the six families by name and writes data-accent", async () => {
    renderSettings();
    const trigger = screen.getByRole("combobox", { name: "Akzentfarbe" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const listbox = await screen.findByRole("listbox");
    // Hand-written expectation, in ACCENT_COLORS' documented order.
    expect(within(listbox).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Standard", "Türkis", "Violett", "Grün", "Rosé", "Bernstein",
    ]);
    await userEvent.click(within(listbox).getByRole("option", { name: "Türkis" }));
    expect(document.documentElement.dataset.accent).toBe("teal");
    expect(window.localStorage.getItem("ui-shape-accent")).toBe("teal");
  });

  it("each accent option carries a swatch in that accent's colour", async () => {
    renderSettings();
    screen.getByRole("combobox", { name: "Akzentfarbe" }).focus();
    await userEvent.keyboard("{Enter}");
    const option = await screen.findByRole("option", { name: "Violett" });
    // Oracle: the CSS custom property tokens.css defines per accent.
    const swatch = option.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(swatch.style.background).toBe("var(--accent-swatch-violet)");
  });

  it("Style: „Pille“ writes data-ui-shape=pill", async () => {
    renderSettings();
    expect(document.documentElement.dataset.uiShape).toBe("rounded");
    await choose("Stil", "Pille");
    expect(document.documentElement.dataset.uiShape).toBe("pill");
    expect(window.localStorage.getItem("ui-shape")).toBe("pill");
  });

  it("shows the stored preferences on open", () => {
    // Oracle: values planted in storage before mount, under the providers' keys.
    window.localStorage.setItem("theme", "dark");
    window.localStorage.setItem("ui-shape-contrast", "more");
    window.localStorage.setItem("ui-shape-accent", "rose");
    window.localStorage.setItem("ui-shape", "pill");
    renderSettings();
    expect(screen.getByRole("combobox", { name: "Farbschema" })).toHaveTextContent("Dunkel");
    expect(screen.getByRole("combobox", { name: "Kontrast" })).toHaveTextContent("Erhöht");
    expect(screen.getByRole("combobox", { name: "Akzentfarbe" })).toHaveTextContent("Rosé");
    expect(screen.getByRole("combobox", { name: "Stil" })).toHaveTextContent("Pille");
  });

  it("every label is overridable; unset keys keep their German default", async () => {
    renderSettings(
      <AppearanceSettings
        labels={{
          theme: "Colour scheme",
          themeDark: "Dark",
          contrast: "Contrast",
          contrastDescription: null,
          accent: "Accent colour",
          accents: { teal: "Teal" },
          shape: undefined,
          shapeDescription: "Rounded corners or pills.",
        }}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Colour scheme" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Farbschema" })).not.toBeInTheDocument();
    // null drops the description entirely.
    expect(screen.getByRole("combobox", { name: "Contrast" })).toHaveAccessibleDescription("");
    expect(screen.queryByText(/Fokusrahmen/)).not.toBeInTheDocument();
    // `undefined` keeps the default label.
    expect(screen.getByRole("combobox", { name: "Stil" })).toHaveAccessibleDescription("Rounded corners or pills.");

    await choose("Colour scheme", "Dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    screen.getByRole("combobox", { name: "Accent colour" }).focus();
    await userEvent.keyboard("{Enter}");
    const names = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(names).toEqual(["Standard", "Teal", "Violett", "Grün", "Rosé", "Bernstein"]);
  });

  it("without an AppearanceProvider the contrast/accent/Style rows are read-only defaults", async () => {
    render(
      <ThemeProvider>
        <AppearanceSettings />
      </ThemeProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Kontrast" })).toHaveTextContent("System");
    expect(screen.getByRole("combobox", { name: "Stil" })).toHaveTextContent("Abgerundet eckig");
    await choose("Stil", "Pille");
    // Nothing owns the Style, so nothing writes it.
    expect(document.documentElement.dataset.uiShape).toBeUndefined();
    expect(window.localStorage.getItem("ui-shape")).toBeNull();
  });
});
