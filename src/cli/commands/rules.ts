import { Command } from "commander";
import { KWCAG_ITEMS, PRINCIPLE_NAMES } from "../../rules/kwcag-map.js";
import { formatRulesList } from "../output.js";

export function createRulesCommand(): Command {
  const cmd = new Command("rules")
    .description("View KWCAG 2.2 rules and mappings");

  cmd
    .command("list")
    .description("List all KWCAG 2.2 inspection items")
    .option(
      "-p, --principle <number>",
      "Filter by principle number (1-4)",
    )
    .action((options) => {
      const principleFilter = options.principle
        ? Number(options.principle)
        : undefined;

      if (principleFilter !== undefined) {
        const name = PRINCIPLE_NAMES[principleFilter];
        if (!name) {
          process.stderr.write(
            `Invalid principle number: ${principleFilter}. Use 1-4.\n`,
          );
          process.exitCode = 1;
          return;
        }
        process.stdout.write(
          `\nKWCAG 2.2 - 원칙 ${principleFilter}: ${name}\n\n`,
        );
      } else {
        process.stdout.write(`\nKWCAG 2.2 - 전체 33개 검사항목\n\n`);
      }

      const items = KWCAG_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        level: item.level,
        auto: item.auto,
      }));

      const output = formatRulesList(items, principleFilter);
      process.stdout.write(output + "\n");
    });

  return cmd;
}
