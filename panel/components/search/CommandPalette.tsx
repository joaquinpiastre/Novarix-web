"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { globalSearch, type SearchResult } from "@/app/(app)/search/actions";

export const OPEN_COMMAND_PALETTE_EVENT = "novarix:open-command-palette";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) setResults([]);
  }, [open]);

  const handleSearch = useCallback((value: string) => {
    startTransition(async () => {
      const r = await globalSearch(value);
      setResults(r);
    });
  }, []);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    router.push(result.type === "client" ? "/payments/in" : "/tasks");
  };

  const clients = results.filter((r) => r.type === "client");
  const tasks = results.filter((r) => r.type === "task");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle className="sr-only">Buscar</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar clientes o tareas…" onValueChange={handleSearch} autoFocus />
          <CommandList>
            {!isPending && results.length === 0 && (
              <CommandEmpty>Escribí al menos 2 letras para buscar.</CommandEmpty>
            )}
            {clients.length > 0 && (
              <CommandGroup heading="Clientes">
                {clients.map((r) => (
                  <CommandItem key={`client-${r.id}`} onSelect={() => handleSelect(r)}>
                    {r.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {tasks.length > 0 && (
              <CommandGroup heading="Tareas">
                {tasks.map((r) => (
                  <CommandItem key={`task-${r.id}`} onSelect={() => handleSelect(r)}>
                    {r.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
