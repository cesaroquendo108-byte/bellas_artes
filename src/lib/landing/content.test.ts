import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { communityCategories } from "@/lib/social/contracts";

import {
  buildLandingStudioHref,
  directorTemplates,
  inspirationCategories,
  landingAssets,
  landingVideos,
  models,
  primaryLandingRoutes,
  quickStarts,
  statusLabels,
  suiteCapabilities,
} from "./content";

const root = process.cwd();

const routeFiles: Record<string, string> = {
  "/": "src/app/page.tsx",
  "/login": "src/app/login/page.tsx",
  "/dashboard": "src/app/(app)/dashboard/page.tsx",
  "/inspire": "src/app/(marketing)/inspire/page.tsx",
  "/director": "src/app/(app)/director/page.tsx",
  "/image": "src/app/(app)/image/page.tsx",
  "/video": "src/app/(app)/video/page.tsx",
  "/video/t2v": "src/app/(app)/video/[tool]/page.tsx",
  "/characters": "src/app/(app)/characters/page.tsx",
  "/characters/create": "src/app/(app)/characters/create/page.tsx",
  "/world": "src/app/(app)/world/page.tsx",
  "/audio/my": "src/app/(app)/audio/my/page.tsx",
  "/audio/tts": "src/app/(app)/audio/tts/page.tsx",
};

describe("landing content manifest", () => {
  it("uses unique ids and all public capability states", () => {
    const capabilities = [...quickStarts, ...directorTemplates, ...suiteCapabilities];
    expect(new Set(capabilities.map((item) => item.id)).size).toBe(capabilities.length);
    expect(new Set([...capabilities.map((item) => item.status), ...models.map((item) => item.status)])).toEqual(
      new Set(Object.keys(statusLabels)),
    );
  });

  it("only links to real application routes", () => {
    for (const href of primaryLandingRoutes) {
      const pathname = new URL(href, "https://bellas-artes.local").pathname;
      const routeFile = routeFiles[pathname];
      expect(routeFile, `Missing route map for ${pathname}`).toBeTruthy();
      expect(existsSync(path.join(root, routeFile)), `${pathname} has no page`).toBe(true);
    }
  });

  it("keeps every image key local and below the landing payload budget", () => {
    let bytes = 0;
    for (const source of Object.values(landingAssets)) {
      expect(source.startsWith("/landing/")).toBe(true);
      const file = path.join(root, "public", source);
      expect(existsSync(file), `${source} does not exist`).toBe(true);
      bytes += statSync(file).size;
    }
    expect(bytes).toBeLessThan(2 * 1024 * 1024);
  });

  it("keeps every landing video and poster local and optimized", () => {
    let videoBytes = 0;
    for (const video of Object.values(landingVideos)) {
      expect(video.src.startsWith("/landing/clips/")).toBe(true);
      expect(video.poster.startsWith("/landing/posters/")).toBe(true);
      expect(existsSync(path.join(root, "public", video.src))).toBe(true);
      expect(existsSync(path.join(root, "public", video.poster))).toBe(true);
      videoBytes += statSync(path.join(root, "public", video.src)).size;
    }
    expect(videoBytes).toBeLessThan(8 * 1024 * 1024);
  });

  it("uses valid community categories", () => {
    for (const item of inspirationCategories) {
      expect(communityCategories).toContain(item.category);
    }
  });

  it("preserves prompts and existing query parameters in deep links", () => {
    expect(buildLandingStudioHref("/director?template=short-film", "  Un viaje entre tepuyes  ")).toBe(
      "/director?template=short-film&prompt=Un+viaje+entre+tepuyes",
    );
    expect(buildLandingStudioHref("/image", "Retrato editorial")).toBe(
      "/image?prompt=Retrato+editorial",
    );
  });

  it("never calls generation from the landing and ships no copied host URLs", () => {
    const landingDirectory = path.join(root, "src/components/landing");
    const source = readdirSync(landingDirectory)
      .filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"))
      .map((file) => readFileSync(path.join(landingDirectory, file), "utf8"))
      .join("\n");
    expect(source).not.toContain("/api/generate");
    expect(source).not.toMatch(/https?:\/\/[^\s\"']*openart\.ai/i);
  });
});
