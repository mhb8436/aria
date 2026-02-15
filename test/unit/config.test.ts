import { describe, it, expect } from "vitest";
import {
  DEFAULT_SCAN_CONFIG,
  DEFAULT_CRAWL_CONFIG,
  mergeScanConfig,
  mergeCrawlConfig,
} from "../../src/core/config.js";

describe("Config", () => {
  it("should have sensible scan defaults", () => {
    expect(DEFAULT_SCAN_CONFIG.timeout).toBe(30_000);
    expect(DEFAULT_SCAN_CONFIG.headless).toBe(true);
    expect(DEFAULT_SCAN_CONFIG.locale).toBe("ko-KR");
    expect(DEFAULT_SCAN_CONFIG.viewport.width).toBe(1280);
  });

  it("should have sensible crawl defaults", () => {
    expect(DEFAULT_CRAWL_CONFIG.depth).toBe(3);
    expect(DEFAULT_CRAWL_CONFIG.maxPages).toBe(50);
    expect(DEFAULT_CRAWL_CONFIG.concurrency).toBe(3);
    expect(DEFAULT_CRAWL_CONFIG.sameDomain).toBe(true);
  });

  it("should merge scan config with overrides", () => {
    const config = mergeScanConfig({ timeout: 60_000, headless: false });
    expect(config.timeout).toBe(60_000);
    expect(config.headless).toBe(false);
    expect(config.locale).toBe("ko-KR");
  });

  it("should merge crawl config with overrides", () => {
    const config = mergeCrawlConfig({ depth: 5, maxPages: 100 });
    expect(config.depth).toBe(5);
    expect(config.maxPages).toBe(100);
    expect(config.concurrency).toBe(3);
  });
});
