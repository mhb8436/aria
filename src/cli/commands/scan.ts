import { Command } from "commander";
import ora from "ora";
import { writeFileSync } from "node:fs";
import { scanPage } from "../../core/scanner.js";
import { AriaStore } from "../../store/db.js";
import {
  formatScanResult,
  formatViolationDetail,
} from "../output.js";

export function createScanCommand(): Command {
  const cmd = new Command("scan")
    .description("Scan a single page for KWCAG 2.2 accessibility issues")
    .argument("<url>", "URL to scan")
    .option("-o, --output <file>", "Save results to file (JSON)")
    .option("--db <path>", "SQLite database path to store results")
    .option(
      "-t, --timeout <ms>",
      "Page load timeout in milliseconds",
      "30000",
    )
    .option("--no-headless", "Run browser in headed mode")
    .option("--verbose", "Show detailed violation information")
    .option("--ci", "CI mode: exit with code 1 if violations found")
    .option(
      "--threshold <n>",
      "Maximum allowed violations (CI mode)",
      "0",
    )
    .action(async (url: string, options) => {
      const spinner = ora("Scanning page for accessibility issues...").start();

      try {
        const result = await scanPage(url, {
          timeout: Number(options.timeout),
          headless: options.headless !== false,
        });

        spinner.stop();

        const output = formatScanResult(result);
        process.stdout.write(output + "\n");

        if (options.verbose && result.violations.length > 0) {
          process.stdout.write("\n=== 상세 위반 내용 ===\n\n");
          for (const v of result.violations) {
            process.stdout.write(formatViolationDetail(v) + "\n\n");
          }
        }

        if (options.output) {
          writeFileSync(options.output, JSON.stringify(result, null, 2));
          process.stdout.write(`\nResults saved to: ${options.output}\n`);
        }

        if (options.db) {
          const store = new AriaStore(options.db);
          const scanId = store.saveScanResult(result);
          store.close();
          process.stdout.write(`\nStored in DB (scan ID: ${scanId})\n`);
        }

        if (options.ci) {
          const threshold = Number(options.threshold);
          const violationCount = result.violations.length;
          if (violationCount > threshold) {
            process.stderr.write(
              `\nCI check failed: ${violationCount} violations (threshold: ${threshold})\n`,
            );
            process.exitCode = 1;
          }
        }
      } catch (err) {
        spinner.fail("Scan failed");
        const message =
          err instanceof Error ? err.message : String(err);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });

  return cmd;
}
