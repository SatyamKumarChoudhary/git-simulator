import { beforeEach, describe, expect, it } from "vitest";
import { useLayout } from "./layout-store";

describe("layout store", () => {
  beforeEach(() => useLayout.getState().resetSizes());

  it("starts with nothing pinned, so panels are sized by the layout", () => {
    expect(useLayout.getState().sizes).toEqual({});
  });

  it("remembers a size per split, in whole pixels", () => {
    useLayout.getState().setSize("game.side", 512.4);
    useLayout.getState().setSize("board.files", 200);
    expect(useLayout.getState().sizes).toEqual({ "game.side": 512, "board.files": 200 });
  });

  it("hands one split back to the layout without disturbing the others", () => {
    useLayout.getState().setSize("game.side", 512);
    useLayout.getState().setSize("board.files", 200);
    useLayout.getState().clearSize("board.files");
    expect(useLayout.getState().sizes).toEqual({ "game.side": 512 });
  });

  it("ignores a split that was never sized", () => {
    useLayout.getState().setSize("game.side", 512);
    useLayout.getState().clearSize("nothing.here");
    expect(useLayout.getState().sizes).toEqual({ "game.side": 512 });
  });
});
