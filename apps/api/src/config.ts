export const APP_ENVIRONMENTS = [
  "local",
  "test",
  "staging",
  "production",
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
export type ConfigurationSource = Readonly<Record<string, string | undefined>>;

export interface BaseConfig {
  appEnv: AppEnvironment;
  host: string;
  port: number;
}

export interface CloudBaseConfig {
  environmentId: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface ModelConfig {
  apiBaseUrl: string;
  apiKey: string;
}

export interface StartupConfig extends BaseConfig {
  cloudBase?: CloudBaseConfig;
  database?: DatabaseConfig;
  model?: ModelConfig;
}

const DEFAULT_APP_ENV: AppEnvironment = "local";
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const MIN_PORT = 1;
const MAX_PORT = 65_535;

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function parseStartupConfig(
  environment: ConfigurationSource,
): StartupConfig {
  const base = parseBaseConfig(environment);

  return {
    ...base,
    ...(isPresent(environment, ["CLOUDBASE_ENV_ID"])
      ? { cloudBase: parseRequiredCloudBaseConfig(environment) }
      : {}),
    ...(isPresent(environment, ["DATABASE_URL"])
      ? { database: parseRequiredDatabaseConfig(environment) }
      : {}),
    ...(isPresent(environment, ["MODEL_API_BASE_URL", "MODEL_API_KEY"])
      ? { model: parseRequiredModelConfig(environment, base.appEnv) }
      : {}),
  };
}

export function parseBaseConfig(environment: ConfigurationSource): BaseConfig {
  return {
    appEnv: parseAppEnvironment(environment.APP_ENV),
    host: parseHost(environment.HOST),
    port: parsePort(environment.PORT),
  };
}

export function parseRequiredCloudBaseConfig(
  environment: ConfigurationSource,
): CloudBaseConfig {
  const environmentId = requireNonBlank(
    environment.CLOUDBASE_ENV_ID,
    "CLOUDBASE_ENV_ID",
  );

  return { environmentId: environmentId.trim() };
}

export function parseRequiredDatabaseConfig(
  environment: ConfigurationSource,
): DatabaseConfig {
  const value = requireNonBlank(environment.DATABASE_URL, "DATABASE_URL");
  const url = parseAbsoluteUrl(value, "DATABASE_URL");

  if (
    (url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
    url.hostname.length === 0 ||
    url.pathname === "/" ||
    url.pathname.length === 0
  ) {
    throw new ConfigurationError(
      "Invalid DATABASE_URL: expected an absolute postgres: or postgresql: URL with a host and database path.",
    );
  }

  return { url: value };
}

export function parseRequiredModelConfig(
  environment: ConfigurationSource,
  appEnv: AppEnvironment,
): ModelConfig {
  const apiBaseUrl = requireNonBlank(
    environment.MODEL_API_BASE_URL,
    "MODEL_API_BASE_URL",
  );
  const apiKey = requireNonBlank(environment.MODEL_API_KEY, "MODEL_API_KEY");
  const url = parseAbsoluteUrl(apiBaseUrl, "MODEL_API_BASE_URL");

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ConfigurationError(
      "Invalid MODEL_API_BASE_URL: expected an absolute HTTP(S) URL.",
    );
  }

  if (url.username.length > 0 || url.password.length > 0) {
    throw new ConfigurationError(
      "Invalid MODEL_API_BASE_URL: URL userinfo is not allowed.",
    );
  }

  if (
    (appEnv === "staging" || appEnv === "production") &&
    url.protocol !== "https:"
  ) {
    throw new ConfigurationError(
      "Invalid MODEL_API_BASE_URL: staging and production require HTTPS.",
    );
  }

  return { apiBaseUrl, apiKey };
}

function isPresent(
  environment: ConfigurationSource,
  names: readonly string[],
): boolean {
  return names.some((name) => environment[name] !== undefined);
}

function parseAppEnvironment(value: string | undefined): AppEnvironment {
  if (value === undefined) {
    return DEFAULT_APP_ENV;
  }

  if (!APP_ENVIRONMENTS.some((candidate) => candidate === value)) {
    throw new ConfigurationError(
      "Invalid APP_ENV: expected local, test, staging, or production.",
    );
  }

  return value as AppEnvironment;
}

function parseHost(value: string | undefined): string {
  if (value === undefined) {
    return DEFAULT_HOST;
  }

  if (value.trim().length === 0) {
    throw new ConfigurationError("Invalid HOST: expected a non-empty host.");
  }

  return value;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(value)) {
    throw invalidPort();
  }

  const port = Number(value);

  if (!Number.isSafeInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw invalidPort();
  }

  return port;
}

function invalidPort(): ConfigurationError {
  return new ConfigurationError(
    `Invalid PORT: expected an integer from ${MIN_PORT} to ${MAX_PORT}.`,
  );
}

function requireNonBlank(value: string | undefined, name: string): string {
  if (value === undefined) {
    throw new ConfigurationError(`Missing ${name}: a value is required.`);
  }

  if (value.trim().length === 0) {
    throw new ConfigurationError(
      `Invalid ${name}: expected a non-empty value.`,
    );
  }

  return value;
}

function parseAbsoluteUrl(value: string, name: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new ConfigurationError(`Invalid ${name}: expected an absolute URL.`);
  }
}
