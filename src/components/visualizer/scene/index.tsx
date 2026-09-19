"use client";

import type { SceneThemeId } from "@/store/settings-store";
import type { SceneProps } from "./common";
import { ListScene } from "./list-scene";
import type { SceneSkin } from "./skin";
import { linkedListSkin } from "./skins/linked-list";
import { railwaySkin } from "./skins/railway";
import { spaceSkin } from "./skins/space";

export const SKINS: Record<SceneThemeId, SceneSkin> = {
  clean: linkedListSkin,
  railway: railwaySkin,
  galaxy: spaceSkin,
};

/** The history in the chosen look. Remounts on a switch, so the new view fades in cleanly. */
export function ThemedScene({ theme, ...props }: SceneProps & { theme: SceneThemeId }) {
  return <ListScene key={theme} skin={SKINS[theme]} {...props} />;
}

export type { ScenePulse, SceneProps } from "./common";
