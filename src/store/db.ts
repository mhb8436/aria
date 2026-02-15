import initSqlJs, { type Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { ScanResult } from "../core/scanner.js";
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
  private readonly db: Database;
  private readonly dbPath: string;

  private constructor(db: Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
    this.db.run(SCHEMA);
  }

  static async create(dbPath: string): Promise<AriaStore> {
    const SQL = await initSqlJs();

    let db: Database;
    if (dbPath === ":memory:") {
      db = new SQL.Database();
    } else if (existsSync(dbPath)) {
      const buffer = readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    return new AriaStore(db, dbPath);
  }

  saveScanResult(result: ScanResult): number {
    this.db.run(
      `INSERT INTO scans (url, timestamp, duration, compliance_rate, violation_count, pass_count, result_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        result.url,
        result.timestamp,
        result.duration,
        result.summary.complianceRate,
        result.violations.length,
        result.summary.passCount,
        JSON.stringify(result),
      ],
    );

    const scanId = this.lastInsertRowId();

    for (const v of result.violations) {
      this.db.run(
        `INSERT INTO violations (scan_id, kwcag_id, kwcag_name, severity, rule_id, description, impact, node_count, nodes_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scanId,
          v.kwcagId,
          v.kwcagName,
          v.severity,
          v.axeRuleId,
          v.axeDescription,
          v.impact,
          v.nodes.length,
          JSON.stringify(v.nodes),
        ],
      );
    }

    this.persist();
    return scanId;
  }

  saveCrawlResult(result: CrawlResult): number {
    this.db.run(
      `INSERT INTO crawls (start_url, timestamp, duration, pages_scanned, total_violations, unique_kwcag_violations, result_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        result.startUrl,
        new Date().toISOString(),
        result.duration,
        result.pagesScanned,
        result.summary.totalViolations,
        result.summary.uniqueKwcagViolations,
        JSON.stringify(result),
      ],
    );

    const crawlId = this.lastInsertRowId();
    this.persist();
    return crawlId;
  }

  getScans(limit = 50): readonly StoredScan[] {
    const stmt = this.db.prepare(
      `SELECT id, url, timestamp, duration, compliance_rate as complianceRate,
              violation_count as violationCount, pass_count as passCount
       FROM scans ORDER BY id DESC LIMIT ?`,
    );
    stmt.bind([limit]);

    const results: StoredScan[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        id: row.id as number,
        url: row.url as string,
        timestamp: row.timestamp as string,
        duration: row.duration as number,
        complianceRate: row.complianceRate as number,
        violationCount: row.violationCount as number,
        passCount: row.passCount as number,
      });
    }
    stmt.free();
    return results;
  }

  getScanById(id: number): ScanResult | null {
    const stmt = this.db.prepare("SELECT result_json FROM scans WHERE id = ?");
    stmt.bind([id]);

    if (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      stmt.free();
      return JSON.parse(row.result_json as string);
    }
    stmt.free();
    return null;
  }

  getViolationsByScan(scanId: number): readonly StoredViolation[] {
    const stmt = this.db.prepare(
      `SELECT id, scan_id as scanId, kwcag_id as kwcagId, kwcag_name as kwcagName,
              severity, rule_id as ruleId, description, impact,
              node_count as nodeCount, nodes_json as nodesJson
       FROM violations WHERE scan_id = ? ORDER BY kwcag_id`,
    );
    stmt.bind([scanId]);

    const results: StoredViolation[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        id: row.id as number,
        scanId: row.scanId as number,
        kwcagId: row.kwcagId as string,
        kwcagName: row.kwcagName as string,
        severity: row.severity as string,
        ruleId: row.ruleId as string,
        description: row.description as string,
        impact: row.impact as string,
        nodeCount: row.nodeCount as number,
        nodesJson: row.nodesJson as string,
      });
    }
    stmt.free();
    return results;
  }

  getViolationsByKwcag(kwcagId: string): readonly StoredViolation[] {
    const stmt = this.db.prepare(
      `SELECT id, scan_id as scanId, kwcag_id as kwcagId, kwcag_name as kwcagName,
              severity, rule_id as ruleId, description, impact,
              node_count as nodeCount, nodes_json as nodesJson
       FROM violations WHERE kwcag_id = ? ORDER BY scan_id DESC`,
    );
    stmt.bind([kwcagId]);

    const results: StoredViolation[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      results.push({
        id: row.id as number,
        scanId: row.scanId as number,
        kwcagId: row.kwcagId as string,
        kwcagName: row.kwcagName as string,
        severity: row.severity as string,
        ruleId: row.ruleId as string,
        description: row.description as string,
        impact: row.impact as string,
        nodeCount: row.nodeCount as number,
        nodesJson: row.nodesJson as string,
      });
    }
    stmt.free();
    return results;
  }

  getCrawlById(id: number): CrawlResult | null {
    const stmt = this.db.prepare("SELECT result_json FROM crawls WHERE id = ?");
    stmt.bind([id]);

    if (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, unknown>;
      stmt.free();
      return JSON.parse(row.result_json as string);
    }
    stmt.free();
    return null;
  }

  close(): void {
    this.persist();
    this.db.close();
  }

  private lastInsertRowId(): number {
    const stmt = this.db.prepare("SELECT last_insert_rowid() as id");
    stmt.step();
    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    return row.id as number;
  }

  private persist(): void {
    if (this.dbPath !== ":memory:") {
      const data = this.db.export();
      writeFileSync(this.dbPath, Buffer.from(data));
    }
  }
}
