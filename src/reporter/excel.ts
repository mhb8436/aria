import ExcelJS from "exceljs";
import type { ScanResult, KwcagViolation } from "../core/scanner.js";
import type { CrawlResult } from "../core/crawler.js";
import { KWCAG_ITEMS, PRINCIPLE_NAMES } from "../rules/kwcag-map.js";

function severityLabel(severity: string): string {
  switch (severity) {
    case "error": return "오류";
    case "warning": return "경고";
    case "info": return "정보";
    default: return severity;
  }
}

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  result: ScanResult,
): void {
  const sheet = workbook.addWorksheet("요약");

  sheet.columns = [
    { header: "항목", key: "label", width: 30 },
    { header: "값", key: "value", width: 40 },
  ];

  sheet.addRow({ label: "점검 URL", value: result.url });
  sheet.addRow({ label: "점검 일시", value: result.timestamp });
  sheet.addRow({
    label: "소요 시간",
    value: `${(result.duration / 1000).toFixed(1)}초`,
  });
  sheet.addRow({});
  sheet.addRow({
    label: "전체 준수율",
    value: `${result.summary.complianceRate.toFixed(1)}%`,
  });
  sheet.addRow({
    label: "통과 항목",
    value: result.summary.passCount,
  });
  sheet.addRow({
    label: "위반 항목",
    value: result.summary.failCount,
  });
  sheet.addRow({
    label: "전체 검사항목",
    value: result.summary.totalItems,
  });

  sheet.addRow({});
  sheet.addRow({ label: "원칙별 준수율", value: "" });

  for (const [num, name] of Object.entries(PRINCIPLE_NAMES)) {
    const p = result.summary.byPrinciple[Number(num)];
    if (p) {
      const rate =
        p.total > 0 ? ((p.pass / p.total) * 100).toFixed(1) : "N/A";
      sheet.addRow({
        label: `  ${name}`,
        value: `${p.pass}/${p.total} (${rate}%)`,
      });
    }
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
}

function buildDetailsSheet(
  workbook: ExcelJS.Workbook,
  violations: readonly KwcagViolation[],
): void {
  const sheet = workbook.addWorksheet("상세 결과");

  sheet.columns = [
    { header: "KWCAG", key: "kwcagId", width: 10 },
    { header: "검사항목", key: "kwcagName", width: 25 },
    { header: "심각도", key: "severity", width: 10 },
    { header: "규칙 ID", key: "ruleId", width: 20 },
    { header: "설명", key: "description", width: 40 },
    { header: "HTML", key: "html", width: 50 },
    { header: "대상", key: "target", width: 30 },
  ];

  for (const v of violations) {
    for (const node of v.nodes) {
      sheet.addRow({
        kwcagId: v.kwcagId,
        kwcagName: v.kwcagName,
        severity: severityLabel(v.severity),
        ruleId: v.axeRuleId,
        description: v.axeDescription,
        html: node.html.slice(0, 500),
        target: node.target.join(", "),
      });
    }
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 7 },
  };
}

function buildChecklistSheet(
  workbook: ExcelJS.Workbook,
  result: ScanResult,
): void {
  const sheet = workbook.addWorksheet("체크리스트");

  sheet.columns = [
    { header: "번호", key: "id", width: 10 },
    { header: "원칙", key: "principle", width: 16 },
    { header: "검사항목", key: "name", width: 30 },
    { header: "수준", key: "level", width: 8 },
    { header: "결과", key: "result", width: 10 },
    { header: "자동점검", key: "auto", width: 10 },
    { header: "비고", key: "note", width: 30 },
  ];

  const failedIds = new Set(result.violations.map((v) => v.kwcagId));

  for (const item of KWCAG_ITEMS) {
    const status = failedIds.has(item.id)
      ? "X (위반)"
      : result.passes.includes(item.id)
        ? "O (통과)"
        : "- (미확인)";

    const autoLabel =
      item.auto === true
        ? "자동"
        : item.auto === "partial"
          ? "부분자동"
          : "수동";

    const row = sheet.addRow({
      id: item.id,
      principle: item.principleName,
      name: item.name,
      level: item.level,
      result: status,
      auto: autoLabel,
      note: "",
    });

    if (failedIds.has(item.id)) {
      row.getCell("result").font = { color: { argb: "FFDC2626" }, bold: true };
    } else if (result.passes.includes(item.id)) {
      row.getCell("result").font = { color: { argb: "FF16A34A" } };
    }
  }

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
}

export async function generateExcelReport(
  result: ScanResult | CrawlResult,
  outputPath: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ARIA KWCAG 2.2 Checker";
  workbook.created = new Date();

  if ("pageResults" in result) {
    const crawl = result as CrawlResult;
    for (const entry of crawl.pageResults) {
      if (entry.status === "success" && entry.scanResult) {
        buildSummarySheet(workbook, entry.scanResult);
        buildDetailsSheet(workbook, entry.scanResult.violations);
        buildChecklistSheet(workbook, entry.scanResult);
        break;
      }
    }
  } else {
    const scan = result as ScanResult;
    buildSummarySheet(workbook, scan);
    buildDetailsSheet(workbook, scan.violations);
    buildChecklistSheet(workbook, scan);
  }

  await workbook.xlsx.writeFile(outputPath);
}
