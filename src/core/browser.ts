import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import puppeteer, { type Browser } from "puppeteer-core";

const CHROME_PATHS_MACOS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

const CHROME_PATHS_LINUX = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
];

const CHROME_PATHS_WINDOWS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

export function detectChromePath(): string {
  const platform = process.platform;

  const envPath = process.env.CHROME_PATH ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  let candidates: string[];
  if (platform === "darwin") {
    candidates = CHROME_PATHS_MACOS;
  } else if (platform === "win32") {
    candidates = CHROME_PATHS_WINDOWS;
  } else {
    candidates = CHROME_PATHS_LINUX;
  }

  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }

  if (platform === "linux") {
    try {
      const result = execSync("which google-chrome || which chromium-browser || which chromium", {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();
      if (result) return result;
    } catch {
      // not found
    }
  }

  throw new Error(
    "Chrome/Chromium not found. Install Chrome or set CHROME_PATH environment variable.",
  );
}

export async function launchBrowser(options: {
  headless?: boolean;
  locale?: string;
} = {}): Promise<Browser> {
  const executablePath = detectChromePath();
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
  ];

  if (options.locale) {
    args.push(`--lang=${options.locale}`);
  }

  return puppeteer.launch({
    executablePath,
    headless: options.headless !== false,
    args,
  });
}
