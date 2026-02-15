import type { Page } from "playwright";
import type { CustomRule, CustomRuleResult } from "./types.js";

export const skipNavRule: CustomRule = {
  id: "skip-nav",
  kwcagId: "6.4.1",
  name: "반복 영역 건너뛰기",
  description: "페이지 시작 부분에 본문 영역으로 건너뛸 수 있는 링크를 제공해야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const nodes = await page.evaluate(() => {
      const issues: Array<{ html: string; selector: string; message: string }> = [];
      const links = document.querySelectorAll("a[href]");
      let hasSkipLink = false;

      for (const link of links) {
        const href = link.getAttribute("href") ?? "";
        if (href.startsWith("#") && href.length > 1) {
          const targetId = href.slice(1);
          const target = document.getElementById(targetId);
          if (target) {
            const isMain =
              target.tagName.toLowerCase() === "main" ||
              target.getAttribute("role") === "main" ||
              targetId === "main" ||
              targetId === "content" ||
              targetId === "main-content";
            if (isMain) {
              hasSkipLink = true;
              break;
            }
          }
        }
      }

      if (!hasSkipLink) {
        const hasMainLandmark =
          document.querySelector("main") !== null ||
          document.querySelector("[role='main']") !== null;
        if (hasMainLandmark) {
          issues.push({
            html: document.documentElement.outerHTML.slice(0, 200),
            selector: "html",
            message: "본문으로 건너뛰는 링크가 페이지 시작 부분에 없습니다.",
          });
        }
      }

      return issues;
    });

    return {
      ruleId: "skip-nav",
      kwcagId: "6.4.1",
      severity: nodes.length > 0 ? "error" : "pass",
      nodes,
    };
  },
};
