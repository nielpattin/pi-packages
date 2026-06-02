# Pi Magic Context Configuration

This package reads Magic Context config from:

1. `<project>/.pi/magic-context.jsonc`
2. `~/.pi/agent/magic-context.jsonc`

Project config overrides user config. Invalid fields fall back to defaults where the runtime schema allows it.

Minimal local config:

```jsonc
{
   "$schema": "./assets/magic-context.schema.json",
   "enabled": true,
   "embedding": {
      "provider": "local",
      "model": "Xenova/all-MiniLM-L6-v2",
   },
}
```

Useful checks:

```bash
pnpm --dir packages/pi-magic-context doctor
pnpm --dir packages/pi-magic-context smoke
```

Storage is the local Magic Context SQLite DB at `~/.pi/agent/pi-magic-context/context.db`.

Local embedding model cache: `~/.pi/agent/pi-magic-context/models`.

Doctor checks the local embedding provider, expected Xenova model name, Transformers dependency, cache directory writability, and whether model files are already cached. It does not download the model unless you run:

```bash
pnpm --dir packages/pi-magic-context doctor -- --prewarm-embedding
```
