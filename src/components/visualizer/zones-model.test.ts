import { describe, expect, it } from "vitest";
import { engine } from "@/engine";
import { buildZones } from "./zones-model";

const find = (cards: ReturnType<typeof buildZones>["work"], path: string) => cards.find((card) => card.path === path);

describe("file zones", () => {
  const edited = engine.build(['echo "a" > style.css', "git init", "git add .", 'git commit -m "First"', 'echo "b" > style.css']);

  it("keeps a staged file in the working directory, marked as also staged, with the committed copy marked older", () => {
    const zones = buildZones(engine.execute("git add style.css", edited).state);
    expect(find(zones.work, "style.css")).toMatchObject({ status: "clean", alsoStaged: true });
    expect(find(zones.stage, "style.css")?.status).toBe("staged-modified");
    expect(find(zones.repo, "style.css")?.superseded).toBe(true);
  });

  it("clears both markers once the change is committed", () => {
    const zones = buildZones(engine.execute('git add style.css && git commit -m "Second"', edited).state);
    expect(find(zones.work, "style.css")?.alsoStaged).toBe(false);
    expect(zones.stage).toEqual([]);
    expect(find(zones.repo, "style.css")?.superseded).toBe(false);
  });
});
