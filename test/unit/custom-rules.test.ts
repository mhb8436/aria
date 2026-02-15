import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { skipNavRule } from "../../src/rules/custom/skip-nav.js";
import { autoPlayRule } from "../../src/rules/custom/auto-play.js";
import { blinkFlashRule } from "../../src/rules/custom/blink-flash.js";
import { pageTitleRule } from "../../src/rules/custom/page-title.js";
import { tableStructureRule } from "../../src/rules/custom/table-structure.js";
import { langAttrRule } from "../../src/rules/custom/lang-attr.js";
import { linkTextRule } from "../../src/rules/custom/link-text.js";
import { onInputRule } from "../../src/rules/custom/on-input.js";
import { CUSTOM_RULES } from "../../src/rules/custom/index.js";

const FIXTURES_DIR = resolve(import.meta.dirname, "../fixtures");

function createFixtureServer(port: number): Server {
  const server = createServer((req, res) => {
    const urlPath = req.url === "/" ? "/pass/basic-accessible.html" : req.url;
    const filePath = resolve(FIXTURES_DIR, `.${urlPath}`);
    try {
      const content = readFileSync(filePath, "utf-8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  return server;
}

describe("Custom Rules", () => {
  let server: Server;
  let browser: Browser;
  let baseUrl: string;

  beforeAll(async () => {
    server = createFixtureServer(0);
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  async function loadPage(path: string): Promise<Page> {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}${path}`);
    return page;
  }

  describe("Registry", () => {
    it("should have 9 custom rules registered", () => {
      expect(CUSTOM_RULES.length).toBe(9);
    });

    it("each rule should have required fields", () => {
      for (const rule of CUSTOM_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.kwcagId).toMatch(/^\d+\.\d+\.\d+$/);
        expect(rule.name).toBeTruthy();
        expect(typeof rule.run).toBe("function");
      }
    });
  });

  describe("skip-nav", () => {
    it("should detect missing skip navigation", async () => {
      const page = await loadPage("/fail/no-skip-nav.html");
      try {
        const result = await skipNavRule.run(page);
        expect(result.severity).not.toBe("pass");
        expect(result.nodes.length).toBeGreaterThan(0);
      } finally {
        await page.close();
      }
    });

    it("should pass when skip navigation exists", async () => {
      const page = await loadPage("/pass/with-skip-nav.html");
      try {
        const result = await skipNavRule.run(page);
        expect(result.severity).toBe("pass");
        expect(result.nodes).toHaveLength(0);
      } finally {
        await page.close();
      }
    });
  });

  describe("auto-play", () => {
    it("should detect autoplay media", async () => {
      const page = await loadPage("/fail/autoplay.html");
      try {
        const result = await autoPlayRule.run(page);
        expect(result.severity).not.toBe("pass");
        expect(result.nodes.length).toBeGreaterThan(0);
      } finally {
        await page.close();
      }
    });

    it("should pass on page without autoplay", async () => {
      const page = await loadPage("/pass/basic-accessible.html");
      try {
        const result = await autoPlayRule.run(page);
        expect(result.severity).toBe("pass");
      } finally {
        await page.close();
      }
    });
  });

  describe("blink-flash", () => {
    it("should detect marquee element", async () => {
      const page = await loadPage("/fail/blink-content.html");
      try {
        const result = await blinkFlashRule.run(page);
        expect(result.severity).not.toBe("pass");
        expect(
          result.nodes.some((n) => n.message.includes("marquee")),
        ).toBe(true);
      } finally {
        await page.close();
      }
    });
  });

  describe("page-title", () => {
    it("should detect missing page title", async () => {
      const page = await loadPage("/fail/no-title.html");
      try {
        const result = await pageTitleRule.run(page);
        expect(result.severity).not.toBe("pass");
        expect(result.nodes.length).toBeGreaterThan(0);
      } finally {
        await page.close();
      }
    });

    it("should pass when title exists", async () => {
      const page = await loadPage("/pass/basic-accessible.html");
      try {
        const result = await pageTitleRule.run(page);
        const titleIssues = result.nodes.filter((n) =>
          n.message.includes("제목(title)"),
        );
        expect(titleIssues).toHaveLength(0);
      } finally {
        await page.close();
      }
    });
  });

  describe("table-structure", () => {
    it("should detect table without caption and scope", async () => {
      const page = await loadPage("/fail/bad-table.html");
      try {
        const result = await tableStructureRule.run(page);
        expect(result.severity).not.toBe("pass");
        expect(result.nodes.length).toBeGreaterThan(0);
      } finally {
        await page.close();
      }
    });

    it("should pass for well-structured table", async () => {
      const page = await loadPage("/pass/basic-accessible.html");
      try {
        const result = await tableStructureRule.run(page);
        expect(result.severity).toBe("pass");
      } finally {
        await page.close();
      }
    });
  });

  describe("lang-attr", () => {
    it("should detect missing lang attribute", async () => {
      const page = await loadPage("/fail/no-lang.html");
      try {
        const result = await langAttrRule.run(page);
        expect(result.severity).not.toBe("pass");
        expect(result.nodes.length).toBeGreaterThan(0);
      } finally {
        await page.close();
      }
    });

    it("should pass when lang is set", async () => {
      const page = await loadPage("/pass/basic-accessible.html");
      try {
        const result = await langAttrRule.run(page);
        expect(result.severity).toBe("pass");
      } finally {
        await page.close();
      }
    });
  });

  describe("link-text", () => {
    it("should detect vague link text", async () => {
      const page = await loadPage("/fail/bad-links.html");
      try {
        const result = await linkTextRule.run(page);
        expect(result.severity).not.toBe("pass");
        expect(result.nodes.length).toBeGreaterThanOrEqual(2);
      } finally {
        await page.close();
      }
    });
  });

  describe("on-input", () => {
    it("should detect onchange auto-submit", async () => {
      const page = await loadPage("/fail/onchange-submit.html");
      try {
        const result = await onInputRule.run(page);
        expect(result.severity).not.toBe("pass");
        expect(result.nodes.length).toBeGreaterThanOrEqual(2);
      } finally {
        await page.close();
      }
    });
  });
});
