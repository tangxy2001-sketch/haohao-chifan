import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PUBLIC_API_TARGET_ENVIRONMENTS = [
  "local",
  "test",
  "staging",
  "production",
] as const;

export type PublicApiTargetEnvironment =
  (typeof PUBLIC_API_TARGET_ENVIRONMENTS)[number];

export interface PublicMiniProgramConfig {
  apiBaseUrl: string;
}

export interface GeneratePublicConfigOptions {
  targetEnvironment: string;
  publicApiBaseUrl: string;
  outputPath: string;
}

const generatedConfigPath = fileURLToPath(
  new URL(
    "../apps/miniprogram/config/public-api.generated.ts",
    import.meta.url,
  ),
);

export function parsePublicApiBaseUrl(
  targetEnvironment: string,
  input: string,
): string {
  const environment = parseTargetEnvironment(targetEnvironment);
  const value = input.trim();

  if (value.includes("?") || value.includes("#")) {
    throw new Error(
      "Invalid MINIPROGRAM_PUBLIC_API_BASE_URL: query and fragment delimiters are not allowed.",
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Invalid MINIPROGRAM_PUBLIC_API_BASE_URL: expected an absolute HTTP(S) origin.",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      "Invalid MINIPROGRAM_PUBLIC_API_BASE_URL: expected an HTTP(S) origin.",
    );
  }

  if (url.username.length > 0 || url.password.length > 0) {
    throw new Error(
      "Invalid MINIPROGRAM_PUBLIC_API_BASE_URL: URL userinfo is not allowed.",
    );
  }

  if (url.pathname !== "/" || url.search.length > 0 || url.hash.length > 0) {
    throw new Error(
      "Invalid MINIPROGRAM_PUBLIC_API_BASE_URL: only an origin with no path, query, or fragment is allowed.",
    );
  }

  if (
    (environment === "staging" || environment === "production") &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Invalid MINIPROGRAM_PUBLIC_API_BASE_URL: staging and production require HTTPS.",
    );
  }

  return url.origin;
}

export function createPublicConfigSource(
  config: PublicMiniProgramConfig,
): string {
  return [
    "// Generated locally. Do not edit or commit this file.",
    `export const publicConfig = Object.freeze(${JSON.stringify(config)});`,
    "",
  ].join("\n");
}

export async function generatePublicConfig(
  options: GeneratePublicConfigOptions,
): Promise<void> {
  const apiBaseUrl = parsePublicApiBaseUrl(
    options.targetEnvironment,
    options.publicApiBaseUrl,
  );
  const source = createPublicConfigSource({ apiBaseUrl });

  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, source, "utf8");
}

function parseTargetEnvironment(value: string): PublicApiTargetEnvironment {
  if (
    !PUBLIC_API_TARGET_ENVIRONMENTS.some((candidate) => candidate === value)
  ) {
    throw new Error(
      "Invalid target environment: expected local, test, staging, or production.",
    );
  }

  return value as PublicApiTargetEnvironment;
}

function isMainModule(): boolean {
  const entryPath = process.argv[1];
  return (
    entryPath !== undefined &&
    pathToFileURL(resolve(entryPath)).href === import.meta.url
  );
}

if (isMainModule()) {
  const [targetEnvironment, publicApiBaseUrl, extraArgument] =
    process.argv.slice(2);

  if (
    targetEnvironment === undefined ||
    publicApiBaseUrl === undefined ||
    extraArgument !== undefined
  ) {
    console.error(
      "Usage: pnpm generate:miniprogram-config <local|test|staging|production> <public-api-origin>",
    );
    process.exitCode = 1;
  } else {
    try {
      await generatePublicConfig({
        targetEnvironment,
        publicApiBaseUrl,
        outputPath: generatedConfigPath,
      });
      console.log("Generated apps/miniprogram/config/public-api.generated.ts.");
    } catch (error) {
      console.error(
        error instanceof Error
          ? error.message
          : "Mini Program public configuration generation failed.",
      );
      process.exitCode = 1;
    }
  }
}
