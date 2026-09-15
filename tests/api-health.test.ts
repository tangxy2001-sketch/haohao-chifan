import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../apps/api/src/app.ts";

describe("API health route", () => {
  const apps = [] as ReturnType<typeof createApp>[];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("returns the exact versioned health response through request injection", async () => {
    const app = createApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^application\/json\b/);
    expect(response.json()).toEqual({ status: "ok" });
    expect(response.body).toBe('{"status":"ok"}');
  });
});
