import type { Page } from "puppeteer-core";
import type { CustomRule, CustomRuleResult } from "./types.js";

export const autoPlayRule: CustomRule = {
  id: "auto-play",
  kwcagId: "5.4.2",
  name: "자동 재생 금지",
  description: "자동으로 소리가 재생되는 미디어 요소가 없어야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const nodes = await page.evaluate(() => {
      const issues: Array<{ html: string; selector: string; message: string }> = [];

      const mediaElements = document.querySelectorAll(
        "video[autoplay], audio[autoplay]",
      );
      for (const el of mediaElements) {
        const tag = el.tagName.toLowerCase();
        const hasMuted = el.hasAttribute("muted");
        if (!hasMuted) {
          issues.push({
            html: el.outerHTML.slice(0, 300),
            selector: buildSelector(el),
            message: `${tag} 요소에 autoplay 속성이 있으며 muted가 아닙니다.`,
          });
        }
      }

      const iframes = document.querySelectorAll("iframe");
      for (const iframe of iframes) {
        const src = iframe.getAttribute("src") ?? "";
        if (
          src.includes("autoplay=1") ||
          src.includes("autoplay=true")
        ) {
          issues.push({
            html: iframe.outerHTML.slice(0, 300),
            selector: buildSelector(iframe),
            message: "iframe에 자동 재생이 설정된 미디어가 포함되어 있습니다.",
          });
        }
      }

      function buildSelector(el: Element): string {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const parent = el.parentElement;
        if (!parent) return tag;
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === el.tagName,
        );
        if (siblings.length === 1) return `${parent.tagName.toLowerCase()} > ${tag}`;
        const idx = siblings.indexOf(el) + 1;
        return `${tag}:nth-of-type(${idx})`;
      }

      return issues;
    });

    return {
      ruleId: "auto-play",
      kwcagId: "5.4.2",
      severity: nodes.length > 0 ? "error" : "pass",
      nodes,
    };
  },
};
