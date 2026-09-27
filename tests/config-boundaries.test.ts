import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { checkConfigBoundaries } from "../scripts/check-config-boundaries.ts";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("repository configuration boundaries", () => {
  it("keeps tracked environment and Mini Program inputs within the approved boundary", () => {
    expect(() => checkConfigBoundaries(repositoryRoot)).not.toThrow();
  });

  it("does not pass non-whitelisted variables to the tracked-path subprocess", async () => {
    const fixtureRoot = await createBoundaryFixture();
    const commandPath = join(fixtureRoot, "synthetic-git.mjs");
    await writeFile(
      commandPath,
      [
        "if (process.env.SYNTHETIC_UNLISTED_SECRET !== undefined) process.exit(23);",
        'if (process.argv.slice(2).join(" ") !== "ls-files -z") process.exit(24);',
        'process.stdout.write("apps/api/.env.example\\0apps/miniprogram/.env.public.example\\0");',
        "",
      ].join("\n"),
      "utf8",
    );

    expect(() =>
      checkConfigBoundaries(fixtureRoot, {
        trackedPathsCommand: {
          file: process.execPath,
          argumentsPrefix: [commandPath],
        },
        environment: {
          PATH: process.env.PATH,
          SYNTHETIC_UNLISTED_SECRET: "SYNTHETIC_BOUNDARY_SECRET_4D91",
        },
      }),
    ).not.toThrow();
  });
});

async function createBoundaryFixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "haohao-boundary-test-"));
  temporaryDirectories.push(directory);
  await mkdir(join(directory, "apps", "api"), { recursive: true });
  await mkdir(join(directory, "apps", "miniprogram"), { recursive: true });
  await writeFile(
    join(directory, "apps", "api", ".env.example"),
    [
      "APP_ENV=local",
      "HOST=127.0.0.1",
      "PORT=3000",
      "CLOUDBASE_ENV_ID=example-cloudbase-environment.invalid",
      "DATABASE_URL=postgresql://example-user:example-not-a-real-password@example-database.invalid/example-database",
      "MODEL_API_BASE_URL=https://example-model-api.invalid/v1",
      "MODEL_API_KEY=example-not-a-real-secret",
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(
    join(directory, "apps", "miniprogram", ".env.public.example"),
    "MINIPROGRAM_PUBLIC_API_BASE_URL=https://example-api.invalid\n",
    "utf8",
  );
  return directory;
}
