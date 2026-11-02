import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/prompt-composer/compose", () => {
  it("rejects request without sections or presetId", async () => {
    const req = new Request("http://localhost:3000/api/prompt-composer/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Debe proporcionar");
  });

  it("composes successfully with valid presetId", async () => {
    const req = new Request("http://localhost:3000/api/prompt-composer/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        presetId: "preset_fiduciary_anchor",
        options: { seed: 42 },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.result.positive).toContain("financial analyst");
    expect(data.result.seedUsed).toBe(42);
  });

  it("composes successfully with custom sections", async () => {
    const req = new Request("http://localhost:3000/api/prompt-composer/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sections: [
          {
            id: "s1",
            name: "Subject",
            category: "subject",
            enabled: true,
            randomize: false,
            endSeparator: "comma",
            showLabel: false,
            order: 1,
            entries: [
              {
                id: "e1",
                name: "Anchor",
                category: "subject",
                text: "lead market strategist",
              },
            ],
          },
        ],
        asComfyNode: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.result.positive).toBe("lead market strategist");
    expect(data.comfyInput).toBeDefined();
    expect(data.comfyInput.composer_state).toContain("Subject");
  });
});
