import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { checkConfigBoundaries } from "../scripts/check-config-boundaries.ts";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

describe("repository configuration boundaries", () => {
  it("keeps tracked environment and Mini Program inputs within the approved boundary", () => {
    expect(() => checkConfigBoundaries(repositoryRoot)).not.toThrow();
  });
});
