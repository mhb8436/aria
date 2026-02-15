import type { Page } from "puppeteer-core";
import type { CustomRule, CustomRuleResult } from "./types.js";

const VALID_LANG_CODES = new Set([
  "ko", "en", "ja", "zh", "zh-cn", "zh-tw", "fr", "de", "es",
  "pt", "it", "ru", "ar", "hi", "th", "vi", "id", "ms",
  "ko-kr", "en-us", "en-gb", "ja-jp", "zh-hans", "zh-hant",
]);

export const langAttrRule: CustomRule = {
  id: "lang-attr",
  kwcagId: "7.1.1",
  name: "기본 언어 표시",
  description: "HTML 문서의 기본 언어를 lang 속성으로 명시해야 한다.",

  async run(page: Page): Promise<CustomRuleResult> {
    const validCodes = [...VALID_LANG_CODES];

    const nodes = await page.evaluate((codes) => {
      const issues: Array<{ html: string; selector: string; message: string }> = [];
      const validSet = new Set(codes);

      const html = document.documentElement;
      const lang = html.getAttribute("lang")?.trim().toLowerCase();

      if (!lang) {
        issues.push({
          html: `<html${html.getAttributeNames().map(a => ` ${a}="${html.getAttribute(a)}"`).join("")}>`,
          selector: "html",
          message: "html 요소에 lang 속성이 없습니다.",
        });
      } else {
        const baseLang = lang.split("-")[0];
        if (!validSet.has(lang) && !validSet.has(baseLang)) {
          if (!/^[a-z]{2,3}(-[a-z]{2,})?$/.test(lang)) {
            issues.push({
              html: `<html lang="${lang}">`,
              selector: "html",
              message: `lang 속성값 "${lang}"이(가) 유효한 언어 코드가 아닙니다.`,
            });
          }
        }
      }

      return issues;
    }, validCodes);

    return {
      ruleId: "lang-attr",
      kwcagId: "7.1.1",
      severity: nodes.length > 0 ? "error" : "pass",
      nodes,
    };
  },
};
