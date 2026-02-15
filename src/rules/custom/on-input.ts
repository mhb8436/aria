import type { Page } from "playwright";
import type { CustomRule, CustomRuleResult } from "./types.js";

export const onInputRule: CustomRule = {
  id: "on-input",
  kwcagId: "7.2.1",
  name: "사용자 요구에 따른 실행",
  description: "select 등의 onchange 이벤트에서 자동 submit/navigation이 실행되지 않아야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const nodes = await page.evaluate(() => {
      const issues: Array<{ html: string; selector: string; message: string }> = [];

      const selects = document.querySelectorAll("select[onchange]");
      for (const select of selects) {
        const handler = select.getAttribute("onchange") ?? "";
        if (
          handler.includes("submit") ||
          handler.includes("location") ||
          handler.includes("href") ||
          handler.includes("navigate")
        ) {
          issues.push({
            html: select.outerHTML.slice(0, 300),
            selector: "select[onchange]",
            message: "select의 onchange에서 자동 submit 또는 페이지 이동이 발생합니다.",
          });
        }
      }

      const inputs = document.querySelectorAll(
        "input[onchange], input[onfocus], input[onblur]",
      );
      for (const input of inputs) {
        for (const eventAttr of ["onchange", "onfocus", "onblur"]) {
          const handler = input.getAttribute(eventAttr) ?? "";
          if (
            handler.includes("submit") ||
            handler.includes("location") ||
            handler.includes("window.open")
          ) {
            issues.push({
              html: input.outerHTML.slice(0, 300),
              selector: `input[${eventAttr}]`,
              message: `input의 ${eventAttr}에서 자동 submit 또는 새 창이 열립니다.`,
            });
          }
        }
      }

      return issues;
    });

    return {
      ruleId: "on-input",
      kwcagId: "7.2.1",
      severity: nodes.length > 0 ? "error" : "pass",
      nodes,
    };
  },
};
