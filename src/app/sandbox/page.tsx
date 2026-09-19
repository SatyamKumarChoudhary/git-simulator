import type { Metadata } from "next";
import { GameScreen } from "@/components/game/game-screen";

export const metadata: Metadata = { title: "Sandbox · GitQuest" };

export default function SandboxPage() {
  return <GameScreen session={{ kind: "sandbox", presetId: "fresh-project" }} />;
}
