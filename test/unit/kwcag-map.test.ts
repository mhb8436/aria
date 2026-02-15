import { describe, it, expect } from "vitest";
import {
  KWCAG_ITEMS,
  getKwcagById,
  getKwcagByPrinciple,
  getKwcagByAxeRule,
  getAllAxeRuleIds,
  PRINCIPLE_NAMES,
  PRINCIPLE_ITEM_COUNTS,
} from "../../src/rules/kwcag-map.js";

describe("KWCAG 2.2 Mapping", () => {
  it("should have exactly 33 items", () => {
    expect(KWCAG_ITEMS).toHaveLength(33);
  });

  it("should have correct principle counts", () => {
    const p1 = KWCAG_ITEMS.filter((i) => i.principle === 1);
    const p2 = KWCAG_ITEMS.filter((i) => i.principle === 2);
    const p3 = KWCAG_ITEMS.filter((i) => i.principle === 3);
    const p4 = KWCAG_ITEMS.filter((i) => i.principle === 4);

    expect(p1).toHaveLength(9);
    expect(p2).toHaveLength(15);
    expect(p3).toHaveLength(7);
    expect(p4).toHaveLength(2);
  });

  it("should get item by id", () => {
    const item = getKwcagById("5.1.1");
    expect(item).toBeDefined();
    expect(item!.name).toBe("적절한 대체 텍스트 제공");
    expect(item!.principle).toBe(1);
  });

  it("should return undefined for unknown id", () => {
    expect(getKwcagById("99.99.99")).toBeUndefined();
  });

  it("should get items by principle", () => {
    const p1Items = getKwcagByPrinciple(1);
    expect(p1Items).toHaveLength(9);
    expect(p1Items.every((i) => i.principle === 1)).toBe(true);
  });

  it("should get item by axe rule id", () => {
    const item = getKwcagByAxeRule("image-alt");
    expect(item).toBeDefined();
    expect(item!.id).toBe("5.1.1");
  });

  it("should return undefined for unmapped axe rule", () => {
    expect(getKwcagByAxeRule("nonexistent-rule")).toBeUndefined();
  });

  it("should collect all unique axe rule ids", () => {
    const ids = getAllAxeRuleIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have all 4 principle names", () => {
    expect(Object.keys(PRINCIPLE_NAMES)).toHaveLength(4);
    expect(PRINCIPLE_NAMES[1]).toBe("인식의 용이성");
    expect(PRINCIPLE_NAMES[2]).toBe("운용의 용이성");
    expect(PRINCIPLE_NAMES[3]).toBe("이해의 용이성");
    expect(PRINCIPLE_NAMES[4]).toBe("견고성");
  });

  it("principle item counts should match actual items", () => {
    for (const [pNum, count] of Object.entries(PRINCIPLE_ITEM_COUNTS)) {
      const items = getKwcagByPrinciple(Number(pNum));
      expect(items.length).toBe(count);
    }
  });

  it("each item should have required fields", () => {
    for (const item of KWCAG_ITEMS) {
      expect(item.id).toMatch(/^\d+\.\d+\.\d+$/);
      expect(item.name).toBeTruthy();
      expect(item.nameEn).toBeTruthy();
      expect([1, 2, 3, 4]).toContain(item.principle);
      expect(["A", "AA", "AAA"]).toContain(item.level);
      expect(item.description).toBeTruthy();
    }
  });

  it("auto-checkable items should have axe rules or custom rules", () => {
    const autoItems = KWCAG_ITEMS.filter((i) => i.auto === true);
    for (const item of autoItems) {
      const hasRules = item.axeRules.length > 0 || item.customRule;
      expect(hasRules).toBe(true);
    }
  });
});
