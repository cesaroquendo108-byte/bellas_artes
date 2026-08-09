import { describe, expect, it } from "vitest";
import { buildSeekFilter, decodeSeekCursor, encodeSeekCursor } from "./cursor";

const cursor = {
  createdAt: "2026-08-08T12:30:45.123+00:00",
  id: "8cc67fb8-8bc4-41dc-aee0-cf97bb3df126",
};

describe("cursor paginado", () => {
  it("conserva fecha e id para desempatar filas con la misma fecha", () => {
    expect(decodeSeekCursor(encodeSeekCursor(cursor))).toEqual(cursor);
  });

  it("descarta cursores manipulados", () => {
    expect(decodeSeekCursor("no-es-un-cursor")).toBeNull();
  });

  it("genera el filtro seek compuesto", () => {
    expect(buildSeekFilter(cursor)).toContain(`created_at.eq.${cursor.createdAt}`);
    expect(buildSeekFilter(cursor)).toContain(`id.lt.${cursor.id}`);
  });
});
