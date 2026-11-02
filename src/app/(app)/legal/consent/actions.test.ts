import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  headers: vi.fn(),
  requireUser: vi.fn(),
  recordLegalConsent: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mocks.redirect(url);
    throw new Error(`NEXT_REDIRECT: ${url}`);
  },
}));

vi.mock("next/headers", () => ({
  headers: () => mocks.headers(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: () => mocks.requireUser(),
}));

vi.mock("@/lib/legal/consent", () => ({
  recordLegalConsent: (args: unknown) => mocks.recordLegalConsent(args),
}));

import { acceptLegalConsent } from "./actions";

describe("acceptLegalConsent action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects with error=required if terms are not accepted", async () => {
    const formData = new FormData();
    formData.append("next", "/director");
    formData.append("moderationAccepted", "on");

    await expect(acceptLegalConsent(formData)).rejects.toThrow("NEXT_REDIRECT: /legal/consent?next=%2Fdirector&error=required");
    expect(mocks.redirect).toHaveBeenCalledWith("/legal/consent?next=%2Fdirector&error=required");
    expect(mocks.recordLegalConsent).not.toHaveBeenCalled();
  });

  it("redirects with error=required if moderation is not accepted", async () => {
    const formData = new FormData();
    formData.append("next", "/dashboard");
    formData.append("termsAccepted", "on");

    await expect(acceptLegalConsent(formData)).rejects.toThrow("NEXT_REDIRECT: /legal/consent?next=%2Fdashboard&error=required");
    expect(mocks.redirect).toHaveBeenCalledWith("/legal/consent?next=%2Fdashboard&error=required");
    expect(mocks.recordLegalConsent).not.toHaveBeenCalled();
  });

  it("records legal consent and redirects to nextPath with x-forwarded-for", async () => {
    const formData = new FormData();
    formData.append("next", "/story/123");
    formData.append("termsAccepted", "on");
    formData.append("moderationAccepted", "on");

    mocks.requireUser.mockResolvedValue({ user: { id: "test-user-id" } });
    mocks.headers.mockResolvedValue(new Headers({
      "x-forwarded-for": "198.51.100.42, 10.0.0.1",
      "user-agent": "Mozilla/5.0 TestAgent",
    }));

    await expect(acceptLegalConsent(formData)).rejects.toThrow("NEXT_REDIRECT: /story/123");
    expect(mocks.recordLegalConsent).toHaveBeenCalledWith({
      userId: "test-user-id",
      ipAddress: "198.51.100.42",
      userAgent: "Mozilla/5.0 TestAgent",
      source: "consent-page",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/story/123");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", async () => {
    const formData = new FormData();
    formData.append("termsAccepted", "on");
    formData.append("moderationAccepted", "on");

    mocks.requireUser.mockResolvedValue({ user: { id: "test-user-id" } });
    mocks.headers.mockResolvedValue(new Headers({
      "x-real-ip": "203.0.113.88",
    }));

    await expect(acceptLegalConsent(formData)).rejects.toThrow("NEXT_REDIRECT: /dashboard");
    expect(mocks.recordLegalConsent).toHaveBeenCalledWith({
      userId: "test-user-id",
      ipAddress: "203.0.113.88",
      userAgent: undefined,
      source: "consent-page",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
