# Operations

Operational checks live in `scripts/` and package scripts in `package.json`.

## Package scripts

From `package.json`:

```bash
pnpm typecheck
pnpm doctor
pnpm smoke
pnpm test
pnpm check
```

Script behavior:

| Script      | Command                         |
| ----------- | ------------------------------- |
| `typecheck` | `tsc --noEmit`                  |
| `doctor`    | `node scripts/doctor.mjs`       |
| `smoke`     | `node scripts/smoke.mjs`        |
| `test`      | `pnpm smoke`                    |
| `check`     | `pnpm typecheck && pnpm doctor` |

From the packages repo root:

```bash
pnpm --dir packages/pi-magic-context check
pnpm --dir packages/pi-magic-context smoke
```

## Doctor

Source: `scripts/doctor.mjs`

Doctor checks runtime health. It reports pass, warn, and fail lines, then exits nonzero if any fail exists.

Checks include:

- Pi extension registration in `~/.pi/agent/settings.json`,
- Magic Context config parse status,
- embedding provider mode,
- local embedding model name when provider is `local`,
- `@huggingface/transformers` availability when provider is `local`,
- embedding model cache writability,
- local Xenova model cache presence,
- SQLite integrity when `context.db` exists.

Run:

```bash
pnpm --dir packages/pi-magic-context doctor
```

## Embedding prewarm

Doctor does not download/load the local embedding model unless `--prewarm-embedding` is passed.

Run:

```bash
pnpm --dir packages/pi-magic-context doctor -- --prewarm-embedding
```

With the flag, doctor imports `@huggingface/transformers`, sets `transformers.env.cacheDir` to the local model cache, creates a feature-extraction pipeline, and runs a probe string.

## Smoke

Source: `scripts/smoke.mjs`

Smoke runs:

```text
pi list
```

It fails when:

- `pi list` exits nonzero,
- output contains extension loading or package resolution errors,
- output does not include the package root path.

It prints:

```text
PASS Pi smoke: Magic Context package is registered with no package resolution errors
```

when registration looks healthy.

## Storage paths

Runtime storage:

```text
~/.pi/agent/pi-magic-context/
```

SQLite database:

```text
~/.pi/agent/pi-magic-context/context.db
```

Embedding model cache:

```text
~/.pi/agent/pi-magic-context/models/
```

## Log paths

Logging uses `core/shared/logger.ts`.

Debug log:

```text
%TEMP%/pi/magic-context/magic-context.log
```

In Git Bash:

```bash
tail -n 200 "$TMPDIR/pi/magic-context/magic-context.log"
```

Historian debug/offload directory:

```text
%TEMP%/pi/magic-context/historian/
```

## Status profiling

`src/dialogs/status-dialog.ts` logs status overlay timings only when this environment variable is set:

```text
PI_MAGIC_CONTEXT_PROFILE_STATUS=1
```

Without that variable, status overlay profiling lines are not emitted.

## Config paths checked by runtime

Runtime config paths:

```text
<project>/.pi/magic-context.jsonc
<project>/.pi/magic-context.json
~/.pi/agent/magic-context.jsonc
~/.pi/agent/magic-context.json
```

Project config overrides user config.

## Common command sequence

```bash
pnpm --dir packages/pi-magic-context typecheck
pnpm --dir packages/pi-magic-context doctor
pnpm --dir packages/pi-magic-context smoke
```
