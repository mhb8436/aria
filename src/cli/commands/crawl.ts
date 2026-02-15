import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { writeFileSync } from "node:fs";
import { crawlSite } from "../../core/crawler.js";
import { formatScanResult } from "../output.js";

export function createCrawlCommand(): Command {
  const cmd = new Command("crawl")
    .description(
      "Crawl a website and scan all pages for accessibility issues",
    )
    .argument("<url>", "Starting URL to crawl")
    .option("-d, --depth <n>", "Maximum crawl depth", "3")
    .option("-m, --max-pages <n>", "Maximum pages to scan", "50")
    .option("-c, --concurrency <n>", "Parallel browser instances", "3")
    .option("-o, --output <file>", "Save results to file (JSON)")
    .option("--no-headless", "Run browser in headed mode")
    .action(async (url: string, options) => {
      const spinner = ora("Starting crawl...").start();

      try {
        const result = await crawlSite(
          url,
          {
            depth: Number(options.depth),
            maxPages: Number(options.maxPages),
            concurrency: Number(options.concurrency),
            headless: options.headless !== false,
          },
          (info) => {
            spinner.text = `[${info.current}/${info.total}] ${info.status}: ${info.url}`;
          },
        );

        spinner.stop();

        process.stdout.write(
          chalk.bold(
            `\nCrawl complete: ${result.pagesScanned} pages in ${(result.duration / 1000).toFixed(1)}s\n`,
          ),
        );
        process.stdout.write(
          `Violations: ${result.summary.totalViolations} total, ${result.summary.uniqueKwcagViolations} unique KWCAG items\n\n`,
        );

        for (const entry of result.pageResults) {
          if (entry.status === "success" && entry.scanResult) {
            process.stdout.write(formatScanResult(entry.scanResult) + "\n");
          } else if (entry.status === "error") {
            process.stdout.write(
              chalk.red(`Error: ${entry.url} - ${entry.errorMessage}\n`),
            );
          }
        }

        if (options.output) {
          writeFileSync(options.output, JSON.stringify(result, null, 2));
          process.stdout.write(`\nResults saved to: ${options.output}\n`);
        }
      } catch (err) {
        spinner.fail("Crawl failed");
        const message =
          err instanceof Error ? err.message : String(err);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });

  return cmd;
}
