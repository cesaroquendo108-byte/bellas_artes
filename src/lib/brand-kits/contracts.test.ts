import { describe, expect, it } from "vitest"
import { createBrandKitSchema, updateBrandKitSchema } from "./contracts"

describe("brand kit contracts", () => {
  it("normaliza colores y aplica defaults", () => {
    const result = createBrandKitSchema.parse({ name: "Mi marca", colors: ["#8b5cf6"] })
    expect(result.colors).toEqual(["#8B5CF6"])
    expect(result.typography.primary).toBe("Inter")
  })
  it("rechaza colores, identidad y campos desconocidos", () => {
    expect(createBrandKitSchema.safeParse({ name: "Marca", colors: ["purple"] }).success).toBe(false)
    expect(createBrandKitSchema.safeParse({ name: "Marca", userId: "otro" }).success).toBe(false)
    expect(updateBrandKitSchema.safeParse({}).success).toBe(false)
  })
})
