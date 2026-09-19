import { AppearanceToggle } from "@/components/appearance-toggle";
import { Logo } from "@/components/brand";
import { LevelMap } from "@/components/home/level-map";
import { MapBackdrop } from "@/components/home/map-backdrop";

/** The home page is just the level map. */
export default function Home() {
  return (
    <div className="map-page relative isolate min-h-dvh overflow-x-clip">
      <MapBackdrop />
      <header className="sticky top-0 z-30 border-b border-line bg-page/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Logo />
          <AppearanceToggle />
        </div>
      </header>
      <main className="px-5 pb-20 pt-10">
        <LevelMap />
      </main>
    </div>
  );
}
