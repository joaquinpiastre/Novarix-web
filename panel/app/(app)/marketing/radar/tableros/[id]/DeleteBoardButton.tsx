"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteBoard } from "../../actions";

export function DeleteBoardButton({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Borrar el tablero? Los videos y las ideas del calendario no se borran.")) return;
        start(async () => {
          const res = await deleteBoard(boardId);
          if (res.error === undefined) router.push("/marketing/radar/tableros");
        });
      }}
    >
      <Trash2 className="h-4 w-4" /> Borrar tablero
    </Button>
  );
}
