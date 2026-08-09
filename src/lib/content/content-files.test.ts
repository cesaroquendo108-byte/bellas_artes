import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const blog = readFileSync(join(process.cwd(), "content/blog/director-de-la-idea-al-storyboard.mdx"), "utf8")
const tutorial = readFileSync(join(process.cwd(), "content/tutorials/crear-primera-imagen.mdx"), "utf8")

describe("versioned MDX content", () => {
  it("incluye metadata editorial obligatoria", () => {
    for (const key of ["slug", "title", "excerpt", "category", "publishedAt", "author", "cover"]) expect(blog).toContain(`${key}:`)
  })
  it("marca tutoriales escritos sin video ficticio", () => {
    expect(tutorial).toContain('mediaType: "guide"')
    expect(tutorial).not.toContain("videoUrl:")
  })
})
