import type { Page } from "puppeteer-core";
import type { CustomRule, CustomRuleResult } from "./types.js";

export const focusVisibleRule: CustomRule = {
  id: "focus-visible",
  kwcagId: "6.1.2",
  name: "초점 이동과 표시",
  description: "키보드 초점이 시각적으로 구별될 수 있어야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const nodes = await page.evaluate(() => {
      const issues: Array<{ html: string; selector: string; message: string }> = [];

      const interactiveSelectors = [
        "a[href]",
        "button",
        "input",
        "select",
        "textarea",
        "[tabindex]",
        "[role='button']",
        "[role='link']",
        "[role='checkbox']",
        "[role='radio']",
      ];

      const elements = document.querySelectorAll(
        interactiveSelectors.join(", "),
      );

      const stylesheets = Array.from(document.styleSheets);
      let hasOutlineNone = false;

      try {
        for (const sheet of stylesheets) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            for (const rule of rules) {
              if (rule instanceof CSSStyleRule) {
                if (
                  rule.selectorText?.includes(":focus") &&
                  rule.style.outline === "none" &&
                  !rule.style.boxShadow &&
                  !rule.style.border
                ) {
                  hasOutlineNone = true;
                }
              }
            }
          } catch {
            // Cross-origin stylesheets
          }
        }
      } catch {
        // Stylesheet access error
      }

      if (hasOutlineNone) {
        issues.push({
          html: "<style>*:focus { outline: none; }</style>",
          selector: "style",
          message: ":focus에서 outline: none이 설정되어 있으며, 대체 포커스 표시가 없습니다.",
        });
      }

      for (const el of elements) {
        const tabindex = el.getAttribute("tabindex");
        if (tabindex && parseInt(tabindex, 10) > 0) {
          issues.push({
            html: el.outerHTML.slice(0, 200),
            selector: el.tagName.toLowerCase(),
            message: `tabindex="${tabindex}" (양수)는 논리적 초점 순서를 방해할 수 있습니다.`,
          });
        }
      }

      return issues;
    });

    return {
      ruleId: "focus-visible",
      kwcagId: "6.1.2",
      severity: nodes.length > 0 ? "warning" : "pass",
      nodes,
    };
  },
};
