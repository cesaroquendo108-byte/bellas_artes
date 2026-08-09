import { describe, expect, it } from "vitest"
import { communityListQuerySchema, createCommunityPostSchema, moderationDecisionSchema } from "./contracts"

const valid = { assetId: "11111111-1111-4111-8111-111111111111", title: "Campaña", category: "marketing-advertising", directPayload: { kind: "image", targetPath: "/image", prompt: "Luz editorial" } }

describe("social contracts", () => {
  it("acepta una publicación válida", () => expect(createCommunityPostSchema.safeParse(valid).success).toBe(true))
  it("rechaza identidad y categorías desconocidas", () => {
    expect(createCommunityPostSchema.safeParse({ ...valid, userId: valid.assetId }).success).toBe(false)
    expect(createCommunityPostSchema.safeParse({ ...valid, category: "otro" }).success).toBe(false)
    expect(createCommunityPostSchema.safeParse({ ...valid, directPayload: { kind: "image", targetPath: "/admin/community" } }).success).toBe(false)
  })
  it("valida moderación y paginación", () => {
    expect(moderationDecisionSchema.safeParse({ decision: "approve" }).success).toBe(true)
    expect(moderationDecisionSchema.safeParse({ decision: "publish" }).success).toBe(false)
    expect(communityListQuerySchema.parse({ limit: "20" }).limit).toBe(20)
  })
})
