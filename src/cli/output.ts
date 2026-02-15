import chalk from "chalk";
import Table from "cli-table3";
import type { ScanResult, KwcagViolation, Severity } from "../core/scanner.js";
import { PRINCIPLE_NAMES } from "../rules/kwcag-map.js";

function severityColor(severity: Severity): (text: string) => string {
  switch (severity) {
    case "error":
      return chalk.red;
    case "warning":
      return chalk.yellow;
    case "info":
      return chalk.blue;
    case "pass":
      return chalk.green;
  }
}

function severityLabel(severity: Severity): string {
  const labels: Record<Severity, string> = {
    error: "오류",
    warning: "경고",
    info: "정보",
    pass: "통과",
  };
  return labels[severity];
}

export function formatScanResult(result: ScanResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold("ARIA - KWCAG 2.2 웹 접근성 점검 결과"));
  lines.push(chalk.gray(`Target: ${result.url}`));
  lines.push(chalk.gray(`Time: ${(result.duration / 1000).toFixed(1)}s`));
  lines.push("");

  // Summary
  lines.push(chalk.bold("=== 요약 ==="));
  const rate = result.summary.complianceRate.toFixed(1);
  const rateColor =
    result.summary.complianceRate >= 80
      ? chalk.green
      : result.summary.complianceRate >= 60
        ? chalk.yellow
        : chalk.red;
  lines.push(
    `전체 준수율: ${rateColor(`${rate}%`)} (${result.summary.passCount}/${result.summary.totalItems} 항목 통과)`,
  );
  lines.push("");

  // By principle
  for (const [pNum, pName] of Object.entries(PRINCIPLE_NAMES)) {
    const p = result.summary.byPrinciple[Number(pNum)];
    if (!p) continue;
    const pRate =
      p.total > 0 ? ((p.pass / p.total) * 100).toFixed(1) : "N/A";
    lines.push(
      `  ${pName}: ${chalk.bold(`${p.pass}/${p.total}`)} (${pRate}%)`,
    );
  }
  lines.push("");

  // Violations
  if (result.violations.length === 0) {
    lines.push(chalk.green("위반 항목 없음"));
  } else {
    const grouped = groupViolations(result.violations);
    lines.push(chalk.bold(`=== 위반 항목 (${grouped.length}건) ===`));

    const table = new Table({
      head: ["KWCAG", "항목명", "심각도", "위반 수"].map((h) =>
        chalk.bold(h),
      ),
      colWidths: [10, 28, 10, 10],
    });

    for (const g of grouped) {
      const color = severityColor(g.severity);
      table.push([
        g.kwcagId,
        g.kwcagName,
        color(severityLabel(g.severity)),
        String(g.nodeCount),
      ]);
    }

    lines.push(table.toString());
  }

  return lines.join("\n");
}

interface GroupedViolation {
  readonly kwcagId: string;
  readonly kwcagName: string;
  readonly severity: Severity;
  readonly nodeCount: number;
}

function groupViolations(
  violations: readonly KwcagViolation[],
): readonly GroupedViolation[] {
  const map = new Map<
    string,
    { kwcagName: string; severity: Severity; nodeCount: number }
  >();

  for (const v of violations) {
    const existing = map.get(v.kwcagId);
    if (existing) {
      existing.nodeCount += v.nodes.length;
      if (
        severityPriority(v.severity) > severityPriority(existing.severity)
      ) {
        existing.severity = v.severity;
      }
    } else {
      map.set(v.kwcagId, {
        kwcagName: v.kwcagName,
        severity: v.severity,
        nodeCount: v.nodes.length,
      });
    }
  }

  return [...map.entries()]
    .map(([kwcagId, data]) => ({ kwcagId, ...data }))
    .sort((a, b) => a.kwcagId.localeCompare(b.kwcagId));
}

function severityPriority(s: Severity): number {
  const priorities: Record<Severity, number> = {
    pass: 0,
    info: 1,
    warning: 2,
    error: 3,
  };
  return priorities[s];
}

export function formatViolationDetail(violation: KwcagViolation): string {
  const lines: string[] = [];
  const color = severityColor(violation.severity);

  lines.push(
    color(
      `[${violation.kwcagId}] ${violation.kwcagName} - ${violation.axeRuleId}`,
    ),
  );
  lines.push(chalk.gray(`  ${violation.axeDescription}`));

  for (const node of violation.nodes.slice(0, 5)) {
    lines.push(`  ${chalk.dim(">")} ${truncate(node.html, 120)}`);
    if (node.failureSummary) {
      lines.push(chalk.gray(`    ${node.failureSummary.split("\n")[0]}`));
    }
  }

  if (violation.nodes.length > 5) {
    lines.push(
      chalk.gray(`  ... and ${violation.nodes.length - 5} more`),
    );
  }

  return lines.join("\n");
}

function truncate(str: string, maxLen: number): string {
  const cleaned = str.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 3) + "...";
}

export function formatRulesList(
  items: readonly {
    id: string;
    name: string;
    level: string;
    auto: boolean | "partial";
  }[],
  principleFilter?: number,
): string {
  const filtered = principleFilter
    ? items.filter((_, i) => {
        const principles = [
          { start: 0, end: 9 },
          { start: 9, end: 24 },
          { start: 24, end: 31 },
          { start: 31, end: 33 },
        ];
        const p = principles[principleFilter - 1];
        return p && i >= p.start && i < p.end;
      })
    : items;

  const table = new Table({
    head: ["번호", "검사항목", "수준", "자동점검"].map((h) =>
      chalk.bold(h),
    ),
    colWidths: [10, 30, 8, 12],
  });

  for (const item of filtered) {
    const autoLabel =
      item.auto === true
        ? chalk.green("O")
        : item.auto === "partial"
          ? chalk.yellow("부분")
          : chalk.gray("수동");
    table.push([item.id, item.name, item.level, autoLabel]);
  }

  return table.toString();
}
