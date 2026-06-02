# @nielpattin/pi-magic-context

Local Pi-only Magic Context package for Niel's Pi packages workspace.

This is a flattened package. The Pi adapter lives in `src/`; the shared runtime it needs lives in `core/`; imports use `#core/*`. There is no nested workspace, CLI package, dashboard package, Host package, or upstream install flow.

## Package layout

```text
src/      Pi extension entry, commands, tools, context handler, subagent runner
core/     Shared Magic Context runtime used by the Pi adapter
assets/   Local JSON schema copy
scripts/  Local doctor and smoke checks
```

## Pi registration

`~/.pi/agent/settings.json` should point at this package root:

```jsonc
{
   "source": "C:\Users\niel\.pi\agent\packages\packages\pi-magic-context",
}
```

## Run locally

From the packages repo root (`~/.pi/agent/packages`):

```bash
pnpm install
pnpm --dir packages/pi-magic-context doctor -- --prewarm-embedding
pnpm --dir packages/pi-magic-context smoke
pi -p "/ctx-status"
```

Expected result: `doctor` validates runtime health, `smoke` confirms Pi registration without hanging, and `/ctx-status` returns Magic Context status without package resolution errors.

## Checks

```bash
pnpm --dir packages/pi-magic-context typecheck
pnpm --dir packages/pi-magic-context doctor
pnpm --dir packages/pi-magic-context smoke
```

`doctor` validates the active Pi extension entry, Pi settings registration, config parsing, local embedding setup, Transformers availability, the Xenova model cache path, and SQLite integrity.

For the local embedded model, config should resolve to:

```jsonc
"embedding": {
  "provider": "local",
  "model": "Xenova/all-MiniLM-L6-v2"
}
```

Doctor checks the cache directory at `~/.pi/agent/pi-magic-context/models`. By default it does not download the model. To force a model download and load test:

```bash
pnpm --dir packages/pi-magic-context doctor -- --prewarm-embedding
```

`smoke` checks `pi list` for this package root and fails on package registration or resolution errors.

## Debug logs

Runtime storage (DB, model cache):

```text
~/.pi/agent/pi-magic-context/
```

Debug logs are written to the OS temp directory, not the storage directory:

```text
%TEMP%/pi/magic-context/magic-context.log
```

In Git Bash:

```bash
$TMPDIR/pi/magic-context/magic-context.log
```

Historian debug/offload files also use temp:

```text
%TEMP%/pi/magic-context/historian/
```

To inspect recent extension activity:

```bash
tail -n 200 "$TMPDIR/pi/magic-context/magic-context.log"
```
