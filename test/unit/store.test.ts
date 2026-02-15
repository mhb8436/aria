import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AriaStore } from "../../src/store/db.js";
import type { ScanResult } from "../../src/core/scanner.js";

function makeMockScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    url: "http://example.com",
    timestamp: new Date().toISOString(),
    duration: 1000,
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
            failureSummary: "Fix any of the following: Element does not have an alt attribute",
          },
        ],
      },
    ],
    passes: ["7.1.1", "6.4.2"],
    incomplete: [],
    inapplicable: [],
    summary: {
      totalItems: 33,
      passCount: 20,
      failCount: 1,
      incompleteCount: 0,
      complianceRate: 60.6,
      byPrinciple: {
        1: { total: 9, pass: 5, fail: 1 },
        2: { total: 15, pass: 10, fail: 0 },
        3: { total: 7, pass: 3, fail: 0 },
        4: { total: 2, pass: 2, fail: 0 },
      },
    },
    ...overrides,
  };
}

describe("AriaStore", () => {
  let store: AriaStore;

  beforeEach(() => {
    store = new AriaStore(":memory:");
  });

  afterEach(() => {
    store.close();
  });

  it("should save and retrieve scan results", () => {
    const result = makeMockScanResult();
    const scanId = store.saveScanResult(result);
    expect(scanId).toBeGreaterThan(0);

    const retrieved = store.getScanById(scanId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.url).toBe("http://example.com");
    expect(retrieved!.violations).toHaveLength(1);
  });

  it("should list scans", () => {
    store.saveScanResult(makeMockScanResult({ url: "http://a.com" }));
    store.saveScanResult(makeMockScanResult({ url: "http://b.com" }));

    const scans = store.getScans();
    expect(scans).toHaveLength(2);
    expect(scans[0].url).toBe("http://b.com");
    expect(scans[1].url).toBe("http://a.com");
  });

  it("should get violations by scan id", () => {
    const scanId = store.saveScanResult(makeMockScanResult());
    const violations = store.getViolationsByScan(scanId);
    expect(violations).toHaveLength(1);
    expect(violations[0].kwcagId).toBe("5.1.1");
    expect(violations[0].ruleId).toBe("image-alt");
  });

  it("should get violations by KWCAG id", () => {
    store.saveScanResult(makeMockScanResult());
    store.saveScanResult(makeMockScanResult());

    const violations = store.getViolationsByKwcag("5.1.1");
    expect(violations).toHaveLength(2);
  });

  it("should return null for nonexistent scan", () => {
    expect(store.getScanById(999)).toBeNull();
  });

  it("should save scan with no violations", () => {
    const result = makeMockScanResult({ violations: [] });
    const scanId = store.saveScanResult(result);
    const violations = store.getViolationsByScan(scanId);
    expect(violations).toHaveLength(0);
  });
});
