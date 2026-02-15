import Database from "better-sqlite3";
import type { ScanResult, KwcagViolation } from "../core/scanner.js";
import type { CrawlResult } from "../core/crawler.js";

export interface StoredScan {
  readonly id: number;
  readonly url: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly complianceRate: number;
  readonly violationCount: number;
  readonly passCount: number;
}

export interface StoredViolation {
  readonly id: number;
  readonly scanId: number;
  readonly kwcagId: string;
  readonly kwcagName: string;
  readonly severity: string;
  readonly ruleId: string;
  readonly description: string;
  readonly impact: string;
  readonly nodeCount: number;
  readonly nodesJson: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  duration INTEGER NOT NULL,
  compliance_rate REAL NOT NULL,
  violation_count INTEGER NOT NULL,
  pass_count INTEGER NOT NULL,
  result_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES scans(id),
  kwcag_id TEXT NOT NULL,
  kwcag_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT NOT NULL,
  node_count INTEGER NOT NULL,
  nodes_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_url TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  duration INTEGER NOT NULL,
  pages_scanned INTEGER NOT NULL,
  total_violations INTEGER NOT NULL,
  unique_kwcag_violations INTEGER NOT NULL,
  result_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_violations_scan ON violations(scan_id);
CREATE INDEX IF NOT EXISTS idx_violations_kwcag ON violations(kwcag_id);
CREATE INDEX IF NOT EXISTS idx_scans_url ON scans(url);
`;

export class AriaStore {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.exec(SCHEMA);
  }

  saveScanResult(result: ScanResult): number {
    const insertScan = this.db.prepare(`
      INSERT INTO scans (url, timestamp, duration, compliance_rate, violation_count, pass_count, result_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertViolation = this.db.prepare(`
      INSERT INTO violations (scan_id, kwcag_id, kwcag_name, severity, rule_id, description, impact, node_count, nodes_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      const info = insertScan.run(
        result.url,
        result.timestamp,
        result.duration,
        result.summary.complianceRate,
        result.violations.length,
        result.summary.passCount,
        JSON.stringify(result),
      );

      const scanId = info.lastInsertRowid as number;

      for (const v of result.violations) {
        insertViolation.run(
          scanId,
          v.kwcagId,
          v.kwcagName,
          v.severity,
          v.axeRuleId,
          v.axeDescription,
          v.impact,
          v.nodes.length,
          JSON.stringify(v.nodes),
        );
      }

      return scanId;
    });

    return transaction();
  }

  saveCrawlResult(result: CrawlResult): number {
    const stmt = this.db.prepare(`
      INSERT INTO crawls (start_url, timestamp, duration, pages_scanned, total_violations, unique_kwcag_violations, result_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      result.startUrl,
      new Date().toISOString(),
      result.duration,
      result.pagesScanned,
      result.summary.totalViolations,
      result.summary.uniqueKwcagViolations,
      JSON.stringify(result),
    );

    return info.lastInsertRowid as number;
  }

  getScans(limit = 50): readonly StoredScan[] {
    return this.db
      .prepare(
        `SELECT id, url, timestamp, duration, compliance_rate as complianceRate,
                violation_count as violationCount, pass_count as passCount
         FROM scans ORDER BY id DESC LIMIT ?`,
      )
      .all(limit) as StoredScan[];
  }

  getScanById(id: number): ScanResult | null {
    const row = this.db
      .prepare("SELECT result_json FROM scans WHERE id = ?")
      .get(id) as { result_json: string } | undefined;

    return row ? JSON.parse(row.result_json) : null;
  }

  getViolationsByScan(scanId: number): readonly StoredViolation[] {
    return this.db
      .prepare(
        `SELECT id, scan_id as scanId, kwcag_id as kwcagId, kwcag_name as kwcagName,
                severity, rule_id as ruleId, description, impact,
                node_count as nodeCount, nodes_json as nodesJson
         FROM violations WHERE scan_id = ? ORDER BY kwcag_id`,
      )
      .all(scanId) as StoredViolation[];
  }

  getViolationsByKwcag(kwcagId: string): readonly StoredViolation[] {
    return this.db
      .prepare(
        `SELECT id, scan_id as scanId, kwcag_id as kwcagId, kwcag_name as kwcagName,
                severity, rule_id as ruleId, description, impact,
                node_count as nodeCount, nodes_json as nodesJson
         FROM violations WHERE kwcag_id = ? ORDER BY scan_id DESC`,
      )
      .all(kwcagId) as StoredViolation[];
  }

  getCrawlById(id: number): CrawlResult | null {
    const row = this.db
      .prepare("SELECT result_json FROM crawls WHERE id = ?")
      .get(id) as { result_json: string } | undefined;

    return row ? JSON.parse(row.result_json) : null;
  }

  close(): void {
    this.db.close();
  }
}
