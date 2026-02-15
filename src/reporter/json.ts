import { writeFileSync } from "node:fs";
import type { ScanResult } from "../core/scanner.js";
import type { CrawlResult } from "../core/crawler.js";

export function generateJsonReport(
  result: ScanResult | CrawlResult,
  outputPath: string,
): void {
  writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
}
