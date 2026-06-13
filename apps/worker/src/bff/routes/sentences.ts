import { Hono } from "hono";
import type { Env } from "../../env";
import { readJson } from "../http";

export const sentencesRoute = new Hono<{ Bindings: Env }>();

sentencesRoute.post("/sentences/practice", async (c) => {
  const body = await readJson<{ sourceSentence?: string }>(c);
  const sourceSentence = body.sourceSentence?.trim() || "";

  if (!sourceSentence) {
    return c.json({ error: "sourceSentence is required" }, 400);
  }

  return c.json({
    practice: {
      sourceSentence,
      structureLabel: "Declarativa noticiosa com complemento temporal",
      tenseFocus: "presente, preterito perfeito, futuro, condicional",
      generatedPt:
        "O ministro anuncia novas regras antes da reuniao de sexta-feira.",
      promptZhHans: "部长在周五的会议前宣布新的规则。",
    },
  });
});

sentencesRoute.post("/sentences/feedback", async (c) => {
  const body = await readJson<{ userPt?: string; expectedPt?: string }>(c);

  return c.json({
    feedback: {
      summary:
        "Mock feedback: a estrutura principal esta clara; a proxima etapa vai comparar tempos, preposicoes e ordem das palavras.",
      diff: [
        {
          kind: "keep",
          user: body.userPt ?? "",
          expected: body.expectedPt ?? "",
        },
      ],
    },
  });
});
