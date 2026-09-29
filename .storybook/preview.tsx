import type { Preview, Decorator } from '@storybook/react-vite';
import { useEffect } from 'react';
import { ThemeProvider, useTheme, type Theme } from '../src/theme/ThemeContext';
import { AppearanceProvider } from '../src/components/ui-shape-provider';
import {
  useAccent,
  useContrast,
  type AccentColor,
  type ContrastChoice,
} from '../src/components/appearance-context';
import { useUiShape, type UiShape } from '../src/components/ui-shape-context';
import './preview.css';

/** Bridges the Storybook toolbar selection into the real ThemeProvider, so
 * stories exercise the same runtime (data-theme on <html>) as the apps. */
function ThemeSync({ theme }: { theme: Theme }) {
  const { setTheme } = useTheme();
  useEffect(() => setTheme(theme), [theme, setTheme]);
  return null;
}

/** The same bridge for the three AppearanceProvider axes (data-contrast,
 * data-accent, data-ui-shape on <html>). One-way like ThemeSync: the toolbar
 * sets the value whenever it changes; a control inside a story (e.g.
 * AppearanceSettings) may change it afterwards, and the toolbar's next change
 * wins again. */
function AppearanceSync({
  contrast,
  accent,
  shape,
}: {
  contrast: ContrastChoice;
  accent: AccentColor;
  shape: UiShape;
}) {
  const { setContrast } = useContrast();
  const { setAccent } = useAccent();
  const { setShape } = useUiShape();
  useEffect(() => setContrast(contrast), [contrast, setContrast]);
  useEffect(() => setAccent(accent), [accent, setAccent]);
  useEffect(() => setShape(shape), [shape, setShape]);
  return null;
}

const withTheme: Decorator = (Story, context) => (
  <ThemeProvider>
    <ThemeSync theme={context.globals.theme as Theme} />
    <AppearanceProvider>
      <AppearanceSync
        contrast={context.globals.contrast as ContrastChoice}
        accent={context.globals.accent as AccentColor}
        shape={context.globals.shape as UiShape}
      />
      {/* Full-page templates (parameters.layout: "fullscreen") render edge-to-edge;
          component stories keep the padded canvas. */}
      <div
        className={
          context.parameters.layout === "fullscreen"
            ? "bg-surface text-on-surface min-h-screen"
            : "bg-surface text-on-surface min-h-screen p-8"
        }
      >
        <Story />
      </div>
    </AppearanceProvider>
  </ThemeProvider>
);

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Farbschema',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Hell' },
          { value: 'dark', title: 'Dunkel' },
          { value: 'system', title: 'System' },
        ],
        dynamicTitle: true,
      },
    },
    contrast: {
      description: 'Kontrast',
      toolbar: {
        title: 'Kontrast',
        icon: 'contrast',
        items: [
          { value: 'normal', title: 'Kontrast: Normal' },
          { value: 'more', title: 'Kontrast: Erhöht' },
          { value: 'system', title: 'Kontrast: System' },
        ],
        dynamicTitle: true,
      },
    },
    accent: {
      description: 'Akzentfarbe',
      toolbar: {
        title: 'Akzent',
        icon: 'paintbrush',
        // The values are ACCENT_COLORS (appearance-context.ts).
        items: [
          { value: 'standard', title: 'Akzent: Standard' },
          { value: 'teal', title: 'Akzent: Türkis' },
          { value: 'violet', title: 'Akzent: Violett' },
          { value: 'green', title: 'Akzent: Grün' },
          { value: 'rose', title: 'Akzent: Rosé' },
          { value: 'amber', title: 'Akzent: Bernstein' },
        ],
        dynamicTitle: true,
      },
    },
    shape: {
      description: 'Stil (abgerundet eckig / Pille)',
      toolbar: {
        title: 'Stil',
        icon: 'circlehollow',
        items: [
          { value: 'rounded', title: 'Stil: Abgerundet eckig' },
          { value: 'pill', title: 'Stil: Pille' },
        ],
        dynamicTitle: true,
      },
    },
  },
  // Deterministic defaults — the design as drawn, like `theme: 'light'`.
  // `normal` rather than `system` contrast, so a story test does not depend
  // on the contrast setting of the machine running it.
  initialGlobals: {
    theme: 'light',
    contrast: 'normal',
    accent: 'standard',
    shape: 'rounded',
  },
  decorators: [withTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  tags: ['autodocs'],
};

export default preview;
