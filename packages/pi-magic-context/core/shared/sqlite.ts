import DatabaseImpl from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";

/**
 * Pi-only SQLite chokepoint.
 *
 * The local package runs under Pi's Node runtime, so it uses better-sqlite3
 * directly. Upstream Host/Bun/Electron backend selection was removed when
 * this package was flattened into @nielpattin/pi-magic-context.
 */
export const Database: typeof BetterSqlite3 = DatabaseImpl;

/** Instance type alias used by helpers and storage modules. */
export type Database = BetterSqlite3.Database;

/** Statement instance type used for WeakMap caches throughout the codebase. */
export type Statement = BetterSqlite3.Statement<unknown[]>;
