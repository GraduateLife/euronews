import { Hono } from "hono";
import type { Env } from "../../env";
import {
  createMockFeedback,
  saveParagraphPractice,
} from "../../study/studyRepository";
import { readJson } from "../http";

export const sentencesRoute = new Hono<{ Bindings: Env }>();

sentencesRoute.post("/paragraphs/practice", async (c) => {
  const body = await readJson<{
    paragraphPt?: string;
    selectedText?: string;
    targetSentence?: string;
  }>(c);
  const paragraphPt = body.paragraphPt?.trim() || "";
  const selectedText = body.selectedText?.trim() || "";
  const targetSentence = body.targetSentence?.trim() || paragraphPt;

  if (!paragraphPt) {
    return c.json({ error: "paragraphPt is required" }, 400);
  }

  return c.json({
    practice: {
      paragraphPt,
      selectedText,
      targetSentence,
      structureLabel:
        "Paragrafo noticioso: declaracao principal seguida de contexto",
      tenseFocus:
        "presente, preterito perfeito, preterito imperfeito, futuro, condicional, conjuntivo",
      generatedParagraphPt:
        "O ministro anuncia novas regras antes da reuniao de sexta-feira. As autoridades dizem que a medida deve proteger familias vulneraveis durante o inverno.",
      promptZhHans:
        "部长在周五的会议前宣布新的规则。当局表示，该措施应在冬季保护脆弱家庭。",
    },
  });
});

sentencesRoute.post("/paragraphs/feedback", async (c) => {
  const body = await readJson<{
    paragraphPt?: string;
    selectedText?: string;
    targetSentence?: string;
    generatedParagraphPt?: string;
    promptZhHans?: string;
    userZhHans?: string;
    userPt?: string;
  }>(c);
  const feedback = createMockFeedback({
    userPt: body.userPt ?? "",
    expectedPt: body.generatedParagraphPt ?? "",
  });
  const practice = await saveParagraphPractice(c.env.DB, {
    paragraphPt: body.paragraphPt ?? "",
    selectedText: body.selectedText ?? "",
    targetSentence: body.targetSentence ?? "",
    generatedParagraphPt: body.generatedParagraphPt ?? "",
    promptZhHans: body.promptZhHans ?? "",
    userZhHans: body.userZhHans ?? "",
    userPt: body.userPt ?? "",
    structureLabel:
      "Paragrafo noticioso: declaracao principal seguida de contexto",
    tenseFocus:
      "presente, preterito perfeito, preterito imperfeito, futuro, condicional, conjuntivo",
    feedback,
  });

  return c.json({
    feedback,
    practice,
  });
});
