import { describe, it, expect } from "vitest";
import {
  relativeLuminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  parseHexColor,
  parseRGBString,
} from "../../src/core/contrast.js";

describe("Contrast Calculator", () => {
  describe("relativeLuminance", () => {
    it("should return 0 for black", () => {
      expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 4);
    });

    it("should return 1 for white", () => {
      expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(
        1,
        4,
      );
    });

    it("should calculate correct luminance for mid-gray", () => {
      const lum = relativeLuminance({ r: 128, g: 128, b: 128 });
      expect(lum).toBeGreaterThan(0.2);
      expect(lum).toBeLessThan(0.3);
    });
  });

  describe("contrastRatio", () => {
    it("should return 21:1 for black on white", () => {
      const ratio = contrastRatio(
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
      );
      expect(ratio).toBeCloseTo(21, 0);
    });

    it("should return 1:1 for same colors", () => {
      const ratio = contrastRatio(
        { r: 128, g: 128, b: 128 },
        { r: 128, g: 128, b: 128 },
      );
      expect(ratio).toBeCloseTo(1, 2);
    });

    it("should be symmetric", () => {
      const c1 = { r: 255, g: 0, b: 0 };
      const c2 = { r: 0, g: 0, b: 255 };
      expect(contrastRatio(c1, c2)).toBeCloseTo(contrastRatio(c2, c1), 4);
    });
  });

  describe("meetsAA", () => {
    it("should pass normal text at 4.5:1", () => {
      expect(meetsAA(4.5, false)).toBe(true);
    });

    it("should fail normal text at 4.4:1", () => {
      expect(meetsAA(4.4, false)).toBe(false);
    });

    it("should pass large text at 3.0:1", () => {
      expect(meetsAA(3.0, true)).toBe(true);
    });

    it("should fail large text at 2.9:1", () => {
      expect(meetsAA(2.9, true)).toBe(false);
    });
  });

  describe("meetsAAA", () => {
    it("should pass normal text at 7.0:1", () => {
      expect(meetsAAA(7.0, false)).toBe(true);
    });

    it("should pass large text at 4.5:1", () => {
      expect(meetsAAA(4.5, true)).toBe(true);
    });
  });

  describe("parseHexColor", () => {
    it("should parse 6-digit hex", () => {
      expect(parseHexColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("should parse 3-digit hex", () => {
      expect(parseHexColor("#f00")).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("should parse without hash", () => {
      expect(parseHexColor("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    });
  });

  describe("parseRGBString", () => {
    it("should parse rgb()", () => {
      expect(parseRGBString("rgb(255, 0, 128)")).toEqual({
        r: 255,
        g: 0,
        b: 128,
      });
    });

    it("should parse rgba()", () => {
      expect(parseRGBString("rgba(0, 128, 255, 0.5)")).toEqual({
        r: 0,
        g: 128,
        b: 255,
      });
    });

    it("should return null for invalid string", () => {
      expect(parseRGBString("not-a-color")).toBeNull();
    });
  });
});
