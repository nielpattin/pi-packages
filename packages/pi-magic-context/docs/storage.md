# Storage

Storage paths are defined by `core/shared/data-path.ts` and database setup is implemented in `core/features/magic-context/storage-db.ts`.

## Paths

Runtime storage directory:

```text
~/.pi/agent/pi-magic-context/
```

SQLite database:

```text
~/.pi/agent/pi-magic-context/context.db
```

Local embedding cache:

```text
~/.pi/agent/pi-magic-context/models/
```

Debug logs are not stored in this directory. See [Operations](./operations.md).

## SQLite setup

`openDatabase()` creates the storage directory and opens `context.db`.

`initializeDatabase()` sets per-connection pragmas:

```sql
PRAGMA foreign_keys=ON;
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
```

The database uses WAL mode, so `context.db-wal` and `context.db-shm` can exist beside `context.db`.

Migrations are run by `runMigrations()` from `core/features/magic-context/migrations.ts`.

## Main tables from schema setup

Created in `storage-db.ts`:

| Table                       | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `tags`                      | Tracks tagged session content and drop status. |
| `pending_ops`               | Queued drop/materialization operations.        |
| `source_contents`           | Original content backing tags.                 |
| `compartments`              | Compacted session ranges.                      |
| `compartment_state_lease`   | Lease for compartment state writes.            |
| `compression_depth`         | Compression depth per message ordinal.         |
| `session_facts`             | Short facts extracted for a session.           |
| `memories`                  | Project-scoped memories.                       |
| `memory_embeddings`         | Embedding vectors for memories.                |
| `dream_state`               | Dreamer state key/value storage.               |
| `dream_queue`               | Pending dreamer runs.                          |
| `dream_runs`                | Completed dreamer run records.                 |
| `session_meta`              | Per-session metadata and counters.             |
| `message_history_index`     | Indexed message history rows.                  |
| `recomp_compartments`       | Recompartmentalization staging data.           |
| `recomp_facts`              | Recompartmentalization fact staging data.      |
| `project_key_files`         | Project key-file selections.                   |
| `project_key_files_version` | Key-file version metadata.                     |
| `subagent_invocations`      | Subagent invocation audit records.             |

Virtual FTS tables:

| Table                 | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `memories_fts`        | Full-text search over memories.                |
| `message_history_fts` | Full-text search over indexed message history. |

## Tables added by migrations

`core/features/magic-context/migrations.ts` also creates or alters tables used by newer features:

| Table                          | Purpose                             |
| ------------------------------ | ----------------------------------- |
| `notes`                        | Unified session and smart notes.    |
| `plugin_messages`              | Internal plugin message queue.      |
| `user_memory_candidates`       | Candidate user memory observations. |
| `user_memories`                | Promoted user memories.             |
| `git_commits`                  | Indexed git commits.                |
| `git_commit_embeddings`        | Embedding vectors for git commits.  |
| `git_commits_fts`              | Full-text search over git commits.  |
| `tool_definition_measurements` | Tool definition token measurements. |
| `schema_migrations`            | Applied migration versions.         |

Migrations also add columns to existing tables such as `notes`, `tags`, and `session_meta`.

## Database handle behavior

`storage-db.ts` keeps database handles in a map keyed by database path. It also tracks persistence state in weak maps. The extension does not close the database handle on normal session shutdown because Pi reloads can reuse the extension module instance.

## Legacy storage migration

`migrateLegacyStorageIfNeeded()` copies legacy storage into the current storage directory only when the target database does not exist and a legacy database exists. It copies:

- `context.db`,
- `context.db-wal`,
- `context.db-shm`,
- `models/` when present.

The legacy files are left in place.

## Integrity check

`scripts/doctor.mjs` opens the database in read-only mode and runs:

```sql
PRAGMA integrity_check;
```

A result of `ok` is reported as a pass.
