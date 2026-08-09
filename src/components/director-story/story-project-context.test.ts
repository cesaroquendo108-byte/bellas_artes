import { describe, expect, it } from "vitest"

import { storyProjectReducer, type StoryProjectState } from "./story-project-context"

const initialState: StoryProjectState = {
  projectId: null,
  kind: "story",
  title: "Mi historia",
  description: "",
  storyType: "custom",
  coverAssetId: null,
  document: { version: 1, scenes: [] },
  view: "storyboard",
  saveState: "idle",
  message: null,
  dirty: false,
}

describe("Story project editor state", () => {
  it("crea, duplica y reordena escenas y shots", () => {
    let state = storyProjectReducer(initialState, { type: "add_scene", sceneId: "11111111-1111-4111-8111-111111111111", shotId: "21111111-1111-4111-8111-111111111111" })
    state = storyProjectReducer(state, { type: "add_scene", sceneId: "31111111-1111-4111-8111-111111111111", shotId: "41111111-1111-4111-8111-111111111111" })
    state = storyProjectReducer(state, { type: "move_scene", sceneId: "31111111-1111-4111-8111-111111111111", direction: -1 })
    expect(state.document.scenes.map((scene) => scene.id)).toEqual(["31111111-1111-4111-8111-111111111111", "11111111-1111-4111-8111-111111111111"])
    expect(state.document.scenes.map((scene) => scene.order)).toEqual([0, 1])

    state = storyProjectReducer(state, { type: "duplicate_shot", sceneId: "31111111-1111-4111-8111-111111111111", shotId: "41111111-1111-4111-8111-111111111111", newId: "51111111-1111-4111-8111-111111111111" })
    expect(state.document.scenes[0]?.shots).toHaveLength(2)
    expect(state.document.scenes[0]?.durationSeconds).toBe(10)
  })

  it("marca un borrador recuperado para sincronización", () => {
    const recovered = storyProjectReducer(initialState, {
      type: "hydrate",
      value: {
        title: "Borrador recuperado",
        document: { version: 1, scenes: [] },
      },
    })
    expect(recovered.title).toBe("Borrador recuperado")
    expect(recovered.dirty).toBe(true)
    expect(recovered.saveState).toBe("local")
    expect(recovered.message).toMatch(/recuperado/i)
  })
})
