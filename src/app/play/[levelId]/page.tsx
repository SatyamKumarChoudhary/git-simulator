import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameScreen } from "@/components/game/game-screen";
import { findLevel, levelEntries } from "@/content";

export function generateStaticParams() {
  return levelEntries.map((entry) => ({ levelId: entry.level.id }));
}

export async function generateMetadata(props: PageProps<"/play/[levelId]">): Promise<Metadata> {
  const { levelId } = await props.params;
  const entry = findLevel(levelId);
  return { title: entry ? `${entry.level.title} · GitQuest` : "Level not found · GitQuest" };
}

export default async function PlayPage(props: PageProps<"/play/[levelId]">) {
  const { levelId } = await props.params;
  if (!findLevel(levelId)) notFound();
  return <GameScreen key={levelId} session={{ kind: "level", levelId }} />;
}
