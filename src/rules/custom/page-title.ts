import type { Page } from "puppeteer-core";
import type { CustomRule, CustomRuleResult } from "./types.js";

export const pageTitleRule: CustomRule = {
  id: "page-title",
  kwcagId: "6.4.2",
  name: "제목 제공",
  description: "페이지에는 적절한 제목을 제공해야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const nodes = await page.evaluate(() => {
      const issues: Array<{ html: string; selector: string; message: string }> = [];

      const title = document.title?.trim();
      if (!title) {
        issues.push({
          html: "<title></title>",
          selector: "head > title",
          message: "페이지에 제목(title)이 없거나 비어 있습니다.",
        });
      }

      const iframes = document.querySelectorAll("iframe");
      for (const iframe of iframes) {
        const iframeTitle = iframe.getAttribute("title")?.trim();
        if (!iframeTitle) {
          issues.push({
            html: iframe.outerHTML.slice(0, 300),
            selector: "iframe",
            message: "iframe에 title 속성이 없습니다.",
          });
        }
      }

      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      let prevLevel = 0;
      for (const heading of headings) {
        const level = parseInt(heading.tagName[1], 10);
        if (level > prevLevel + 1 && prevLevel > 0) {
          issues.push({
            html: heading.outerHTML.slice(0, 300),
            selector: heading.tagName.toLowerCase(),
            message: `제목 수준이 h${prevLevel}에서 h${level}로 건너뛰었습니다.`,
          });
        }
        prevLevel = level;
      }

      return issues;
    });

    return {
      ruleId: "page-title",
      kwcagId: "6.4.2",
      severity: nodes.length > 0 ? "error" : "pass",
      nodes,
    };
  },
};
