import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(join(process.cwd(), "supabase/migrations/202608080003_social_brand_kits.sql"), "utf8")

describe("phase 7 migration", () => {
  it("protege Brand Kits por propietario", () => {
    expect(sql).toContain("alter table public.brand_kits enable row level security")
    expect(sql).toContain("auth.uid() = user_id")
    expect(sql).toContain("validate_brand_kit_asset")
  })
  it("sólo expone publicaciones aprobadas", () => {
    expect(sql).toContain("status = 'published'")
    expect(sql).toContain("community_posts_insert_own_pending")
    expect(sql).toContain("validate_community_post_asset")
  })
})
