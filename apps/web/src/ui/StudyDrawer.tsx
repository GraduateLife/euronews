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
import { lookupWord, saveWordNote } from "../services/api";

/**
 * One consistent study drawer for any selection — a single word or a longer
 * expression. It looks the term up, shows an image and a short usage example,
 * and lets the reader keep their own meaning and tags.
 */
export function StudyDrawer({ term, onClose }: { term: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [meaning, setMeaning] = useState("");
  const [tags, setTags] = useState("");
  const lookup = useQuery({
    queryKey: ["term", term],
    queryFn: () => lookupWord(term),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!lookup.data) throw new Error("Lookup is not ready");
      return saveWordNote({ lookup: lookup.data, meaning, tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });

  const isPhrase = term.trim().includes(" ");

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent height="half">
        <DrawerHeader>
          <div>
            <DrawerTitle>{term}</DrawerTitle>
            <DrawerDescription>
              {isPhrase ? "Imagem, exemplo e a tua própria nota." : "Imagem, exemplo curto e a tua própria pista."}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button aria-label="Fechar">&times;</button>
          </DrawerClose>
        </DrawerHeader>

        {lookup.data ? (
          <div className="drawer-body">
            <img className="word-image" src={lookup.data.image.url} alt={lookup.data.image.alt} />
            <p className="example">{lookup.data.examplePt}</p>
            <label>
              significado
              <input
                value={meaning}
                onChange={(event) => setMeaning(event.target.value)}
                placeholder="Escreve em chinês ou com as tuas palavras"
              />
            </label>
            <label>
              etiquetas
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="cidade, política, verbo irregular…"
              />
            </label>
            <button className="primary-action" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isSuccess ? "guardado" : "guardar no caderno"}
            </button>
            <a className="external-link" href={lookup.data.priberamUrl} target="_blank" rel="noreferrer">
              abrir no Priberam
            </a>
          </div>
        ) : (
          <p className="muted">A procurar uma imagem e um exemplo curto.</p>
        )}
      </DrawerContent>
    </Drawer>
  );
}
