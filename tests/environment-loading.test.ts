import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("API environment loading entry points", () => {
  it("keeps ordinary start separate from the explicit local env-file entry", async () => {
    const packageJson = JSON.parse(
      await readFile(
        new URL("../apps/api/package.json", import.meta.url),
        "utf8",
      ),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts.start).toBe(
      "node --experimental-strip-types src/main.ts",
    );
    expect(packageJson.scripts["start:local"]).toBe(
      "node --env-file-if-exists=.env.local --experimental-strip-types src/main.ts",
    );
  });

  it("loads only .env.local when the explicit Node entry is selected", async () => {
    const directory = await createEnvironmentFixture();

    const { stdout } = await execFileAsync(
      process.execPath,
      ["--env-file-if-exists=.env.local", "read-environment.mjs"],
      { cwd: directory, env: {} },
    );

    expect(JSON.parse(stdout)).toEqual({
      APP_ENV: "local",
      CONFIG_MARKER: "from-env-local",
    });
  });

  it("gives an explicitly supplied process value priority over .env.local", async () => {
    const directory = await createEnvironmentFixture();

    const { stdout } = await execFileAsync(
      process.execPath,
      ["--env-file-if-exists=.env.local", "read-environment.mjs"],
      {
        cwd: directory,
        env: { APP_ENV: "test", CONFIG_MARKER: "from-explicit-process" },
      },
    );

    expect(JSON.parse(stdout)).toEqual({
      APP_ENV: "test",
      CONFIG_MARKER: "from-explicit-process",
    });
  });

  it("does not load an env file for ordinary test, staging, or production paths", async () => {
    const directory = await createEnvironmentFixture();

    for (const appEnv of ["test", "staging", "production"]) {
      const { stdout } = await execFileAsync(
        process.execPath,
        ["read-environment.mjs"],
        { cwd: directory, env: { APP_ENV: appEnv } },
      );
      expect(JSON.parse(stdout)).toEqual({ APP_ENV: appEnv });
    }
  });

  it("does not select an env file merely because APP_ENV is local", async () => {
    const directory = await createEnvironmentFixture();
    const { stdout } = await execFileAsync(
      process.execPath,
      ["read-environment.mjs"],
      { cwd: directory, env: { APP_ENV: "local" } },
    );

    expect(JSON.parse(stdout)).toEqual({ APP_ENV: "local" });
  });
});

async function createEnvironmentFixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "haohao-env-test-"));
  temporaryDirectories.push(directory);
  await writeFile(
    join(directory, ".env.local"),
    "APP_ENV=local\nCONFIG_MARKER=from-env-local\n",
    "utf8",
  );
  await writeFile(
    join(directory, ".env"),
    "APP_ENV=production\nCONFIG_MARKER=from-plain-env\n",
    "utf8",
  );
  await writeFile(
    join(directory, "read-environment.mjs"),
    [
      "const output = {};",
      'for (const name of ["APP_ENV", "CONFIG_MARKER"]) {',
      "  if (process.env[name] !== undefined) output[name] = process.env[name];",
      "}",
      "process.stdout.write(JSON.stringify(output));",
      "",
    ].join("\n"),
    "utf8",
  );
  return directory;
}
