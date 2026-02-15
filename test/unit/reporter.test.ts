import { describe, it, expect, afterEach } from "vitest";
import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ScanResult } from "../../src/core/scanner.js";
import { generateJsonReport } from "../../src/reporter/json.js";
import { generateHtmlReport } from "../../src/reporter/html.js";
import { generateExcelReport } from "../../src/reporter/excel.js";

const TMP_DIR = resolve(import.meta.dirname, "../../dist");

function makeMockResult(): ScanResult {
  return {
    url: "http://example.com",
    timestamp: "2026-02-15T12:00:00.000Z",
    duration: 1500,
    violations: [
      {
        kwcagId: "5.1.1",
        kwcagName: "적절한 대체 텍스트 제공",
        principle: 1,
        principleName: "인식의 용이성",
        severity: "error",
        axeRuleId: "image-alt",
        axeDescription: "Images must have alternative text",
        impact: "serious",
        nodes: [
          {
            html: '<img src="test.jpg">',
            target: ["img"],
            failureSummary: "Element does not have an alt attribute",
          },
        ],
      },
      {
        kwcagId: "5.4.3",
        kwcagName: "텍스트 콘텐츠의 명도 대비",
        principle: 1,
        principleName: "인식의 용이성",
        severity: "warning",
        axeRuleId: "color-contrast",
        axeDescription: "Ensures the contrast between foreground and background colors meets WCAG 2 AA minimum",
        impact: "moderate",
        nodes: [
          {
            html: '<p style="color: #aaa">Low contrast</p>',
            target: ["p"],
            failureSummary: "Element has insufficient color contrast",
          },
        ],
      },
    ],
    passes: ["7.1.1", "6.4.2", "8.1.1"],
    incomplete: [],
    inapplicable: [],
    summary: {
      totalItems: 33,
      passCount: 20,
      failCount: 2,
      incompleteCount: 0,
      complianceRate: 60.6,
      byPrinciple: {
        1: { total: 9, pass: 5, fail: 2 },
        2: { total: 15, pass: 10, fail: 0 },
        3: { total: 7, pass: 3, fail: 0 },
        4: { total: 2, pass: 2, fail: 0 },
      },
    },
  };
}

const filesToClean: string[] = [];

afterEach(() => {
  for (const f of filesToClean) {
    if (existsSync(f)) unlinkSync(f);
  }
  filesToClean.length = 0;
});

describe("JSON Reporter", () => {
  it("should generate valid JSON report", () => {
    const output = resolve(TMP_DIR, "test-report.json");
    filesToClean.push(output);

    generateJsonReport(makeMockResult(), output);

    expect(existsSync(output)).toBe(true);
    const content = JSON.parse(readFileSync(output, "utf-8"));
    expect(content.url).toBe("http://example.com");
    expect(content.violations).toHaveLength(2);
  });
});

describe("HTML Reporter", () => {
  it("should generate HTML report with correct structure", () => {
    const output = resolve(TMP_DIR, "test-report.html");
    filesToClean.push(output);

    generateHtmlReport(makeMockResult(), output);

    expect(existsSync(output)).toBe(true);
    const content = readFileSync(output, "utf-8");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("KWCAG 2.2");
    expect(content).toContain("http://example.com");
    expect(content).toContain("60.6%");
    expect(content).toContain("5.1.1");
    expect(content).toContain("적절한 대체 텍스트 제공");
  });

  it("should include checklist with all 33 items", () => {
    const output = resolve(TMP_DIR, "test-report-checklist.html");
    filesToClean.push(output);

    generateHtmlReport(makeMockResult(), output);

    const content = readFileSync(output, "utf-8");
    expect(content).toContain("8.2.1");
    expect(content).toContain("웹 애플리케이션 접근성 준수");
  });
});

describe("Excel Reporter", () => {
  it("should generate Excel file", async () => {
    const output = resolve(TMP_DIR, "test-report.xlsx");
    filesToClean.push(output);

    await generateExcelReport(makeMockResult(), output);

    expect(existsSync(output)).toBe(true);
    const stats = readFileSync(output);
    expect(stats.length).toBeGreaterThan(0);
  });
});
