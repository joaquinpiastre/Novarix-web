"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { uploadClientFile, type ActionState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-2">
      {pending ? "Subiendo…" : "Subir"}
    </Button>
  );
}

export function UploadFileForm() {
  const [state, formAction] = useFormState<ActionState, FormData>(uploadClientFile, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        formRef.current?.reset();
      }}
      className="mt-3 flex flex-col gap-2"
    >
      <input
        type="file"
        name="file"
        required
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,video/mp4,video/quicktime"
        className="text-sm text-text-primary"
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
