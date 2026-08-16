import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const mobileRoutes = {
  "/dashboard": "src/app/(app)/dashboard/page.tsx",
  "/image": "src/app/(app)/image/page.tsx",
  "/video": "src/app/(app)/video/page.tsx",
  "/audio/my": "src/app/(app)/audio/my/page.tsx",
  "/director": "src/app/(app)/director/page.tsx",
  "/characters": "src/app/(app)/characters/page.tsx",
  "/world": "src/app/(app)/world/page.tsx",
  "/assets": "src/app/(app)/assets/page.tsx",
  "/director/projects": "src/app/(app)/director/projects/page.tsx",
  "/settings": "src/app/(app)/settings/page.tsx",
};

describe("Bellas Artes Farmacia Azul workspace redesign", () => {
  it("keeps every primary mobile destination backed by a real page", () => {
    for (const [href, file] of Object.entries(mobileRoutes)) {
      expect(existsSync(path.join(root, file)), `${href} has no page`).toBe(true);
    }
  });

  it("installs the blue editorial theme and mobile navigation only inside private routes", () => {
    const privateLayout = read("src/app/(app)/layout.tsx");
    const rootLayout = read("src/app/layout.tsx");
    expect(privateLayout).toContain('className="workspace-theme"');
    expect(privateLayout).toContain("WorkspaceMobileNav");
    expect(rootLayout).toContain('className="ba-azul"');
    expect(rootLayout).not.toContain("WorkspaceMobileNav");
  });

  it("preserves reduced-motion behavior and mobile safe areas", () => {
    const css = read("src/app/globals.css");
    const mobileNav = read("src/components/workspace/workspace-mobile-nav.tsx");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(mobileNav).toContain("motion-reduce");
  });

  it("does not advertise free generation or introduce provider calls", () => {
    const mediaHub = read("src/components/media-hub/media-hub.tsx");
    const workspaceDirectory = [
      read("src/components/workspace/workspace-header.tsx"),
      read("src/components/workspace/workspace-mobile-nav.tsx"),
      read("src/components/workspace/mobile-bottom-sheet.tsx"),
      read("src/components/ui/workspace.tsx"),
    ].join("\n");
    expect(mediaHub).not.toContain("Crear gratis");
    expect(workspaceDirectory).not.toContain("/api/generate");
    expect(workspaceDirectory).not.toMatch(/runpod/i);
  });
});
