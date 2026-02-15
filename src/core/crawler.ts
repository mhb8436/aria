import type { Browser, Page } from "puppeteer-core";
import { type CrawlConfig, DEFAULT_CRAWL_CONFIG } from "./config.js";
import { launchBrowser } from "./browser.js";
import { scanPage, type ScanResult } from "./scanner.js";

export interface CrawlResult {
  readonly startUrl: string;
  readonly pagesScanned: number;
  readonly pageResults: readonly PageScanEntry[];
  readonly duration: number;
  readonly summary: CrawlSummary;
}

export interface PageScanEntry {
  readonly url: string;
  readonly status: "success" | "error";
  readonly scanResult?: ScanResult;
  readonly errorMessage?: string;
}

export interface CrawlSummary {
  readonly totalPages: number;
  readonly successPages: number;
  readonly errorPages: number;
  readonly totalViolations: number;
  readonly uniqueKwcagViolations: number;
}

export type CrawlProgressCallback = (info: {
  url: string;
  current: number;
  total: number;
  status: "scanning" | "done" | "error";
}) => void;

export async function crawlSite(
  startUrl: string,
  config: Partial<CrawlConfig> = {},
  onProgress?: CrawlProgressCallback,
): Promise<CrawlResult> {
  const cfg = { ...DEFAULT_CRAWL_CONFIG, ...config };
  const startTime = Date.now();

  const browser = await launchBrowser({
    headless: cfg.headless,
    locale: cfg.locale,
  });

  const visited = new Set<string>();
  const toVisit: Array<{ url: string; depth: number }> = [
    { url: normalizeUrl(startUrl), depth: 0 },
  ];
  const results: PageScanEntry[] = [];
  const baseHost = new URL(startUrl).host;

  try {
    while (toVisit.length > 0 && visited.size < cfg.maxPages) {
      const batch = toVisit.splice(
        0,
        Math.min(cfg.concurrency, cfg.maxPages - visited.size),
      );

      const batchPromises = batch.map(async ({ url, depth }) => {
        if (visited.has(url)) return;
        visited.add(url);

        onProgress?.({
          url,
          current: visited.size,
          total: Math.min(visited.size + toVisit.length, cfg.maxPages),
          status: "scanning",
        });

        try {
          const page = await browser.newPage();
          await page.setViewport(cfg.viewport);
          try {
            await page.goto(url, {
              waitUntil: cfg.waitUntil === "networkidle" ? "networkidle0" : cfg.waitUntil,
              timeout: cfg.timeout,
            });

            const scanResult = await scanPage(page);

            if (depth < cfg.depth) {
              const links = await extractLinks(page, baseHost, cfg);
              for (const link of links) {
                if (!visited.has(link)) {
                  toVisit.push({ url: link, depth: depth + 1 });
                }
              }
            }

            results.push({ url, status: "success", scanResult });

            onProgress?.({
              url,
              current: visited.size,
              total: Math.min(visited.size + toVisit.length, cfg.maxPages),
              status: "done",
            });
          } finally {
            await page.close();
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : String(err);
          results.push({ url, status: "error", errorMessage: message });

          onProgress?.({
            url,
            current: visited.size,
            total: Math.min(visited.size + toVisit.length, cfg.maxPages),
            status: "error",
          });
        }
      });

      await Promise.all(batchPromises);
    }
  } finally {
    await browser.close();
  }

  const duration = Date.now() - startTime;

  return {
    startUrl,
    pagesScanned: results.length,
    pageResults: results,
    duration,
    summary: buildCrawlSummary(results),
  };
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

async function extractLinks(
  page: Page,
  baseHost: string,
  config: CrawlConfig,
): Promise<string[]> {
  const rawLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((a) => {
        try {
          return new URL(
            a.getAttribute("href") ?? "",
            document.baseURI,
          ).toString();
        } catch {
          return null;
        }
      })
      .filter((url): url is string => url !== null);
  });

  return rawLinks
    .map(normalizeUrl)
    .filter((url) => {
      try {
        const parsed = new URL(url);
        if (config.sameDomain && parsed.host !== baseHost) return false;
        if (!["http:", "https:"].includes(parsed.protocol)) return false;
        if (config.excludePatterns.some((p) => url.includes(p))) return false;
        if (/\.(pdf|zip|png|jpg|jpeg|gif|svg|mp4|mp3|doc|xls|ppt)$/i.test(parsed.pathname)) return false;
        return true;
      } catch {
        return false;
      }
    });
}

function buildCrawlSummary(results: readonly PageScanEntry[]): CrawlSummary {
  const successPages = results.filter((r) => r.status === "success").length;
  const errorPages = results.filter((r) => r.status === "error").length;

  let totalViolations = 0;
  const uniqueKwcagIds = new Set<string>();

  for (const r of results) {
    if (r.scanResult) {
      totalViolations += r.scanResult.violations.length;
      for (const v of r.scanResult.violations) {
        uniqueKwcagIds.add(v.kwcagId);
      }
    }
  }

  return {
    totalPages: results.length,
    successPages,
    errorPages,
    totalViolations,
    uniqueKwcagViolations: uniqueKwcagIds.size,
  };
}
