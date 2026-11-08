import { describe, expect, it } from "vitest";
import { ROW_ENTER, ROW_EXIT, ROW_MOVE, ROW_SHIFT_PX, rowVariants } from "@/components/models/row-motion";

const seconds = (t: { duration?: number }) => t.duration ?? Number.NaN;

describe("catalog row motion", () => {
  it("is short: every transition lasts 160 to 220 ms", () => {
    for (const t of [ROW_ENTER, ROW_EXIT, ROW_MOVE]) {
      expect(seconds(t)).toBeGreaterThanOrEqual(0.16);
      expect(seconds(t)).toBeLessThanOrEqual(0.22);
    }
  });

  it("eases out", () => {
    for (const t of [ROW_ENTER, ROW_EXIT, ROW_MOVE]) expect(t.ease).toBe("easeOut");
  });

  it("moves rows by 8 px at most", () => {
    expect(ROW_SHIFT_PX).toBeGreaterThan(0);
    expect(ROW_SHIFT_PX).toBeLessThanOrEqual(8);
    expect(rowVariants.hidden).toMatchObject({ opacity: 0, y: ROW_SHIFT_PX });
    expect(rowVariants.shown).toMatchObject({ opacity: 1, y: 0 });
  });

  it("fades out over ROW_EXIT, or at once while the search text changes", () => {
    expect(rowVariants.gone(false)).toMatchObject({ opacity: 0, transition: ROW_EXIT });
    expect(rowVariants.gone(true)).toMatchObject({ opacity: 0, transition: { duration: 0 } });
  });
});
