import { describe, expect, it } from "vitest";

import {
  parseBaseConfig,
  parseRequiredCloudBaseConfig,
  parseRequiredDatabaseConfig,
  parseRequiredModelConfig,
  parseStartupConfig,
  type AppEnvironment,
} from "../apps/api/src/config.ts";

const SECRET_SENTINEL = "SYNTHETIC_MODEL_SECRET_SENTINEL_6F2C";
const DATABASE_PASSWORD_SENTINEL = "SYNTHETIC_DATABASE_PASSWORD_9A1D";

describe("base server configuration", () => {
  it.each(["local", "test", "staging", "production"] as const)(
    "accepts APP_ENV=%s",
    (appEnv) => {
      expect(parseBaseConfig({ APP_ENV: appEnv }).appEnv).toBe(appEnv);
    },
  );

  it("uses the compatibility defaults", () => {
    expect(parseBaseConfig({})).toEqual({
      appEnv: "local",
      host: "0.0.0.0",
      port: 3000,
    });
  });

  it("accepts explicit HOST and PORT boundary values", () => {
    expect(parseBaseConfig({ HOST: "127.0.0.1", PORT: "1" })).toMatchObject({
      host: "127.0.0.1",
      port: 1,
    });
    expect(parseBaseConfig({ PORT: "65535" }).port).toBe(65_535);
  });

  it.each([
    [{ APP_ENV: "preview" }, /APP_ENV.*local, test, staging, or production/],
    [{ HOST: "  " }, /HOST.*non-empty/],
  ] as const)("rejects an invalid base value", (environment, message) => {
    expect(() => parseBaseConfig(environment)).toThrow(message);
  });

  it.each(["", "0", "65536", "1.5", "1e3", " 3000", "not-a-port"])(
    "rejects PORT=%j without echoing the value",
    (port) => {
      let message = "";
      try {
        parseBaseConfig({ PORT: port });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toMatch(/Invalid PORT.*integer from 1 to 65535/);
      if (port !== "") {
        expect(message).not.toContain(port);
      }
    },
  );
});

describe("server capability configuration", () => {
  it("trims and returns a required CloudBase environment ID", () => {
    expect(
      parseRequiredCloudBaseConfig({
        CLOUDBASE_ENV_ID: "  example-cloud.invalid  ",
      }),
    ).toEqual({ environmentId: "example-cloud.invalid" });
  });

  it.each([undefined, "", "   "])(
    "rejects a missing or blank CloudBase environment ID",
    (value) => {
      expect(() =>
        parseRequiredCloudBaseConfig({ CLOUDBASE_ENV_ID: value }),
      ).toThrow(/CLOUDBASE_ENV_ID/);
    },
  );

  it.each([
    "postgresql://example-host.invalid/example-database",
    "postgres://example-host.invalid/example-database",
  ])("accepts a PostgreSQL URL using %s", (url) => {
    expect(parseRequiredDatabaseConfig({ DATABASE_URL: url })).toEqual({ url });
  });

  it.each([
    undefined,
    "",
    "relative",
    "https://example.invalid/example-database",
    "postgresql:///example-database",
    "postgresql://example.invalid/",
  ])("rejects an invalid DATABASE_URL without exposing it", (value) => {
    const sensitiveValue =
      value ??
      `postgresql://example-user:${DATABASE_PASSWORD_SENTINEL}@example.invalid/`;
    let message = "";

    try {
      parseRequiredDatabaseConfig({ DATABASE_URL: sensitiveValue });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toMatch(/DATABASE_URL/);
    expect(message).not.toContain(DATABASE_PASSWORD_SENTINEL);
    if (sensitiveValue.length > 0) {
      expect(message).not.toContain(sensitiveValue);
    }
  });

  it.each(["local", "test"] as const)(
    "allows HTTP model URLs in %s",
    (appEnv) => {
      expect(
        parseRequiredModelConfig(
          {
            MODEL_API_BASE_URL: "http://example-model.invalid/v1",
            MODEL_API_KEY: SECRET_SENTINEL,
          },
          appEnv,
        ),
      ).toEqual({
        apiBaseUrl: "http://example-model.invalid/v1",
        apiKey: SECRET_SENTINEL,
      });
    },
  );

  it.each(["staging", "production"] as const)(
    "requires HTTPS model URLs in %s",
    (appEnv) => {
      expect(() =>
        parseRequiredModelConfig(
          {
            MODEL_API_BASE_URL: "http://example-model.invalid/v1",
            MODEL_API_KEY: SECRET_SENTINEL,
          },
          appEnv,
        ),
      ).toThrow(/MODEL_API_BASE_URL.*require HTTPS/);
      expect(
        parseRequiredModelConfig(
          {
            MODEL_API_BASE_URL: "https://example-model.invalid/v1",
            MODEL_API_KEY: SECRET_SENTINEL,
          },
          appEnv,
        ).apiKey,
      ).toBe(SECRET_SENTINEL);
    },
  );

  it.each(["", "   "])(
    "rejects a %j model key after accepting a valid model URL",
    (apiKey) => {
      expect(() =>
        parseRequiredModelConfig(
          {
            MODEL_API_BASE_URL: "https://example-model.invalid/v1",
            MODEL_API_KEY: apiKey,
          },
          "production",
        ),
      ).toThrow(/MODEL_API_KEY/);
    },
  );

  it.each([
    [{ MODEL_API_KEY: SECRET_SENTINEL }, "local"],
    [{ MODEL_API_BASE_URL: "https://example-model.invalid" }, "local"],
    [
      {
        MODEL_API_BASE_URL:
          "https://synthetic-user:synthetic-password@example-model.invalid",
        MODEL_API_KEY: SECRET_SENTINEL,
      },
      "local",
    ],
    [
      {
        MODEL_API_BASE_URL: "ftp://example-model.invalid",
        MODEL_API_KEY: SECRET_SENTINEL,
      },
      "local",
    ],
  ] as const)(
    "rejects incomplete or invalid model configuration without exposing secrets",
    (environment, appEnv) => {
      let message = "";
      try {
        parseRequiredModelConfig(environment, appEnv as AppEnvironment);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toMatch(/MODEL_API_/);
      expect(message).not.toContain(SECRET_SENTINEL);
      expect(message).not.toContain("synthetic-password");
      expect(message).not.toContain("synthetic-user");
    },
  );
});

describe("startup composition", () => {
  it("keeps the API shell usable when unconnected groups are absent", () => {
    expect(parseStartupConfig({})).toEqual({
      appEnv: "local",
      host: "0.0.0.0",
      port: 3000,
    });
  });

  it.each([
    ["CLOUDBASE_ENV_ID", ""],
    ["DATABASE_URL", ""],
    ["MODEL_API_BASE_URL", ""],
    ["MODEL_API_KEY", ""],
  ])("treats an empty %s as a present invalid group", (name, value) => {
    expect(() => parseStartupConfig({ [name]: value })).toThrow(
      name.startsWith("MODEL_") ? /MODEL_API_/ : name,
    );
  });

  it("validates and retains complete groups without external side effects", () => {
    const databaseUrl = `postgresql://example-user:${DATABASE_PASSWORD_SENTINEL}@example-db.invalid/example-database`;
    expect(
      parseStartupConfig({
        APP_ENV: "test",
        CLOUDBASE_ENV_ID: "example-cloud.invalid",
        DATABASE_URL: databaseUrl,
        MODEL_API_BASE_URL: "http://example-model.invalid/v1",
        MODEL_API_KEY: SECRET_SENTINEL,
      }),
    ).toEqual({
      appEnv: "test",
      host: "0.0.0.0",
      port: 3000,
      cloudBase: { environmentId: "example-cloud.invalid" },
      database: { url: databaseUrl },
      model: {
        apiBaseUrl: "http://example-model.invalid/v1",
        apiKey: SECRET_SENTINEL,
      },
    });
  });

  it("provides required parsers that fail when future wired groups are absent", () => {
    expect(() => parseRequiredCloudBaseConfig({})).toThrow(
      /Missing CLOUDBASE_ENV_ID/,
    );
    expect(() => parseRequiredDatabaseConfig({})).toThrow(
      /Missing DATABASE_URL/,
    );
    expect(() => parseRequiredModelConfig({}, "production")).toThrow(
      /Missing MODEL_API_BASE_URL/,
    );
  });
});
