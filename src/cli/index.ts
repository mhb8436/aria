#!/usr/bin/env node
import { Command } from "commander";
import { createScanCommand } from "./commands/scan.js";
import { createCrawlCommand } from "./commands/crawl.js";
import { createReportCommand } from "./commands/report.js";
import { createRulesCommand } from "./commands/rules.js";

const program = new Command()
  .name("aria")
  .description("ARIA - KWCAG 2.2 Web Accessibility Checker")
  .version("0.1.0");

program.addCommand(createScanCommand());
program.addCommand(createCrawlCommand());
program.addCommand(createReportCommand());
program.addCommand(createRulesCommand());

program.parse();
