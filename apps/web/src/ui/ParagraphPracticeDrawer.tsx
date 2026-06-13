import type { PracticeFeedback } from "@euronews/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../components/ui/drawer";
import { createParagraphFeedback, createParagraphPractice } from "../services/api";

export function ParagraphPracticeDrawer({
  paragraphPt,
  selectedText,
  targetSentence,
  onClose,
}: {
  paragraphPt: string;
  selectedText: string;
  targetSentence: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [zh, setZh] = useState("");
  const [pt, setPt] = useState("");
  const [faded, setFaded] = useState(false);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const practice = useQuery({
    queryKey: ["paragraph-practice", paragraphPt, selectedText, targetSentence],
    queryFn: () => createParagraphPractice({ paragraphPt, selectedText, targetSentence }),
  });
  const compare = useMutation({
    mutationFn: async () => {
      if (!practice.data) throw new Error("Practice is not ready");
      return createParagraphFeedback({
        practice: practice.data,
        userZhHans: zh,
        userPt: pt,
      });
    },
    onSuccess: (result) => {
      setFeedback(result.feedback);
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent height="tall">
        <DrawerHeader>
          <div>
            <DrawerTitle>Treino de paragrafo</DrawerTitle>
            <DrawerDescription>usa a frase selecionada sem perder o contexto do paragrafo</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button aria-label="Close">x</button>
          </DrawerClose>
        </DrawerHeader>

        <div className="drawer-body practice-flow">
          <section className="practice-context">
            <small>paragrafo</small>
            <p>{paragraphPt}</p>
            <small>frase-alvo</small>
            <p>{targetSentence}</p>
          </section>

          {practice.data ? (
            <>
              <p className={faded ? "generated faded" : "generated"}>{practice.data.generatedParagraphPt}</p>
              <p className="prompt-zh">{practice.data.promptZhHans}</p>
              <label>
                traducao em chines
                <textarea value={zh} onChange={(event) => setZh(event.target.value)} />
              </label>
              <button onClick={() => setFaded(true)}>ocultar devagar</button>
              <label>
                volta para portugues
                <textarea value={pt} onChange={(event) => setPt(event.target.value)} />
              </label>
              <button className="primary-action" onClick={() => compare.mutate()} disabled={compare.isPending}>
                {compare.isSuccess ? "guardado no caderno" : "comparar"}
              </button>
              {feedback ? (
                <section className="feedback-box">
                  <strong>{feedback.summary}</strong>
                  {feedback.diff.map((part, index) => (
                    <p key={index}>
                      <span>{part.kind}</span>
                      {part.user ? <del>{part.user}</del> : null}
                      {part.expected ? <ins>{part.expected}</ins> : null}
                      {part.note ? <small>{part.note}</small> : null}
                    </p>
                  ))}
                </section>
              ) : null}
            </>
          ) : (
            <p className="muted">A construir um treino para este paragrafo.</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
