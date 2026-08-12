import { describe, expect, it } from "vitest";

import { formatAdminDateTime, formatRelativeAt } from "./format";

describe("admin date formatting", () => {
  it("uses a stable snapshot reference instead of the current clock", () => {
    const generatedAt = "2026-08-12T23:20:10.000Z";

    expect(formatRelativeAt("2026-08-12T23:20:10.000Z", generatedAt)).toBe("hace 0s");
    expect(formatRelativeAt("2026-08-12T23:19:51.000Z", generatedAt)).toBe("hace 19s");
    expect(formatRelativeAt("2026-08-12T21:20:10.000Z", generatedAt)).toBe("hace 2h");
  });

  it("uses the fixed Caracas timezone for older observations", () => {
    expect(formatAdminDateTime("2026-08-10T13:30:00.000Z")).toContain("9:30");
    expect(formatRelativeAt("2026-08-10T13:30:00.000Z", "2026-08-12T23:20:10.000Z")).toContain("2026");
  });
});
