import { describe, expect, it } from "vitest";
import { clampSize } from "./resize";

describe("clampSize", () => {
  const room = 1000;
  const limits = { min: 300, maxRatio: 0.6, room };

  it("leaves a size that already fits alone", () => {
    expect(clampSize(450, limits)).toBe(450);
  });

  it("never goes below the minimum", () => {
    expect(clampSize(120, limits)).toBe(300);
  });

  it("never goes past its share of the room", () => {
    expect(clampSize(900, limits)).toBe(600);
  });

  it("shrinks a remembered size when the window gets smaller", () => {
    expect(clampSize(600, { ...limits, room: 700 })).toBe(420);
  });

  it("keeps the minimum when the room is too small for it", () => {
    expect(clampSize(600, { ...limits, room: 200 })).toBe(300);
  });

  it("waits for a measurement rather than guessing", () => {
    expect(clampSize(600, { ...limits, room: 0 })).toBe(600);
  });

  it("returns whole pixels", () => {
    expect(clampSize(432.7, limits)).toBe(433);
  });
});
