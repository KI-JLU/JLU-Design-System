import * as React from "react";
import { useTheme, type Theme } from "../theme/ThemeContext";
import { AccentSwatch } from "./accent-swatch";
import { ACCENT_COLORS, useAccent, useContrast, type AccentColor, type ContrastChoice } from "./appearance-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { SettingsRow } from "./settings-dialog";
import { useUiShape, type UiShape } from "./ui-shape-context";

/** Every visible string of `AppearanceSettings`. German defaults; override any subset via `labels`. */
export interface AppearanceSettingsLabels {
  /** Row label of the colour scheme. Default "Farbschema". */
  theme: string;
  themeDescription?: React.ReactNode;
  themeLight: string;
  themeDark: string;
  themeSystem: string;
  /** Row label of the contrast. Default "Kontrast". */
  contrast: string;
  contrastDescription?: React.ReactNode;
  contrastSystem: string;
  contrastNormal: string;
  contrastMore: string;
  /** Row label of the accent colour. Default "Akzentfarbe". */
  accent: string;
  accentDescription?: React.ReactNode;
  /** One name per accent family; a partial map overrides only the names it carries. */
  accents: Record<AccentColor, string>;
  /** Row label of the Style (rounded / pill). Default "Stil". */
  shape: string;
  shapeDescription?: React.ReactNode;
  shapeRounded: string;
  shapePill: string;
}

const DEFAULT_LABELS: AppearanceSettingsLabels = {
  theme: "Farbschema",
  themeLight: "Hell",
  themeDark: "Dunkel",
  themeSystem: "System",
  contrast: "Kontrast",
  contrastDescription: "Erhöht: deutliche Fokusrahmen und kräftigere Linien. „System“ folgt der Kontrasteinstellung des Geräts.",
  contrastSystem: "System",
  contrastNormal: "Normal",
  contrastMore: "Erhöht",
  accent: "Akzentfarbe",
  accents: {
    standard: "Standard",
    teal: "Türkis",
    violet: "Violett",
    green: "Grün",
    rose: "Rosé",
    amber: "Bernstein",
  },
  shape: "Stil",
  shapeDescription: "Abgerundete Ecken oder Pillenform.",
  shapeRounded: "Abgerundet eckig",
  shapePill: "Pille",
};

export interface AppearanceSettingsProps {
  /**
   * Overrides for the visible strings. Keys left out — or passed as
   * `undefined` — keep their German default; pass `null` or `""` to a
   * `*Description` to drop that description.
   */
  labels?: Omit<Partial<AppearanceSettingsLabels>, "accents"> & {
    accents?: Partial<Record<AccentColor, string>>;
  };
}

/** Merge that ignores explicit `undefined`, so `{ theme: undefined }` keeps the default. */
function mergeLabels(overrides: AppearanceSettingsProps["labels"]): AppearanceSettingsLabels {
  const merged = { ...DEFAULT_LABELS, accents: { ...DEFAULT_LABELS.accents } };
  if (!overrides) return merged;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || key === "accents") continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  for (const [accent, name] of Object.entries(overrides.accents ?? {})) {
    if (name !== undefined) merged.accents[accent as AccentColor] = name;
  }
  return merged;
}

/**
 * One row's choice: the DS `Select`, named by the row label (`aria-labelledby`)
 * and described by the row description when there is one.
 */
function Choice<T extends string>({
  labelId,
  descriptionId,
  value,
  onChange,
  options,
}: {
  labelId: string;
  descriptionId?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly (readonly [T, React.ReactNode])[];
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger aria-labelledby={labelId} aria-describedby={descriptionId} className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * The appearance rows of a settings window — colour scheme, contrast, accent
 * colour and Style — each wired to the provider that owns that preference:
 * `useTheme` (ThemeProvider), `useContrast` / `useAccent` / `useUiShape`
 * (AppearanceProvider). Choosing a value calls the provider's setter, so the
 * provider persists it and mirrors it to `<html>` exactly as it does for any
 * other caller; this component holds no state of its own.
 *
 * Renders `SettingsRow`s as a fragment, with no wrapper: put it into a
 * `SettingsSection`'s `content`, alone or next to the app's own rows, and the
 * rules between rows stay continuous.
 *
 * Needs a `ThemeProvider` above it (`useTheme` throws without one). Without an
 * `AppearanceProvider` the contrast, accent and Style rows show their defaults
 * and choosing does nothing — the hooks' documented read-only fallback.
 */
function AppearanceSettings({ labels: labelsProp }: AppearanceSettingsProps) {
  const labels = mergeLabels(labelsProp);
  const { theme, setTheme } = useTheme();
  const { contrast, setContrast } = useContrast();
  const { accent, setAccent } = useAccent();
  const { shape, setShape } = useUiShape();
  const id = React.useId();
  const ids = (row: string) => ({ label: `${id}-${row}`, description: `${id}-${row}-description` });

  const row = (
    key: "theme" | "contrast" | "accent" | "shape",
    description: React.ReactNode,
    control: (labelId: string, descriptionId?: string) => React.ReactNode,
  ) => {
    const { label, description: descriptionId } = ids(key);
    const hasDescription = description !== undefined && description !== null && description !== "" && description !== false;
    return (
      <SettingsRow
        label={labels[key]}
        labelId={label}
        // SettingsRow renders the description in a <p> without an id; the
        // span carries the id the Select points aria-describedby at.
        description={hasDescription ? <span id={descriptionId}>{description}</span> : undefined}
        control={control(label, hasDescription ? descriptionId : undefined)}
      />
    );
  };

  return (
    <>
      {row("theme", labels.themeDescription, (labelId, descriptionId) => (
        <Choice<Theme>
          labelId={labelId}
          descriptionId={descriptionId}
          value={theme}
          onChange={setTheme}
          options={[
            ["system", labels.themeSystem],
            ["light", labels.themeLight],
            ["dark", labels.themeDark],
          ]}
        />
      ))}
      {row("contrast", labels.contrastDescription, (labelId, descriptionId) => (
        <Choice<ContrastChoice>
          labelId={labelId}
          descriptionId={descriptionId}
          value={contrast}
          onChange={setContrast}
          options={[
            ["system", labels.contrastSystem],
            ["normal", labels.contrastNormal],
            ["more", labels.contrastMore],
          ]}
        />
      ))}
      {row("accent", labels.accentDescription, (labelId, descriptionId) => (
        <Choice<AccentColor>
          labelId={labelId}
          descriptionId={descriptionId}
          value={accent}
          onChange={setAccent}
          options={ACCENT_COLORS.map((a) => [
            a,
            <span key={a} className="flex items-center gap-2">
              <AccentSwatch accent={a} />
              {labels.accents[a]}
            </span>,
          ] as const)}
        />
      ))}
      {row("shape", labels.shapeDescription, (labelId, descriptionId) => (
        <Choice<UiShape>
          labelId={labelId}
          descriptionId={descriptionId}
          value={shape}
          onChange={setShape}
          options={[
            ["rounded", labels.shapeRounded],
            ["pill", labels.shapePill],
          ]}
        />
      ))}
    </>
  );
}

export { AppearanceSettings };
