/** Number of hues in the category palette (`--color-category-1..N`). */
export const CATEGORY_COLOR_COUNT = 9;

/**
 * A stable palette colour for a category: the same key always maps to the same
 * `var(--color-category-N)`, so a category keeps its colour when others are
 * added or removed (an index into the list would shift). FNV-1a over the key.
 */
export function categoryColor(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `var(--color-category-${((h >>> 0) % CATEGORY_COLOR_COUNT) + 1})`;
}
