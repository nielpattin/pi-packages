import * as os from "node:os";
import * as path from "node:path";
import { getHarness, type HarnessId } from "./harness";

export function getDataDir(): string {
   return process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share");
}

/**
 * Per-harness scratch directory under the OS temp dir.
 *
 * Pi uses this for logs and historian dumps that should not live inside a
 * project checkout.
 */
export function getMagicContextTempDir(harness: HarnessId = getHarness()): string {
   return path.join(os.tmpdir(), harness, "magic-context");
}

/** Standard log file path for this Pi package. */
export function getMagicContextLogPath(harness: HarnessId = getHarness()): string {
   return path.join(getMagicContextTempDir(harness), "magic-context.log");
}

/**
 * Directory used for both historian validation-failure dumps and the
 * existing-state offload XMLs that large historian/recomp passes write
 * before invoking the model. Per-harness so dumps from different
 * harnesses don't collide on filename and so `doctor --issue` for each
 * harness reports only its own historian artifacts.
 */
export function getMagicContextHistorianDir(harness: HarnessId = getHarness()): string {
   return path.join(getMagicContextTempDir(harness), "historian");
}

/**
 * Project-local magic-context artifact directory.
 *
 * Layout: `<project-directory>/.pi/magic-context/`
 */
export function getProjectMagicContextDir(directory: string): string {
   return path.join(directory, ".pi", "magic-context");
}

/** Project-local historian artifact directory. */
export function getProjectMagicContextHistorianDir(directory: string): string {
   return path.join(getProjectMagicContextDir(directory), "historian");
}

export function getHostStorageDir(): string {
   return path.join(getDataDir(), "host", "storage");
}

/** Resolve the local Pi Magic Context storage directory. */
export function getMagicContextStorageDir(): string {
   return path.join(os.homedir(), ".pi", "agent", "pi-magic-context");
}

/** Legacy helper retained for old migration code paths. */
export function getLegacyHostMagicContextStorageDir(): string {
   return path.join(getHostStorageDir(), "plugin", "magic-context");
}

/** Resolve the cache base directory. */
export function getCacheDir(): string {
   return process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache");
}

export function getHostCacheDir(): string {
   return path.join(getCacheDir(), "host");
}
