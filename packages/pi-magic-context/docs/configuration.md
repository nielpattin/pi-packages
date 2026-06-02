# Configuration

Configuration is loaded by `src/config/index.ts` and validated by `core/config/schema/magic-context.ts`.

## Config file locations

The loader checks these files:

1. `<project>/.pi/magic-context.jsonc`
2. `<project>/.pi/magic-context.json`
3. `~/.pi/agent/magic-context.jsonc`
4. `~/.pi/agent/magic-context.json`

User config and project config are merged. User config loads first. Project config overrides matching user config keys.

## Merge and recovery behavior

`loadPiConfig()`:

- reads JSONC or JSON files,
- substitutes config variables before parsing,
- deep-merges user and project config,
- validates the merged config with the shared Zod schema,
- falls back to defaults for invalid top-level keys when recovery is possible,
- returns warnings instead of throwing.

`loadPiConfigDetailed()` returns the same config plus load outcomes, substitution failures, and recovered top-level keys for diagnostics.

## Minimal config

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

## Top-level sections

| Key                            | Purpose                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `enabled`                      | Enables or disables the extension registration. Defaults to `true`.                                  |
| `ctx_reduce_enabled`           | Registers `ctx_reduce`, tag prefixes, and prompt guidance when `true`. Defaults to `true`.           |
| `historian`                    | Historian subagent configuration. Optional.                                                          |
| `dreamer`                      | Scheduled dreamer configuration. Optional.                                                           |
| `cache_ttl`                    | Cache TTL string or per-model TTL map. Defaults to `5m`.                                             |
| `nudge_interval_tokens`        | Token growth interval for rolling nudges. Defaults to `10000`.                                       |
| `execute_threshold_percentage` | Context percentage that forces queued work to execute. Defaults to `65`.                             |
| `execute_threshold_tokens`     | Optional absolute token threshold per model. Overrides percentage where matched.                     |
| `protected_tags`               | Number of newest tags protected from dropping. Defaults through `DEFAULT_PROTECTED_TAGS`.            |
| `auto_drop_tool_age`           | Age threshold for dropping old tool outputs during cleanup. Defaults to `100`.                       |
| `drop_tool_structure`          | Controls whether dropped tool parts are fully removed. Defaults to `true`.                           |
| `clear_reasoning_age`          | Age threshold for clearing reasoning blocks. Defaults to `50`.                                       |
| `iteration_nudge_threshold`    | Consecutive assistant-message threshold for iteration nudges. Defaults to `15`.                      |
| `history_budget_percentage`    | Fraction of usable context reserved for injected history. Defaults to `0.15`.                        |
| `historian_timeout_ms`         | Historian prompt timeout. Defaults to `300000`.                                                      |
| `commit_cluster_trigger`       | Historian trigger based on commit clusters. Defaults enabled.                                        |
| `system_prompt_injection`      | Controls Magic Context system prompt blocks and skip signatures.                                     |
| `compressor`                   | Controls background compression of older compartments.                                               |
| `embedding`                    | Local, OpenAI-compatible, or off embedding provider.                                                 |
| `experimental`                 | Optional features such as temporal awareness, git commit indexing, auto-search, caveman compression. |
| `memory`                       | Cross-session memory behavior and injection budget.                                                  |
| `sidekick`                     | `/ctx-aug` sidekick agent configuration. Optional.                                                   |

## Embedding config

Supported providers:

```jsonc
{
   "embedding": {
      "provider": "local",
      "model": "Xenova/all-MiniLM-L6-v2",
   },
}
```

```jsonc
{
   "embedding": {
      "provider": "openai-compatible",
      "endpoint": "https://example.test/v1/embeddings",
      "model": "text-embedding-model",
      "api_key": "${env.EMBEDDING_API_KEY}",
   },
}
```

```jsonc
{
   "embedding": {
      "provider": "off",
   },
}
```

For the local provider, the model defaults to `Xenova/all-MiniLM-L6-v2`.

## Dreamer config

`dreamer` extends the shared agent override schema and adds:

- `schedule`, default `02:00-06:00`
- `max_runtime_minutes`, default `120`
- `tasks`, default `consolidate`, `verify`, `archive-stale`, `improve`
- `task_timeout_minutes`, default `20`
- `inject_docs`, default `true`
- `user_memories.enabled`, default `true`
- `user_memories.promotion_threshold`, default `3`
- `pin_key_files.enabled`, default `false`
- `pin_key_files.token_budget`, default `10000`
- `pin_key_files.min_reads`, default `4`
- `thinking_level`, optional Pi thinking level

Valid dreamer tasks are:

```text
consolidate
verify
archive-stale
improve
maintain-docs
```

## Historian config

`historian` extends the shared agent override schema and adds:

- `two_pass`, default `false`
- `thinking_level`, optional Pi thinking level

The extension registers historian triggers only when historian config resolves to a runnable model configuration.

## Sidekick config

`sidekick` controls `/ctx-aug` and supports:

- `timeout_ms`, default `30000`
- `system_prompt`, optional override
- `thinking_level`, optional Pi thinking level
- shared agent override fields such as model and fallbacks

## Experimental config

| Key                                  | Purpose                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `temporal_awareness`                 | Injects wall-clock gap markers and compartment date ranges. Defaults to `false`.           |
| `git_commit_indexing.enabled`        | Indexes git commit messages for `ctx_search`. Defaults to `false`.                         |
| `git_commit_indexing.since_days`     | Days of commit history to index. Defaults to `365`.                                        |
| `git_commit_indexing.max_commits`    | Max commits stored per project. Defaults to `2000`.                                        |
| `auto_search.enabled`                | Adds compact hints when search finds related context. Defaults to `false`.                 |
| `auto_search.score_threshold`        | Minimum top-hit score. Defaults to `0.6`.                                                  |
| `auto_search.min_prompt_chars`       | Minimum user prompt length. Defaults to `20`.                                              |
| `caveman_text_compression.enabled`   | Enables age-tier text compression when `ctx_reduce_enabled` is false. Defaults to `false`. |
| `caveman_text_compression.min_chars` | Minimum text-part length for compression. Defaults to `500`.                               |

## System prompt injection

`system_prompt_injection.enabled` controls whether Magic Context adds its guidance and adjunct blocks to the system prompt.

`system_prompt_injection.skip_signatures` is a list of substrings. If an agent system prompt contains one of them, Magic Context skips injection for that call. The default skip signature is:

```text
<!-- magic-context: skip -->
```
