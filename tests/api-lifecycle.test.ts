import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { createApp } from "../apps/api/src/app.ts";
import { parseStartupConfig } from "../apps/api/src/config.ts";
import { createShutdown } from "../apps/api/src/lifecycle.ts";

const fixturePath = fileURLToPath(
  new URL("./fixtures/api-process.fixture.ts", import.meta.url),
);
const entryPath = fileURLToPath(
  new URL("../apps/api/src/main.ts", import.meta.url),
);

describe("API startup configuration", () => {
  it("uses the specified defaults", () => {
    expect(parseStartupConfig({})).toEqual({
      host: "0.0.0.0",
      port: 3000,
    });
  });

  it("accepts an explicit host and valid integer port", () => {
    expect(parseStartupConfig({ HOST: "127.0.0.1", PORT: "65535" })).toEqual({
      host: "127.0.0.1",
      port: 65_535,
    });
  });

  it.each(["", "0", "65536", "1.5", "1e3", " 3000", "port"])(
    "rejects invalid PORT %j before creating an application",
    (port) => {
      expect(() => parseStartupConfig({ PORT: port })).toThrow(
        /Invalid PORT.*integer from 1 to 65535/,
      );
    },
  );
});

describe("API shutdown", () => {
  it("runs once and awaits registered close hooks", async () => {
    const app = createApp();
    const events: string[] = [];
    const setExitCode = vi.fn();

    app.addHook("onClose", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      events.push("hook-complete");
    });

    const shutdown = createShutdown(app, {
      reportError: vi.fn(),
      setExitCode,
    });

    const first = shutdown("SIGINT");
    const second = shutdown("SIGTERM");

    expect(first).toBe(second);
    await first;
    expect(events).toEqual(["hook-complete"]);
    expect(setExitCode).toHaveBeenCalledOnce();
    expect(setExitCode).toHaveBeenCalledWith(0);
  });

  it("reports close failures and selects a nonzero exit status", async () => {
    const failure = new Error("close hook failed");
    const app = createApp();
    const reportError = vi.fn();
    const setExitCode = vi.fn();

    app.addHook("onClose", async () => {
      throw failure;
    });

    await createShutdown(app, { reportError, setExitCode })("SIGTERM");

    expect(reportError).toHaveBeenCalledWith(failure);
    expect(setExitCode).toHaveBeenCalledWith(1);
  });
});

describe("API process entry", () => {
  it("serves real HTTP and exits after awaiting a close hook", async () => {
    const port = await getAvailablePort();
    const child = spawn(
      process.execPath,
      ["--no-warnings", "--experimental-strip-types", fixturePath],
      {
        env: {
          ...process.env,
          HOST: "127.0.0.1",
          PORT: String(port),
        },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      },
    );
    const output = captureOutput(child);

    try {
      const response = await waitForHealth(port, child);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch(
        /^application\/json\b/,
      );
      expect(await response.json()).toEqual({ status: "ok" });

      child.kill("SIGTERM");

      await expect(waitForMessage(child, 5_000)).resolves.toBe(
        "close-hook-complete",
      );
      await expect(waitForExit(child, 5_000)).resolves.toEqual({
        code: 0,
        signal: null,
      });
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await waitForExit(child, 1_000).catch(() => undefined);
      }
    }

    expect(output()).toBe("");
  });

  it("fails with a nonzero status for an invalid explicit port", async () => {
    const child = spawn(
      process.execPath,
      ["--no-warnings", "--experimental-strip-types", entryPath],
      {
        env: { ...process.env, PORT: "not-a-port" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const output = captureOutput(child);

    await expect(waitForExit(child, 5_000)).resolves.toEqual({
      code: 1,
      signal: null,
    });
    expect(output()).toMatch(/API startup failed\./);
    expect(output()).toMatch(/Invalid PORT.*integer from 1 to 65535/);
  });

  it("fails with a nonzero status when the listener cannot start", async () => {
    const blocker = createServer();
    const port = await listenOnAvailablePort(blocker);
    const child = spawn(
      process.execPath,
      ["--no-warnings", "--experimental-strip-types", entryPath],
      {
        env: {
          ...process.env,
          HOST: "127.0.0.1",
          PORT: String(port),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const output = captureOutput(child);

    try {
      await expect(waitForExit(child, 5_000)).resolves.toEqual({
        code: 1,
        signal: null,
      });
    } finally {
      await closeServer(blocker);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }

    expect(output()).toMatch(/API startup failed\./);
    expect(output()).toMatch(/EADDRINUSE/);
  });
});

async function getAvailablePort(): Promise<number> {
  const server = createServer();
  const port = await listenOnAvailablePort(server);
  await closeServer(server);
  return port;
}

async function listenOnAvailablePort(
  server: ReturnType<typeof createServer>,
): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Unable to allocate a local test port.");
  }

  return address.port;
}

async function closeServer(
  server: ReturnType<typeof createServer>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

async function waitForHealth(
  port: number,
  child: ChildProcess,
): Promise<Response> {
  const deadline = Date.now() + 5_000;
  const url = `http://127.0.0.1:${port}/api/v1/health`;

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("API child process exited before becoming ready.");
    }

    try {
      return await fetch(url);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  throw new Error("Timed out waiting for the API child process.");
}

function waitForMessage(
  child: ChildProcess,
  timeoutMs: number,
): Promise<unknown> {
  return withTimeout(
    new Promise((resolve, reject) => {
      child.once("message", resolve);
      child.once("error", reject);
      child.once("exit", () =>
        reject(
          new Error("API child process exited before reporting close hook."),
        ),
      );
    }),
    timeoutMs,
    "Timed out waiting for the API close hook.",
  );
}

function waitForExit(
  child: ChildProcess,
  timeoutMs: number,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({
      code: child.exitCode,
      signal: child.signalCode,
    });
  }

  return withTimeout(
    new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    }),
    timeoutMs,
    "Timed out waiting for the API child process to exit.",
  );
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function captureOutput(child: ChildProcess): () => string {
  const chunks: Buffer[] = [];
  child.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => chunks.push(chunk));
  return () => Buffer.concat(chunks).toString("utf8");
}
