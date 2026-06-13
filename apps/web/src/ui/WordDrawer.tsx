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

export function WordDrawer({ word, onClose }: { word: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [meaning, setMeaning] = useState("");
  const [tags, setTags] = useState("");
  const lookup = useQuery({
    queryKey: ["word", word],
    queryFn: () => lookupWord(word),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!lookup.data) throw new Error("Word lookup is not ready");
      return saveWordNote({ lookup: lookup.data, meaning, tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent height="half">
        <DrawerHeader>
          <div>
            <DrawerTitle>{word}</DrawerTitle>
            <DrawerDescription>imagem, exemplo curto, e a tua propria pista</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <button aria-label="Close">x</button>
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
                placeholder="Escreve em chines ou com as tuas palavras"
              />
            </label>
            <label>
              tags
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="cidade, politica, verbo irregular..."
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
