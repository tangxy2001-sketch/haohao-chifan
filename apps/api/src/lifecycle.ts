import type { FastifyInstance } from "fastify";

export type ShutdownSignal = "SIGINT" | "SIGTERM";

export interface ShutdownDependencies {
  reportError(error: unknown): void;
  setExitCode(code: number): void;
}

export type Shutdown = (signal: ShutdownSignal) => Promise<void>;

export function createShutdown(
  app: FastifyInstance,
  dependencies: ShutdownDependencies,
): Shutdown {
  let shutdownPromise: Promise<void> | undefined;

  return (_signal) => {
    shutdownPromise ??= closeApp(app, dependencies);
    return shutdownPromise;
  };
}

async function closeApp(
  app: FastifyInstance,
  dependencies: ShutdownDependencies,
): Promise<void> {
  try {
    await app.close();
    dependencies.setExitCode(0);
  } catch (error) {
    dependencies.reportError(error);
    dependencies.setExitCode(1);
  }
}

export function registerShutdownSignals(
  shutdown: Shutdown,
  processLike: Pick<NodeJS.Process, "once" | "removeListener"> = process,
): () => void {
  const onSigint = (): void => {
    void shutdown("SIGINT");
  };
  const onSigterm = (): void => {
    void shutdown("SIGTERM");
  };

  processLike.once("SIGINT", onSigint);
  processLike.once("SIGTERM", onSigterm);

  return () => {
    processLike.removeListener("SIGINT", onSigint);
    processLike.removeListener("SIGTERM", onSigterm);
  };
}
