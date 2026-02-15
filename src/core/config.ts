export interface ScanConfig {
  readonly url: string;
  readonly timeout: number;
  readonly waitUntil: "load" | "domcontentloaded" | "networkidle";
  readonly viewport: { readonly width: number; readonly height: number };
  readonly headless: boolean;
  readonly locale: string;
}

export interface CrawlConfig extends ScanConfig {
  readonly depth: number;
  readonly maxPages: number;
  readonly concurrency: number;
  readonly sameDomain: boolean;
  readonly excludePatterns: readonly string[];
}

export interface ReportConfig {
  readonly format: "json" | "html" | "excel";
  readonly output: string;
  readonly dbPath: string;
  readonly includeScreenshots: boolean;
}

export const DEFAULT_SCAN_CONFIG: ScanConfig = {
  url: "",
  timeout: 30_000,
  waitUntil: "load",
  viewport: { width: 1280, height: 720 },
  headless: true,
  locale: "ko-KR",
};

export const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  ...DEFAULT_SCAN_CONFIG,
  depth: 3,
  maxPages: 50,
  concurrency: 3,
  sameDomain: true,
  excludePatterns: [],
};

export function mergeScanConfig(
  overrides: Partial<ScanConfig>,
): ScanConfig {
  return { ...DEFAULT_SCAN_CONFIG, ...overrides };
}

export function mergeCrawlConfig(
  overrides: Partial<CrawlConfig>,
): CrawlConfig {
  return { ...DEFAULT_CRAWL_CONFIG, ...overrides };
}
