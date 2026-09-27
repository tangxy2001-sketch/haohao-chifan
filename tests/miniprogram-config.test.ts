import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createPublicConfigSource,
  generatePublicConfig,
  parsePublicApiBaseUrl,
} from "../scripts/generate-miniprogram-config.ts";

const SECRET_SENTINEL = "SYNTHETIC_CLIENT_SECRET_SENTINEL_C83B";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("Mini Program public API URL", () => {
  it.each(["local", "test"])(
    "accepts HTTP and HTTPS origins for %s",
    (targetEnvironment) => {
      expect(
        parsePublicApiBaseUrl(targetEnvironment, "http://localhost:3000"),
      ).toBe("http://localhost:3000");
      expect(
        parsePublicApiBaseUrl(
          targetEnvironment,
          "  https://example-api.invalid/  ",
        ),
      ).toBe("https://example-api.invalid");
    },
  );

  it.each(["staging", "production"])(
    "accepts HTTPS and rejects HTTP for %s",
    (targetEnvironment) => {
      expect(
        parsePublicApiBaseUrl(targetEnvironment, "https://example-api.invalid"),
      ).toBe("https://example-api.invalid");
      expect(() =>
        parsePublicApiBaseUrl(targetEnvironment, "http://example-api.invalid"),
      ).toThrow(/require HTTPS/);
    },
  );

  it("rejects unknown target environments", () => {
    expect(() =>
      parsePublicApiBaseUrl("preview", "https://example-api.invalid"),
    ).toThrow(/target environment/);
  });

  it.each([
    "relative.example.invalid",
    "ftp://example-api.invalid",
    "https://synthetic-user:synthetic-password@example-api.invalid",
    "https://example-api.invalid/v1",
    "https://example-api.invalid/v1/..",
    "https://example-api.invalid/%2e",
    "https://example-api.invalid?query=value",
    "https://example-api.invalid#fragment",
    "https://example-api.invalid?",
    "https://example-api.invalid#",
  ])("rejects non-origin input %s without echoing it", (input) => {
    let message = "";
    try {
      parsePublicApiBaseUrl("local", input);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toMatch(/MINIPROGRAM_PUBLIC_API_BASE_URL/);
    expect(message).not.toContain(input);
    expect(message).not.toContain("synthetic-user");
    expect(message).not.toContain("synthetic-password");
  });
});

describe("Mini Program public configuration generation", () => {
  it("writes only the normalized public API URL", async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = join(directory, "config", "public-api.generated.ts");

    const syntheticInput = {
      targetEnvironment: "production",
      publicApiBaseUrl: "https://example-api.invalid/",
      outputPath,
      unknownField: "synthetic-unknown-value",
      MODEL_API_KEY: SECRET_SENTINEL,
    };

    await generatePublicConfig(syntheticInput);

    const output = await readFile(outputPath, "utf8");
    expect(output).toBe(
      createPublicConfigSource({ apiBaseUrl: "https://example-api.invalid" }),
    );
    expect(output).not.toContain("targetEnvironment");
    expect(output).not.toContain("APP_ENV");
    expect(output).not.toContain("CLOUDBASE_ENV_ID");
    expect(output).not.toContain("DATABASE_URL");
    expect(output).not.toContain("MODEL_API_BASE_URL");
    expect(output).not.toContain("MODEL_API_KEY");
    expect(output).not.toContain("unknownField");
    expect(output).not.toContain(SECRET_SENTINEL);
  });

  it("does not create an output when validation fails", async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = join(directory, "missing", "public-api.generated.ts");

    await expect(
      generatePublicConfig({
        targetEnvironment: "production",
        publicApiBaseUrl: "http://example-api.invalid",
        outputPath,
      }),
    ).rejects.toThrow(/require HTTPS/);
    await expect(readFile(outputPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("does not overwrite an existing output when validation fails", async () => {
    const directory = await createTemporaryDirectory();
    const outputPath = join(directory, "public-api.generated.ts");
    await writeFile(outputPath, "existing synthetic output\n", "utf8");

    await expect(
      generatePublicConfig({
        targetEnvironment: "local",
        publicApiBaseUrl: `https://${SECRET_SENTINEL}@example-api.invalid`,
        outputPath,
      }),
    ).rejects.toThrow(/userinfo/);
    await expect(readFile(outputPath, "utf8")).resolves.toBe(
      "existing synthetic output\n",
    );
  });

  it.each([
    "https://example-api.invalid/v1/..",
    "https://example-api.invalid/%2e",
  ])(
    "does not create or overwrite output for a raw non-root path %s",
    async (publicApiBaseUrl) => {
      const directory = await createTemporaryDirectory();
      const missingOutputPath = join(
        directory,
        "missing",
        "public-api.generated.ts",
      );
      const existingOutputPath = join(directory, "public-api.generated.ts");
      const existingOutput = "existing synthetic output\n";
      await writeFile(existingOutputPath, existingOutput, "utf8");

      await expect(
        generatePublicConfig({
          targetEnvironment: "production",
          publicApiBaseUrl,
          outputPath: missingOutputPath,
        }),
      ).rejects.toThrow(/no path/);
      await expect(readFile(missingOutputPath, "utf8")).rejects.toMatchObject({
        code: "ENOENT",
      });

      await expect(
        generatePublicConfig({
          targetEnvironment: "production",
          publicApiBaseUrl,
          outputPath: existingOutputPath,
        }),
      ).rejects.toThrow(/no path/);
      await expect(readFile(existingOutputPath, "utf8")).resolves.toBe(
        existingOutput,
      );
    },
  );
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "haohao-config-test-"));
  temporaryDirectories.push(directory);
  return directory;
}
