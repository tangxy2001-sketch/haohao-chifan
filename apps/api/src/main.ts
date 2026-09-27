import { pathToFileURL } from "node:url";

import type { FastifyInstance } from "fastify";

import { createApp } from "./app.ts";
import { ConfigurationError, parseStartupConfig } from "./config.ts";
import { createShutdown, registerShutdownSignals } from "./lifecycle.ts";

export interface ApiProcessOptions {
  createApplication?: () => FastifyInstance;
  environment?: NodeJS.ProcessEnv;
  processLike?: NodeJS.Process;
}

export async function runApiProcess(
  options: ApiProcessOptions = {},
): Promise<FastifyInstance> {
  const processLike = options.processLike ?? process;
  const config = parseStartupConfig(options.environment ?? processLike.env);
  const app = options.createApplication?.() ?? createApp();

  await app.listen({ host: config.host, port: config.port });

  const shutdown = createShutdown(app, {
    reportError: () => console.error("API shutdown failed."),
    setExitCode: (code) => {
      processLike.exitCode = code;
    },
  });

  registerShutdownSignals(shutdown, processLike);
  return app;
}

function isMainModule(): boolean {
  const entryPath = process.argv[1];
  return (
    entryPath !== undefined && pathToFileURL(entryPath).href === import.meta.url
  );
}

if (isMainModule()) {
  try {
    await runApiProcess();
  } catch (error) {
    console.error("API startup failed.", formatStartupError(error));
    process.exitCode = 1;
  }
}

export function formatStartupError(error: unknown): string {
  if (error instanceof ConfigurationError) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return `Startup operation failed (${error.code}).`;
  }

  return "Unexpected startup error.";
}
