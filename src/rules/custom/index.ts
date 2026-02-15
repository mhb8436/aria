import type { CustomRule } from "./types.js";
import { skipNavRule } from "./skip-nav.js";
import { autoPlayRule } from "./auto-play.js";
import { blinkFlashRule } from "./blink-flash.js";
import { pageTitleRule } from "./page-title.js";
import { tableStructureRule } from "./table-structure.js";
import { langAttrRule } from "./lang-attr.js";
import { linkTextRule } from "./link-text.js";
import { onInputRule } from "./on-input.js";
import { focusVisibleRule } from "./focus-visible.js";

export const CUSTOM_RULES: readonly CustomRule[] = [
  skipNavRule,
  autoPlayRule,
  blinkFlashRule,
  pageTitleRule,
  tableStructureRule,
  langAttrRule,
  linkTextRule,
  onInputRule,
  focusVisibleRule,
];

export function getCustomRuleById(id: string): CustomRule | undefined {
  return CUSTOM_RULES.find((r) => r.id === id);
}

export function getCustomRulesByKwcagId(
  kwcagId: string,
): readonly CustomRule[] {
  return CUSTOM_RULES.filter((r) => r.kwcagId === kwcagId);
}

export type { CustomRule, CustomRuleResult, CustomRuleNode } from "./types.js";
