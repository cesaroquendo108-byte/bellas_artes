import { describe, expect, it } from "vitest";
import { getConfiguredQueueKinds } from "./generation-worker";

describe("generation worker queues", () => {
  it("normaliza, deduplica y limita las modalidades conocidas", () => {
    expect(getConfiguredQueueKinds(" image,audio,image,unknown ")).toEqual(["image", "audio"]);
  });

  it("permite aislar el worker a la cola de imagen", () => {
    expect(getConfiguredQueueKinds("image")).toEqual(["image"]);
  });
});
