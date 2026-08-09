export class StoryProjectError extends Error {
  constructor(public code: "NOT_FOUND" | "INVALID_ASSET" | "DATABASE_ERROR" | "NOT_PUBLISHABLE", message: string) {
    super(message)
  }
}
