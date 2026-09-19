"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomCommand } from "@/engine";
import { uid } from "@/lib/utils";

const EXAMPLES: CustomCommand[] = [
  {
    id: "example-save",
    name: "git save",
    description: "Stage everything and commit it in one go. Usage: git save \"message\"",
    steps: ["git add .", 'git commit -m "$@"'],
  },
  {
    id: "example-feature",
    name: "feature",
    description: "Start a feature branch with a first commit. Usage: feature <name>",
    steps: ["git switch -c $1", 'echo "TODO: build $1" > $1.md', "git add .", 'git commit -m "Start $1"'],
  },
  {
    id: "example-oops",
    name: "git oops",
    description: "Undo the last commit but keep its changes staged.",
    steps: ["git reset --soft HEAD~1"],
  },
];

interface CustomCommandsState {
  commands: CustomCommand[];
  add: (command: Omit<CustomCommand, "id">) => void;
  update: (id: string, command: Omit<CustomCommand, "id">) => void;
  remove: (id: string) => void;
  restoreExamples: () => void;
}

export const useCustomCommands = create<CustomCommandsState>()(
  persist(
    (set, get) => ({
      commands: EXAMPLES,
      add: (command) => set({ commands: [...get().commands, { ...command, id: uid() }] }),
      update: (id, command) => set({ commands: get().commands.map((c) => (c.id === id ? { ...command, id } : c)) }),
      remove: (id) => set({ commands: get().commands.filter((c) => c.id !== id) }),
      restoreExamples: () => {
        const names = new Set(get().commands.map((c) => c.name));
        set({ commands: [...get().commands, ...EXAMPLES.filter((example) => !names.has(example.name))] });
      },
    }),
    { name: "gitquest-custom-commands", version: 1 },
  ),
);
