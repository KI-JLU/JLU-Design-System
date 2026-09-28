/**
 * Local ESLint plugin enforcing the design system (see docs/DESIGN_SYSTEM.md and
 * docs/COMPONENT_GUIDELINES.md). Two rules:
 *
 *   design-system/no-hardcoded-colors  (error)
 *     Flags raw Tailwind palette color utilities (bg-blue-500, text-gray-700,
 *     dark:text-green-400, …) and arbitrary hex color classes (bg-[#1e1e2e]) in
 *     any string / template literal. Colors must go through semantic tokens
 *     (bg-primary, text-on-surface, bg-success, …). Opaque `white`/`black` stay
 *     allowed (common contrast overlays), but a TRANSLUCENT black background
 *     (bg-black/50) is a scrim and must use bg-scrim/<n>.
 *     Genuine exceptions get an eslint-disable line.
 *
 *   design-system/no-raw-ui-elements  (warn)
 *     Flags raw <button> / <input> JSX; prefer @ki4jlu/design-system Button / Input.
 *     Warn (not error) because some low-level controls legitimately stay raw
 *     (dropdown internals, range/color inputs, borderless inline fields).
 */

const PALETTE = [
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber",
  "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue",
  "indigo", "violet", "purple", "fuchsia", "pink", "rose",
].join("|");

const PREFIX = [
  "bg", "text", "border", "ring", "ring-offset", "from", "to", "via", "divide",
  "outline", "decoration", "fill", "stroke", "caret", "accent", "shadow",
  "placeholder",
].join("|");

// A palette utility, optionally with a variant prefix (dark:, hover:, md:, …)
// and an opacity suffix (/80). Anchored to a class boundary to avoid matching
// substrings of semantic tokens.
const paletteRe = new RegExp(
  `(?:^|[\\s:'"\`])(?:${PREFIX})-(?:${PALETTE})-\\d{2,3}\\b`,
);
// Arbitrary hex color class, e.g. bg-[#1e1e2e], text-[#fff].
const hexClassRe = /-\[#[0-9a-fA-F]{3,8}\]/;
// Translucent black as a background — that is a scrim, and there is a token
// for it. Opaque `bg-black` and `text-white` stay allowed (contrast overlays).
const scrimRe = /(?:^|[\s:'"`])(?:bg|from|to|via)-black\/\d/;

/** Returns the messageId to report, or null when the text is clean. */
function testColor(text) {
  if (typeof text !== "string") return null;
  if (scrimRe.test(text)) return "scrim";
  if (paletteRe.test(text) || hexClassRe.test(text)) return "hardcoded";
  return null;
}

const noHardcodedColors = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw Tailwind palette / hex colors; use semantic tokens." },
    messages: {
      hardcoded:
        "Hardcoded color class. Use a semantic token (e.g. bg-primary, text-on-surface, bg-success) — see docs/COMPONENT_GUIDELINES.md.",
      scrim:
        "Translucent black background. Use the scrim token instead (bg-scrim/50) — see Storybook „Tokens“.",
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        const messageId = testColor(node.value);
        if (messageId) context.report({ node, messageId });
      },
      TemplateElement(node) {
        const messageId = testColor(node.value && node.value.cooked);
        if (messageId) context.report({ node, messageId });
      },
    };
  },
};

const noRawUiElements = {
  meta: {
    type: "suggestion",
    docs: { description: "Prefer shared @ki4jlu/design-system controls over raw <button>/<input>." },
    messages: {
      button:
        "Raw <button>. Prefer <Button> from @ki4jlu/design-system (or add an eslint-disable with a reason).",
      input:
        "Raw <input>. Prefer <Input> from @ki4jlu/design-system (or add an eslint-disable with a reason).",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name;
        if (name.type !== "JSXIdentifier") return;
        if (name.name === "button") context.report({ node, messageId: "button" });
        else if (name.name === "input") context.report({ node, messageId: "input" });
      },
    };
  },
};

/**
 * design-system/layout-only-classname (warn)
 *
 * className on design-system controls is layout-only (COMPONENT_GUIDELINES
 * rule 4). Flags "skin" classes that re-style a control at the call site —
 * positive paddings, font sizes, font families, line-height/tracking, and
 * text wrapping/clipping utilities. These are exactly the hacks that shrink
 * a button until its label no longer fits (the WidgetCard footer bug): if a
 * control doesn't fit, reduce the number of actions or use an icon button
 * with aria-label — never shrink the control.
 *
 * Allowed: zero paddings (p-0 — the sanctioned flush/inline pattern) and any
 * padding on fields with variant="inline" (the surrounding frame owns the
 * spacing there). Genuine exceptions get an eslint-disable with a reason.
 */
const DS_CONTROLS = [
  "Button",
  "Input",
  "Textarea",
  "Badge",
  "MenuItem",
  // Combobox's field and rows are the Input / MenuItem look under a new
  // name — the same layout-only contract applies to them.
  "ComboboxInput",
  "ComboboxItem",
  "NavItem",
  "Switch",
  "SegmentedControl",
  "ThemeToggle",
  "CodeBlock",
];

// Positive SYMMETRIC paddings (p-2, px-1.5, p-[3px] — not p-0): the
// shrink-to-fit hack. Single-side paddings (pl-9, pr-10) are layout insets
// for overlaid icons/affordances and stay allowed. Font sizes (text-xs,
// text-[10px]), font families, line-height/tracking, wrapping/clipping.
const paddingRe = /^(?:p|px|py)-(?!0$)(?:\d|\[)/;
const skinRe =
  /^(?:text-(?:xs|sm|base|lg|xl|\dxl)$|text-\[[\d.]+(?:px|rem|em)\]$|font-(?:mono|sans|serif)$|leading-|tracking-|whitespace-|break-(?:words|all)$|truncate$)/;

const layoutOnlyClassname = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "className on design-system controls is layout-only; move looks into variants.",
    },
    messages: {
      skin:
        "Skin class '{{cls}}' on <{{component}}> — className on design-system controls is layout-only (COMPONENT_GUIDELINES rule 4). Move the look into a variant/size, or add an eslint-disable with a reason.",
    },
    schema: [],
  },
  create(context) {
    const check = (text, component, node, allowPadding) => {
      if (typeof text !== "string") return;
      for (const raw of text.split(/\s+/)) {
        if (!raw) continue;
        const cls = raw.split(":").pop();
        const isSkin = skinRe.test(cls) || (!allowPadding && paddingRe.test(cls));
        if (isSkin) context.report({ node, messageId: "skin", data: { cls: raw, component } });
      }
    };
    const visit = (v, component, node, allowPadding) => {
      if (!v) return;
      switch (v.type) {
        case "Literal":
          check(v.value, component, node, allowPadding);
          break;
        case "TemplateLiteral":
          v.quasis.forEach((q) => check(q.value && q.value.cooked, component, node, allowPadding));
          v.expressions.forEach((e) => visit(e, component, node, allowPadding));
          break;
        case "ConditionalExpression":
          visit(v.consequent, component, node, allowPadding);
          visit(v.alternate, component, node, allowPadding);
          break;
        case "LogicalExpression":
          visit(v.right, component, node, allowPadding);
          break;
        case "JSXExpressionContainer":
          visit(v.expression, component, node, allowPadding);
          break;
      }
    };
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || !DS_CONTROLS.includes(node.name.name)) return;
        const attrs = node.attributes.filter((a) => a.type === "JSXAttribute");
        const classNameAttr = attrs.find((a) => a.name.name === "className");
        if (!classNameAttr || !classNameAttr.value) return;
        // Inline fields removed their own padding; the call site provides the
        // spacing inside the surrounding frame — padding is layout there.
        const variantAttr = attrs.find((a) => a.name.name === "variant");
        const allowPadding =
          !!variantAttr &&
          !!variantAttr.value &&
          variantAttr.value.type === "Literal" &&
          variantAttr.value.value === "inline";
        visit(classNameAttr.value, node.name.name, classNameAttr, allowPadding);
      },
    };
  },
};

export default {
  rules: {
    "no-hardcoded-colors": noHardcodedColors,
    "no-raw-ui-elements": noRawUiElements,
    "layout-only-classname": layoutOnlyClassname,
  },
};
