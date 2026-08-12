export const generationQueueNames = ["image", "video", "audio", "character", "world"] as const;
export type GenerationQueueKind = (typeof generationQueueNames)[number];
