import { writeFileSync } from "node:fs";
import type { ScanResult, KwcagViolation } from "../core/scanner.js";
import type { CrawlResult } from "../core/crawler.js";
import { KWCAG_ITEMS, PRINCIPLE_NAMES } from "../rules/kwcag-map.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function severityClass(severity: string): string {
  switch (severity) {
    case "error": return "severity-error";
    case "warning": return "severity-warning";
    case "info": return "severity-info";
    default: return "";
  }
}

function severityLabel(severity: string): string {
  switch (severity) {
    case "error": return "오류";
    case "warning": return "경고";
    case "info": return "정보";
    default: return severity;
  }
}

function groupViolations(
  violations: readonly KwcagViolation[],
): Map<string, { name: string; severity: string; nodeCount: number; violations: KwcagViolation[] }> {
  const map = new Map<string, { name: string; severity: string; nodeCount: number; violations: KwcagViolation[] }>();
  for (const v of violations) {
    const existing = map.get(v.kwcagId);
    if (existing) {
      existing.nodeCount += v.nodes.length;
      existing.violations.push(v);
    } else {
      map.set(v.kwcagId, {
        name: v.kwcagName,
        severity: v.severity,
        nodeCount: v.nodes.length,
        violations: [v],
      });
    }
  }
  return map;
}

function renderScanResultHtml(result: ScanResult): string {
  const grouped = groupViolations(result.violations);
  const failedIds = new Set(result.violations.map((v) => v.kwcagId));

  const checklistRows = KWCAG_ITEMS.map((item) => {
    const status = failedIds.has(item.id)
      ? '<span class="status-fail">X</span>'
      : result.passes.includes(item.id)
        ? '<span class="status-pass">O</span>'
        : '<span class="status-na">-</span>';
    return `<tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${item.level}</td>
      <td class="text-center">${status}</td>
    </tr>`;
  }).join("\n");

  const violationRows = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, data]) => {
      const detailRows = data.violations
        .flatMap((v) => v.nodes)
        .slice(0, 10)
        .map(
          (node) => `<div class="node-detail">
          <code>${escapeHtml(node.html.slice(0, 200))}</code>
          <p class="node-message">${escapeHtml(node.failureSummary.split("\n")[0])}</p>
        </div>`,
        )
        .join("\n");

      return `<div class="violation-group">
        <h3 class="${severityClass(data.severity)}">
          [${escapeHtml(id)}] ${escapeHtml(data.name)}
          <span class="badge">${data.nodeCount}건</span>
        </h3>
        ${detailRows}
      </div>`;
    })
    .join("\n");

  const principleRows = Object.entries(PRINCIPLE_NAMES)
    .map(([num, name]) => {
      const p = result.summary.byPrinciple[Number(num)];
      if (!p) return "";
      const rate = p.total > 0 ? ((p.pass / p.total) * 100).toFixed(1) : "N/A";
      return `<tr>
        <td>${escapeHtml(name)}</td>
        <td>${p.pass}/${p.total}</td>
        <td>${rate}%</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>ARIA - KWCAG 2.2 접근성 점검 리포트</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Pretendard', -apple-system, sans-serif; color: #333; background: #f5f5f5; line-height: 1.6; }
  .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
  header { background: #1a1a2e; color: #fff; padding: 30px 0; margin-bottom: 30px; }
  header .container { display: flex; justify-content: space-between; align-items: center; }
  h1 { font-size: 24px; }
  .meta { color: #aaa; font-size: 14px; }
  .card { background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .card h2 { font-size: 18px; margin-bottom: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
  .summary-item { text-align: center; padding: 16px; background: #f9f9f9; border-radius: 8px; }
  .summary-item .value { font-size: 32px; font-weight: bold; }
  .summary-item .label { font-size: 14px; color: #666; }
  .rate-good { color: #16a34a; }
  .rate-warn { color: #ca8a04; }
  .rate-bad { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; }
  th { background: #f5f5f5; font-weight: 600; }
  .text-center { text-align: center; }
  .status-pass { color: #16a34a; font-weight: bold; }
  .status-fail { color: #dc2626; font-weight: bold; }
  .status-na { color: #999; }
  .severity-error { color: #dc2626; }
  .severity-warning { color: #ca8a04; }
  .severity-info { color: #2563eb; }
  .badge { background: #eee; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 8px; }
  .violation-group { margin-bottom: 20px; }
  .violation-group h3 { font-size: 16px; margin-bottom: 8px; }
  .node-detail { background: #f9f9f9; padding: 12px; margin: 8px 0; border-radius: 4px; border-left: 3px solid #ddd; }
  .node-detail code { display: block; font-size: 13px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  .node-message { font-size: 13px; color: #666; margin-top: 4px; }
  footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
</style>
</head>
<body>
<header>
  <div class="container">
    <div>
      <h1>ARIA - KWCAG 2.2 웹 접근성 점검 리포트</h1>
      <div class="meta">${escapeHtml(result.url)}</div>
    </div>
    <div class="meta">${escapeHtml(result.timestamp.split("T")[0])} | ${(result.duration / 1000).toFixed(1)}s</div>
  </div>
</header>

<div class="container">
  <div class="card">
    <h2>요약</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="value ${result.summary.complianceRate >= 80 ? "rate-good" : result.summary.complianceRate >= 60 ? "rate-warn" : "rate-bad"}">
          ${result.summary.complianceRate.toFixed(1)}%
        </div>
        <div class="label">전체 준수율</div>
      </div>
      <div class="summary-item">
        <div class="value">${result.summary.passCount}</div>
        <div class="label">통과 항목</div>
      </div>
      <div class="summary-item">
        <div class="value severity-error">${result.summary.failCount}</div>
        <div class="label">위반 항목</div>
      </div>
      <div class="summary-item">
        <div class="value">${result.summary.totalItems}</div>
        <div class="label">전체 검사항목</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>원칙별 준수율</h2>
    <table>
      <thead><tr><th>원칙</th><th>통과/전체</th><th>준수율</th></tr></thead>
      <tbody>${principleRows}</tbody>
    </table>
  </div>

  <div class="card">
    <h2>위반 상세 (${grouped.size}건)</h2>
    ${violationRows || '<p style="color: #16a34a;">위반 항목이 없습니다.</p>'}
  </div>

  <div class="card">
    <h2>KWCAG 2.2 전체 체크리스트 (33항목)</h2>
    <table>
      <thead><tr><th>번호</th><th>검사항목</th><th>수준</th><th class="text-center">결과</th></tr></thead>
      <tbody>${checklistRows}</tbody>
    </table>
  </div>
</div>

<footer>Generated by ARIA - KWCAG 2.2 Web Accessibility Checker</footer>
</body>
</html>`;
}

export function generateHtmlReport(
  result: ScanResult | CrawlResult,
  outputPath: string,
): void {
  let html: string;

  if ("pageResults" in result) {
    const crawl = result as CrawlResult;
    const pageHtmls = crawl.pageResults
      .filter((p) => p.status === "success" && p.scanResult)
      .map((p) => renderScanResultHtml(p.scanResult!));
    html = pageHtmls.join("\n<hr>\n");
  } else {
    html = renderScanResultHtml(result as ScanResult);
  }

  writeFileSync(outputPath, html, "utf-8");
}
