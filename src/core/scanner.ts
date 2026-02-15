import { chromium, type Browser, type Page } from "playwright";
import type { AxeResults, Result as AxeViolation } from "axe-core";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { type ScanConfig, DEFAULT_SCAN_CONFIG } from "./config.js";
import {
  KWCAG_ITEMS,
  getKwcagByAxeRule,
  getKwcagById,
} from "../rules/kwcag-map.js";
import { CUSTOM_RULES } from "../rules/custom/index.js";

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(
  require.resolve("axe-core/axe.min.js"),
  "utf-8",
);

export type Severity = "error" | "warning" | "info" | "pass";

export interface ViolationNode {
  readonly html: string;
  readonly target: readonly string[];
  readonly failureSummary: string;
}

export interface KwcagViolation {
  readonly kwcagId: string;
  readonly kwcagName: string;
  readonly principle: number;
  readonly principleName: string;
  readonly severity: Severity;
  readonly axeRuleId: string;
  readonly axeDescription: string;
  readonly impact: string;
  readonly nodes: readonly ViolationNode[];
}

export interface ScanResult {
  readonly url: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly violations: readonly KwcagViolation[];
  readonly passes: readonly string[];
  readonly incomplete: readonly string[];
  readonly inapplicable: readonly string[];
  readonly summary: ScanSummary;
}

export interface ScanSummary {
  readonly totalItems: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly incompleteCount: number;
  readonly complianceRate: number;
  readonly byPrinciple: Record<
    number,
    { total: number; pass: number; fail: number }
  >;
}

function mapImpactToSeverity(impact: string | undefined | null): Severity {
  switch (impact) {
    case "critical":
    case "serious":
      return "error";
    case "moderate":
      return "warning";
    case "minor":
      return "info";
    default:
      return "warning";
  }
}

function mapAxeViolationToKwcag(
  violation: AxeViolation,
): KwcagViolation | null {
  const kwcag = getKwcagByAxeRule(violation.id);
  if (!kwcag) return null;

  return {
    kwcagId: kwcag.id,
    kwcagName: kwcag.name,
    principle: kwcag.principle,
    principleName: kwcag.principleName,
    severity: mapImpactToSeverity(violation.impact),
    axeRuleId: violation.id,
    axeDescription: violation.description,
    impact: violation.impact ?? "unknown",
    nodes: violation.nodes.map((node) => ({
      html: node.html,
      target: node.target.map(String),
      failureSummary: node.failureSummary ?? "",
    })),
  };
}

function buildSummary(
  violations: readonly KwcagViolation[],
  passedKwcagIds: ReadonlySet<string>,
  incompleteKwcagIds: ReadonlySet<string>,
): ScanSummary {
  const failedKwcagIds = new Set(violations.map((v) => v.kwcagId));

  const byPrinciple: Record<
    number,
    { total: number; pass: number; fail: number }
  > = {
    1: { total: 0, pass: 0, fail: 0 },
    2: { total: 0, pass: 0, fail: 0 },
    3: { total: 0, pass: 0, fail: 0 },
    4: { total: 0, pass: 0, fail: 0 },
  };

  for (const item of KWCAG_ITEMS) {
    byPrinciple[item.principle].total++;
    if (failedKwcagIds.has(item.id)) {
      byPrinciple[item.principle].fail++;
    } else if (passedKwcagIds.has(item.id)) {
      byPrinciple[item.principle].pass++;
    }
  }

  const totalItems = KWCAG_ITEMS.length;
  const failCount = failedKwcagIds.size;
  const passCount = passedKwcagIds.size - failCount;
  const incompleteCount = incompleteKwcagIds.size;
  const effectivePass = Math.max(0, passCount);
  const complianceRate =
    totalItems > 0 ? (effectivePass / totalItems) * 100 : 0;

  return {
    totalItems,
    passCount: effectivePass,
    failCount,
    incompleteCount,
    complianceRate,
    byPrinciple,
  };
}

export async function scanPage(
  pageOrUrl: Page | string,
  config: Partial<ScanConfig> = {},
): Promise<ScanResult> {
  const cfg = { ...DEFAULT_SCAN_CONFIG, ...config };
  let browser: Browser | null = null;
  let page: Page;
  let shouldCloseBrowser = false;

  const startTime = Date.now();

  if (typeof pageOrUrl === "string") {
    cfg.url !== "" || (cfg as { url: string }).url;
    browser = await chromium.launch({ headless: cfg.headless });
    const context = await browser.newContext({
      viewport: cfg.viewport,
      locale: cfg.locale,
    });
    page = await context.newPage();
    shouldCloseBrowser = true;

    await page.goto(pageOrUrl, {
      waitUntil: cfg.waitUntil,
      timeout: cfg.timeout,
    });
  } else {
    page = pageOrUrl;
  }

  const url = page.url();

  try {
    await page.evaluate(AXE_SOURCE);

    const axeResults: AxeResults = await page.evaluate(() => {
      // @ts-expect-error axe is injected via evaluate
      return window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
        },
        resultTypes: ["violations", "passes", "incomplete", "inapplicable"],
      });
    });

    const violations: KwcagViolation[] = [];
    for (const v of axeResults.violations) {
      const mapped = mapAxeViolationToKwcag(v);
      if (mapped) {
        violations.push(mapped);
      }
    }

    const passedKwcagIds = new Set<string>();
    for (const p of axeResults.passes) {
      const kwcag = getKwcagByAxeRule(p.id);
      if (kwcag) passedKwcagIds.add(kwcag.id);
    }

    const incompleteKwcagIds = new Set<string>();
    for (const inc of axeResults.incomplete) {
      const kwcag = getKwcagByAxeRule(inc.id);
      if (kwcag) incompleteKwcagIds.add(kwcag.id);
    }

    const inapplicableKwcagIds = new Set<string>();
    for (const ina of axeResults.inapplicable) {
      const kwcag = getKwcagByAxeRule(ina.id);
      if (kwcag) inapplicableKwcagIds.add(kwcag.id);
    }

    for (const rule of CUSTOM_RULES) {
      const result = await rule.run(page);
      if (result.nodes.length > 0 && result.severity !== "pass") {
        const kwcag = getKwcagById(result.kwcagId);
        if (kwcag) {
          violations.push({
            kwcagId: result.kwcagId,
            kwcagName: kwcag.name,
            principle: kwcag.principle,
            principleName: kwcag.principleName,
            severity: result.severity,
            axeRuleId: result.ruleId,
            axeDescription: kwcag.description,
            impact: result.severity === "error" ? "serious" : "moderate",
            nodes: result.nodes.map((n) => ({
              html: n.html,
              target: [n.selector],
              failureSummary: n.message,
            })),
          });
        }
      } else if (result.severity === "pass") {
        passedKwcagIds.add(result.kwcagId);
      }
    }

    const duration = Date.now() - startTime;

    return {
      url,
      timestamp: new Date().toISOString(),
      duration,
      violations,
      passes: [...passedKwcagIds],
      incomplete: [...incompleteKwcagIds],
      inapplicable: [...inapplicableKwcagIds],
      summary: buildSummary(violations, passedKwcagIds, incompleteKwcagIds),
    };
  } finally {
    if (shouldCloseBrowser && browser) {
      await browser.close();
    }
  }
}

export async function createBrowser(
  headless = true,
): Promise<Browser> {
  return chromium.launch({ headless });
}
