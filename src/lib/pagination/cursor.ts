import { z } from "zod";

const SeekCursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export type SeekCursor = z.infer<typeof SeekCursorSchema>;

export function encodeSeekCursor(cursor: SeekCursor): string {
  return Buffer.from(JSON.stringify(SeekCursorSchema.parse(cursor)), "utf8").toString("base64url");
}

export function decodeSeekCursor(value?: string): SeekCursor | null {
  if (!value) return null;

  try {
    return SeekCursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }
}

export function buildSeekFilter(cursor: SeekCursor): string {
  return [
    `created_at.lt.${cursor.createdAt}`,
    `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
  ].join(",");
}
