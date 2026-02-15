import type { Page } from "puppeteer-core";
import type { CustomRule, CustomRuleResult } from "./types.js";

export const tableStructureRule: CustomRule = {
  id: "table-structure",
  kwcagId: "5.3.1",
  name: "표의 구성",
  description: "데이터 테이블에는 caption, th, scope 등을 제공하여 이해하기 쉽게 구성해야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const nodes = await page.evaluate(() => {
      const issues: Array<{ html: string; selector: string; message: string }> = [];

      const tables = document.querySelectorAll("table");
      for (const table of tables) {
        const isLayout =
          table.getAttribute("role") === "presentation" ||
          table.getAttribute("role") === "none";
        if (isLayout) continue;

        const hasTh = table.querySelector("th") !== null;
        if (!hasTh) continue;

        const caption = table.querySelector("caption");
        if (!caption || !caption.textContent?.trim()) {
          issues.push({
            html: table.outerHTML.slice(0, 300),
            selector: "table",
            message: "데이터 테이블에 caption 요소가 없습니다.",
          });
        }

        const ths = table.querySelectorAll("th");
        for (const th of ths) {
          const scope = th.getAttribute("scope");
          if (!scope) {
            issues.push({
              html: th.outerHTML.slice(0, 200),
              selector: "th",
              message: "th 요소에 scope 속성이 없습니다.",
            });
          }
        }
      }

      return issues;
    });

    return {
      ruleId: "table-structure",
      kwcagId: "5.3.1",
      severity: nodes.length > 0 ? "warning" : "pass",
      nodes,
    };
  },
};
