import type { Page } from "playwright";
import type { Severity } from "../../core/scanner.js";

export interface CustomRuleResult {
  readonly ruleId: string;
  readonly kwcagId: string;
  readonly severity: Severity;
  readonly nodes: readonly CustomRuleNode[];
}

export interface CustomRuleNode {
  readonly html: string;
  readonly selector: string;
  readonly message: string;
}

export interface CustomRule {
  readonly id: string;
  readonly kwcagId: string;
  readonly name: string;
  readonly description: string;
  run(page: Page): Promise<CustomRuleResult>;
}
