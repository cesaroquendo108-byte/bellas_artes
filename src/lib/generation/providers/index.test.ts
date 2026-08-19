import { describe, expect, it } from "vitest";

import { ComfyUIProvider, getProvider, NativeHttpProvider } from "./index";

describe("generation provider routing", () => {
  it("elige el motor declarado por backend sin disfrazar nativos como ComfyUI", () => {
    expect(getProvider("vast", "image", "flux-schnell")).toBeInstanceOf(ComfyUIProvider);
    expect(getProvider("vast", "image", "pixart-sigma")).toBeInstanceOf(NativeHttpProvider);
    expect(getProvider("vast", "video", "hunyuan-video-8.3b")).toBeInstanceOf(NativeHttpProvider);
  });

  it("rechaza componentes y dependencias como generadores autónomos", () => {
    expect(() => getProvider("vast", "character", "controlnet-dwpose")).toThrowError("El modelo no es un generador ejecutable.");
    expect(() => getProvider("vast", "image", "unknown")).toThrowError("El modelo no es un generador ejecutable.");
  });
});
