import type { Page } from "playwright";
import type { CustomRule, CustomRuleResult } from "./types.js";

export const blinkFlashRule: CustomRule = {
  id: "blink-flash",
  kwcagId: "6.3.1",
  name: "깜빡임과 번쩍임 사용 제한",
  description: "초당 3~50회 주기로 깜빡이거나 번쩍이는 콘텐츠를 제공하지 않아야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const nodes = await page.evaluate(() => {
      const issues: Array<{ html: string; selector: string; message: string }> = [];

      const blinkElements = document.querySelectorAll("blink");
      for (const el of blinkElements) {
        issues.push({
          html: el.outerHTML.slice(0, 300),
          selector: "blink",
          message: "사용 중단된 <blink> 요소가 사용되었습니다.",
        });
      }

      const marqueeElements = document.querySelectorAll("marquee");
      for (const el of marqueeElements) {
        issues.push({
          html: el.outerHTML.slice(0, 300),
          selector: "marquee",
          message: "사용 중단된 <marquee> 요소가 사용되었습니다.",
        });
      }

      const allElements = document.querySelectorAll("*");
      for (const el of allElements) {
        const computed = window.getComputedStyle(el);
        const animName = computed.animationName;
        const animDuration = parseFloat(computed.animationDuration);

        if (animName && animName !== "none" && animDuration > 0) {
          const frequency = 1 / animDuration;
          if (frequency >= 3 && frequency <= 50) {
            issues.push({
              html: el.outerHTML.slice(0, 300),
              selector: el.tagName.toLowerCase(),
              message: `CSS 애니메이션 "${animName}"의 주기(${animDuration}s)가 초당 3~50회 범위에 해당합니다.`,
            });
          }
        }

        const textDecoration = computed.textDecorationLine ?? computed.textDecoration;
        if (textDecoration && textDecoration.includes("blink")) {
          issues.push({
            html: el.outerHTML.slice(0, 300),
            selector: el.tagName.toLowerCase(),
            message: "text-decoration: blink 스타일이 사용되었습니다.",
          });
        }
      }

      return issues;
    });

    return {
      ruleId: "blink-flash",
      kwcagId: "6.3.1",
      severity: nodes.length > 0 ? "error" : "pass",
      nodes,
    };
  },
};
