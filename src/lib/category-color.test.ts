import { describe, expect, it } from "vitest";
import { CATEGORY_COLOR_COUNT, categoryColor } from "./category-color";

describe("categoryColor", () => {
  it("is stable per key", () => {
    expect(categoryColor("lehre")).toBe(categoryColor("lehre"));
  });

  it("always names a palette token", () => {
    for (const key of ["", "a", "Lehre", "3f1c2e8a-uuid", "Forschung & Transfer"]) {
      const m = categoryColor(key).match(/^var\(--color-category-(\d+)\)$/);
      expect(m).not.toBeNull();
      const n = Number(m![1]);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(CATEGORY_COLOR_COUNT);
    }
  });

  it("spreads keys over several hues", () => {
    const hues = new Set(Array.from({ length: 40 }, (_, i) => categoryColor(`cat-${i}`)));
    expect(hues.size).toBeGreaterThan(5);
  });
});
