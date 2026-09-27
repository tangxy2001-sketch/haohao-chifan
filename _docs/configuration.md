# Configuration and secret handling

This document defines the Issue #6 configuration contract. The API validates
configuration before it creates the Fastify application or starts listening.
CloudBase, PostgreSQL, and model configuration is validation-only until the
separate capability Issues wire those services; valid configuration does not
connect to any external service.

## Server contract

| Name                 | Ownership     | Format                                                                      | Required when                                                                                      |
| -------------------- | ------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `APP_ENV`            | server base   | `local`, `test`, `staging`, or `production`; defaults to `local`            | every API start                                                                                    |
| `HOST`               | server base   | non-empty host; defaults to `0.0.0.0`                                       | every API start                                                                                    |
| `PORT`               | server base   | decimal integer from 1 through 65535; defaults to `3000`                    | every API start                                                                                    |
| `CLOUDBASE_ENV_ID`   | server only   | non-empty after trimming                                                    | when any CloudBase group field is present; unconditionally when CloudBase is wired later           |
| `DATABASE_URL`       | server secret | absolute `postgres:` or `postgresql:` URL with a host and database path     | when any database group field is present; unconditionally when PostgreSQL is wired later           |
| `MODEL_API_BASE_URL` | server only   | absolute HTTP(S) URL without userinfo; staging and production require HTTPS | when either model group field is present; unconditionally when the model capability is wired later |
| `MODEL_API_KEY`      | server secret | non-empty, with its original validated value retained internally            | when either model group field is present; unconditionally when the model capability is wired later |

An empty string counts as a present value and fails validation. If every field
in an unconnected capability group is absent, the current API shell can start
and `/api/v1/health` remains independent of external services. Later capability
composition roots must call the exported required parser for their group before
listening; they must not use optional group detection to bypass required
configuration.

Only the configuration module reads the server environment. Future server
capabilities receive validated values from that module instead of reading
environment variables throughout the codebase. Safe errors name the invalid
field and expected format without including raw values, credentials, complete
configuration objects, or the complete process environment.

## Environment matrix

| Target     | Configuration source                                                                                      | Required groups                                          | URL rule                                        |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| local      | explicit process values, then `apps/api/.env.local` only through `start:local`, then code defaults        | base; any optional group that has a field present        | model and public API URLs may use HTTP or HTTPS |
| test       | each test supplies a minimal synthetic object or explicit child-process allowlist; no developer env files | base; groups under test                                  | model and public API URLs may use HTTP or HTTPS |
| staging    | deployment environment injection through ordinary `start`; no repository env file                         | base; each capability group once its capability is wired | model and public API URLs require HTTPS         |
| production | deployment environment injection through ordinary `start`; no repository env file                         | base; each capability group once its capability is wired | model and public API URLs require HTTPS         |

The ordinary API command is:

```sh
corepack pnpm --dir apps/api start
```

It never reads an env file automatically. For local development only, copy the
synthetic shape in `apps/api/.env.example` to the sole supported local filename,
`apps/api/.env.local`, replace values locally, and run:

```sh
corepack pnpm --dir apps/api start:local
```

That script runs from the `apps/api` workspace with Node 22 and uses
`--env-file-if-exists=.env.local`. Node gives values already present in the
launching process priority over the env file; code defaults apply last. Choosing
`APP_ENV=local` does not load a file, and changing `APP_ENV` does not change which
file the local-only command reads. Never use `start:local` for staging or
production. No dotenv package, plain `.env`, environment-specific layering, or
`APP_ENV`-derived filename is supported.

The staging and production entries above describe injection and validation
formats only. They do not create resources or authorize deployment.

## Mini Program public configuration

The only public client build input is
`MINIPROGRAM_PUBLIC_API_BASE_URL`. It must be an absolute HTTP(S) origin without
userinfo, a non-root path, query, fragment, or even an empty `?` or `#`
delimiter. Local and test accept HTTP or HTTPS; staging and production require
HTTPS. The explicit target environment controls validation only and is not
written to the output.

Before opening WeChat Developer Tools, run the generator from the repository
root with exactly the target and public origin:

```sh
corepack pnpm generate:miniprogram-config local http://localhost:3000
corepack pnpm generate:miniprogram-config production https://api.example.invalid
```

The command validates all input before writing
`apps/miniprogram/config/public-api.generated.ts`. That ignored local build input
contains only the normalized `apiBaseUrl`. It never receives the server
configuration object, unknown inputs, target environment, database URL, model
URL or key, or CloudBase environment ID. WeChat Developer Tools compiles the
Mini Program directory directly and does not supply Node environment variables
at runtime.

`apps/miniprogram/.env.public.example` documents the sole public input name; the
generator takes the corresponding value as an explicit command argument and
does not load the example as an env file.

## Repository protection

The Git ignore rules cover `.env`, `.env.*`, and the generated client config in
any intended location while explicitly allowing the two synthetic `*.example`
files. The automated test additionally examines Git-tracked paths, exact example
names and fake values, and Mini Program source inputs for server configuration
references or whole-environment reads.

Ignore rules reduce accidental commits. They cannot prevent a forced add and do
not detect every unknown secret format. The automated boundary proves the named
configuration contract, named sensitive paths, public client allowlist, and
their checked examples. Repository-wide secret scanning, rulesets, rotation,
and incident response require separate decisions.
