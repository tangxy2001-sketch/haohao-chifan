import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";

const SERVER_VARIABLE_NAMES = [
  "APP_ENV",
  "HOST",
  "PORT",
  "CLOUDBASE_ENV_ID",
  "DATABASE_URL",
  "MODEL_API_BASE_URL",
  "MODEL_API_KEY",
] as const;
const PUBLIC_VARIABLE_NAME = "MINIPROGRAM_PUBLIC_API_BASE_URL";
const GENERATED_CONFIG_PATH = "apps/miniprogram/config/public-api.generated.ts";
const EXPECTED_EXAMPLES: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "apps/api/.env.example": {
    APP_ENV: "local",
    HOST: "127.0.0.1",
    PORT: "3000",
    CLOUDBASE_ENV_ID: "example-cloudbase-environment.invalid",
    DATABASE_URL:
      "postgresql://example-user:example-not-a-real-password@example-database.invalid/example-database",
    MODEL_API_BASE_URL: "https://example-model-api.invalid/v1",
    MODEL_API_KEY: "example-not-a-real-secret",
  },
  "apps/miniprogram/.env.public.example": {
    [PUBLIC_VARIABLE_NAME]: "https://example-api.invalid",
  },
};
const MINI_PROGRAM_SOURCE_EXTENSIONS = new Set([
  ".js",
  ".json",
  ".ts",
  ".wxml",
  ".wxss",
]);

export function checkConfigBoundaries(repositoryRoot: string): void {
  const trackedPaths = listTrackedPaths(repositoryRoot);
  const failures: string[] = [];

  for (const path of trackedPaths) {
    const fileName = basename(path);
    const isEnvironmentFile =
      fileName === ".env" || fileName.startsWith(".env.");
    const isExample = fileName.endsWith(".example");

    if (isEnvironmentFile && !isExample) {
      failures.push(`tracked environment file is not an example: ${path}`);
    }

    if (path === GENERATED_CONFIG_PATH) {
      failures.push(`generated Mini Program configuration is tracked: ${path}`);
    }
  }

  const trackedExamples = trackedPaths.filter((path) =>
    basename(path).startsWith(".env"),
  );
  const expectedExamplePaths = Object.keys(EXPECTED_EXAMPLES);

  if (!sameMembers(trackedExamples, expectedExamplePaths)) {
    failures.push(
      "tracked environment examples do not match the approved server and client example paths",
    );
  }

  for (const path of expectedExamplePaths) {
    const actual = parseExample(resolve(repositoryRoot, path));
    if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_EXAMPLES[path])) {
      failures.push(
        `environment example has unexpected names or values: ${path}`,
      );
    }
  }

  for (const path of trackedPaths) {
    if (
      !path.startsWith("apps/miniprogram/") ||
      !MINI_PROGRAM_SOURCE_EXTENSIONS.has(extname(path))
    ) {
      continue;
    }

    const source = readFileSync(resolve(repositoryRoot, path), "utf8");
    if (
      SERVER_VARIABLE_NAMES.some((name) => source.includes(name)) ||
      /\bprocess\s*\.\s*env\b/.test(source)
    ) {
      failures.push(
        `Mini Program source crosses the server configuration boundary: ${path}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Configuration boundary check failed:\n- ${failures.join("\n- ")}`,
    );
  }
}

function listTrackedPaths(repositoryRoot: string): string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter((path) => path.length > 0)
    .sort();
}

function parseExample(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (line.length === 0) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      return { __invalid_line__: line };
    }
    result[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return result;
}

function sameMembers(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}
