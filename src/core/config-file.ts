import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

export interface AriaConfig {
  readonly exclude?: {
    readonly rules?: readonly string[];
    readonly urls?: readonly string[];
  };
  readonly auth?: {
    readonly url?: string;
    readonly script?: string;
  };
  readonly scan?: {
    readonly timeout?: number;
    readonly headless?: boolean;
    readonly viewport?: { width: number; height: number };
    readonly waitUntil?: "load" | "domcontentloaded" | "networkidle";
  };
  readonly crawl?: {
    readonly depth?: number;
    readonly maxPages?: number;
    readonly concurrency?: number;
  };
  readonly report?: {
    readonly format?: "json" | "html" | "excel";
    readonly output?: string;
  };
  readonly ci?: {
    readonly threshold?: number;
  };
}

const CONFIG_FILES = [".ariarc.yaml", ".ariarc.yml", ".ariarc.json"];

export function loadConfigFile(dir: string = process.cwd()): AriaConfig {
  for (const filename of CONFIG_FILES) {
    const filepath = resolve(dir, filename);
    if (existsSync(filepath)) {
      const content = readFileSync(filepath, "utf-8");
      if (filename.endsWith(".json")) {
        return JSON.parse(content) as AriaConfig;
      }
      return parseYaml(content) as AriaConfig;
    }
  }
  return {};
}
