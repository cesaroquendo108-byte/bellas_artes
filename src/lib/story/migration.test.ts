import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(join(process.cwd(), "supabase/migrations/202608080002_story_director_projects.sql"), "utf8")

describe("Story migration security", () => {
  it("activa RLS y limita escrituras al propietario", () => {
    expect(sql).toContain("alter table public.creative_projects enable row level security")
    expect(sql).toContain("auth.uid() = user_id")
    expect(sql).toContain("creative_projects_insert_own")
    expect(sql).toContain("creative_projects_update_own")
    expect(sql).toContain("creative_projects_delete_own")
  })

  it("sólo expone proyectos comunitarios listos o completados", () => {
    expect(sql).toContain("visibility = 'community' and status in ('ready', 'completed')")
    expect(sql).toContain("cover_asset_id is not null")
    expect(sql).toContain("jsonb_array_length(document -> 'scenes') > 0")
  })

  it("valida ownership de portada y assets del documento", () => {
    expect(sql).toContain("validate_creative_project_cover")
    expect(sql).toContain("validate_creative_project_assets")
    expect(sql).toContain("where id = v_asset_id::uuid and user_id = new.user_id")
  })
})
