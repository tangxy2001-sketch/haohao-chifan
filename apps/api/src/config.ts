export interface StartupConfig {
  host: string;
  port: number;
}

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const MIN_PORT = 1;
const MAX_PORT = 65_535;

export function parseStartupConfig(
  environment: NodeJS.ProcessEnv,
): StartupConfig {
  return {
    host: environment.HOST ?? DEFAULT_HOST,
    port: parsePort(environment.PORT),
  };
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(
      `Invalid PORT "${value}": expected an integer from ${MIN_PORT} to ${MAX_PORT}.`,
    );
  }

  const port = Number(value);

  if (!Number.isSafeInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(
      `Invalid PORT "${value}": expected an integer from ${MIN_PORT} to ${MAX_PORT}.`,
    );
  }

  return port;
}
