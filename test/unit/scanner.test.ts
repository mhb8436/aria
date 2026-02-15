import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanPage } from "../../src/core/scanner.js";

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

describe("Scanner", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createFixtureServer(0);
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("should scan an accessible page with few violations", async () => {
    const result = await scanPage(`${baseUrl}/pass/basic-accessible.html`);
    expect(result.url).toContain("basic-accessible");
    expect(result.timestamp).toBeTruthy();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.summary.totalItems).toBe(33);
  });

  it("should detect missing alt text violations", async () => {
    const result = await scanPage(`${baseUrl}/fail/missing-alt.html`);
    const altViolations = result.violations.filter(
      (v) => v.kwcagId === "5.1.1",
    );
    expect(altViolations.length).toBeGreaterThan(0);

    const totalNodes = altViolations.reduce(
      (sum, v) => sum + v.nodes.length,
      0,
    );
    expect(totalNodes).toBeGreaterThanOrEqual(2);
  });

  it("should detect missing language attribute", async () => {
    const result = await scanPage(`${baseUrl}/fail/no-lang.html`);
    const langViolations = result.violations.filter(
      (v) => v.kwcagId === "7.1.1",
    );
    expect(langViolations.length).toBeGreaterThan(0);
  });

  it("should detect missing form labels", async () => {
    const result = await scanPage(`${baseUrl}/fail/missing-labels.html`);
    const labelViolations = result.violations.filter(
      (v) => v.kwcagId === "7.3.2",
    );
    expect(labelViolations.length).toBeGreaterThan(0);
  });

  it("should detect low contrast text", async () => {
    const result = await scanPage(`${baseUrl}/fail/low-contrast.html`);
    const contrastViolations = result.violations.filter(
      (v) => v.kwcagId === "5.4.3",
    );
    expect(contrastViolations.length).toBeGreaterThan(0);
  });

  it("should detect missing page title", async () => {
    const result = await scanPage(`${baseUrl}/fail/no-title.html`);
    const titleViolations = result.violations.filter(
      (v) => v.kwcagId === "6.4.2",
    );
    expect(titleViolations.length).toBeGreaterThan(0);
  });

  it("should detect duplicate ARIA IDs as incomplete", async () => {
    const result = await scanPage(`${baseUrl}/fail/duplicate-ids.html`);
    expect(result.incomplete).toContain("8.1.1");
  });

  it("should detect bad ARIA usage", async () => {
    const result = await scanPage(`${baseUrl}/fail/bad-aria.html`);
    const ariaViolations = result.violations.filter(
      (v) => v.kwcagId === "8.2.1",
    );
    expect(ariaViolations.length).toBeGreaterThan(0);
  });

  it("should include summary with compliance rate", async () => {
    const result = await scanPage(`${baseUrl}/pass/basic-accessible.html`);
    expect(result.summary.complianceRate).toBeGreaterThanOrEqual(0);
    expect(result.summary.complianceRate).toBeLessThanOrEqual(100);
    expect(result.summary.byPrinciple[1]).toBeDefined();
    expect(result.summary.byPrinciple[2]).toBeDefined();
    expect(result.summary.byPrinciple[3]).toBeDefined();
    expect(result.summary.byPrinciple[4]).toBeDefined();
  });

  it("violation nodes should have html and target", async () => {
    const result = await scanPage(`${baseUrl}/fail/missing-alt.html`);
    const violations = result.violations.filter(
      (v) => v.kwcagId === "5.1.1",
    );
    expect(violations.length).toBeGreaterThan(0);
    const firstNode = violations[0].nodes[0];
    expect(firstNode.html).toBeTruthy();
    expect(firstNode.target.length).toBeGreaterThan(0);
  });
});
