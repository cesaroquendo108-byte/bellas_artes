export const generationCreditRates = {
  image: 1,
  video: 80,
  audio: 0,
  character: 0,
  world: 0,
} as const;

export const creditPackages = {
  curioso: 600,
  creador: 1600,
  estudio: 3500,
} as const;

export type GenerationBillableKind = keyof typeof generationCreditRates;

export function getGenerationCreditCost(kind: GenerationBillableKind) {
  return generationCreditRates[kind];
}
