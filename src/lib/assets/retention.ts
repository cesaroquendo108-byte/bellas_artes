export function assetExpiryForPlan(plan: string, now = new Date()) {
  if (plan === "pro" || plan === "b2b") return null;
  return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
}
