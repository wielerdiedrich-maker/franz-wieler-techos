import { describe, expect, it } from "vitest";

describe("Resend credentials", () => {
  it("authenticates with Resend without sending email", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    expect(apiKey, "RESEND_API_KEY must be configured").toBeTruthy();
    expect(from, "RESEND_FROM_EMAIL must be configured").toMatch(/^[^<>]+<[^<>@\s]+@[^<>@\s]+>$|^[^\s@]+@[^\s@]+$/);

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.ok, `Resend authentication failed with HTTP ${response.status}`).toBe(true);
  }, 30_000);
});
