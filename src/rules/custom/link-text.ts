import type { Page } from "playwright";
import type { CustomRule, CustomRuleResult } from "./types.js";

const VAGUE_LINK_PATTERNS = [
  /^여기$/,
  /^클릭$/,
  /^여기를?\s*클릭/,
  /^click\s*here$/i,
  /^here$/i,
  /^more$/i,
  /^더\s*보기$/,
  /^자세히$/,
  /^read\s*more$/i,
  /^링크$/,
  /^link$/i,
  /^바로\s*가기$/,
  /^>+$/,
  /^\.+$/,
];

export const linkTextRule: CustomRule = {
  id: "link-text",
  kwcagId: "6.4.3",
  name: "적절한 링크 텍스트",
  description: "링크 텍스트는 용도나 목적을 이해할 수 있도록 제공해야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const patterns = VAGUE_LINK_PATTERNS.map((p) => p.source);
    const flags = VAGUE_LINK_PATTERNS.map((p) => p.flags);

    const nodes = await page.evaluate(
      ({ patterns, flags }) => {
        const issues: Array<{ html: string; selector: string; message: string }> = [];
        const regexps = patterns.map((p, i) => new RegExp(p, flags[i]));

        const links = document.querySelectorAll("a[href]");
        for (const link of links) {
          const text = (
            link.textContent?.trim() ??
            link.getAttribute("aria-label")?.trim() ??
            ""
          );

          if (!text) return issues;

          for (const re of regexps) {
            if (re.test(text)) {
              issues.push({
                html: link.outerHTML.slice(0, 200),
                selector: `a[href="${link.getAttribute("href")}"]`,
                message: `링크 텍스트 "${text}"이(가) 목적을 설명하지 않습니다.`,
              });
              break;
            }
          }
        }

        return issues;
      },
      { patterns, flags },
    );

    return {
      ruleId: "link-text",
      kwcagId: "6.4.3",
      severity: nodes.length > 0 ? "warning" : "pass",
      nodes,
    };
  },
};
