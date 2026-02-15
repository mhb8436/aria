import { Command } from "commander";
import ora from "ora";
import { AriaStore } from "../../store/db.js";
import { generateJsonReport } from "../../reporter/json.js";
import { generateHtmlReport } from "../../reporter/html.js";
import { generateExcelReport } from "../../reporter/excel.js";

export function createReportCommand(): Command {
  const cmd = new Command("report")
    .description("Generate accessibility report from scan results")
    .option(
      "-f, --format <type>",
      "Report format: excel, html, json",
      "html",
    )
    .option("-o, --output <file>", "Output file path")
    .option("--db <path>", "SQLite database path", "aria-scan.db")
    .option("--scan-id <id>", "Specific scan ID to report")
    .action(async (options) => {
      const spinner = ora("Generating report...").start();

      try {
        const store = new AriaStore(options.db);

        let scanId: number;
        if (options.scanId) {
          scanId = Number(options.scanId);
        } else {
          const scans = store.getScans(1);
          if (scans.length === 0) {
            spinner.fail("No scan results found in database");
            store.close();
            process.exitCode = 1;
            return;
          }
          scanId = scans[0].id;
        }

        const result = store.getScanById(scanId);
        store.close();

        if (!result) {
          spinner.fail(`Scan ID ${scanId} not found`);
          process.exitCode = 1;
          return;
        }

        const ext = options.format === "excel" ? "xlsx" : options.format;
        const output = options.output ?? `aria-report.${ext}`;

        switch (options.format) {
          case "json":
            generateJsonReport(result, output);
            break;
          case "html":
            generateHtmlReport(result, output);
            break;
          case "excel":
            await generateExcelReport(result, output);
            break;
          default:
            spinner.fail(`Unknown format: ${options.format}`);
            process.exitCode = 1;
            return;
        }

        spinner.succeed(`Report generated: ${output}`);
      } catch (err) {
        spinner.fail("Report generation failed");
        const message =
          err instanceof Error ? err.message : String(err);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });

  return cmd;
}
