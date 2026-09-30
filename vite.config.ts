/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";

/**
 * Library build: ESM + type declarations. All runtime deps (react, radix,
 * cva/clsx/tailwind-merge, lucide) stay external — consumers install them via
 * the package's dependencies/peerDependencies. Tailwind classes ship as plain
 * strings; consumers compile them with their own Tailwind 4 setup (see README).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(dirname, "./src") }
  },
  plugins: [react(), tailwindcss(), dts({
    include: ["src"],
    exclude: ["src/**/*.stories.tsx", "src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]
  })],
  build: {
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: "index"
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^@radix-ui\//, /^radix-ui($|\/)/, "class-variance-authority", "clsx", "tailwind-merge", /^lucide-react($|\/)/]
    }
  },
  test: {
    projects: [{
      extends: true,
      test: {
        // globals: needed for @testing-library/react's automatic DOM cleanup
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"]
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      optimizeDeps: {
        // aria-query is CJS-only; pre-bundle it (and its importers) so the
        // browser-mode server can serve its named exports as ESM
        include: ["aria-query", "@testing-library/dom", "@testing-library/user-event"]
      },
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          // Vitest's own default is 414x896 (`resolved.browser.viewport.width
          // ??= 414` in vitest's config resolution), i.e. a phone — below the
          // `lg` boundary (1024px) that `AppShell` asks `matchMedia` for.
          // Story tests would therefore all run the narrow-screen
          // arrangement, and every desktop geometry a `play`
          // function measures (the 64px chrome bar, the centred search slot,
          // the three columns) would be measured on a layout no desktop user
          // sees. 1280x800 is a desktop window; a story that wants the narrow
          // arrangement says so per story.
          viewport: { width: 1280, height: 800 },
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});