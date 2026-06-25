import { existsSync } from "fs";
import type { Source, ReferenceInfo } from "./types.js";
import { readReferences } from "./config.js";
import { ensureRepo } from "./git-cache.js";

/**
 * Resolve all references for the given cwd.
 * Reads settings, parses entries, and creates ReferenceInfo objects.
 * For git references, the cache path is available immediately;
 * the clone/fetch happens asynchronously (fire-and-forget).
 */
export async function resolveReferences(cwd: string): Promise<ReferenceInfo[]> {
   const sources = await readReferences(cwd);
   const infos: ReferenceInfo[] = [];

   for (const [alias, source] of sources) {
      const info = resolveOne(alias, source);
      if (info) infos.push(info);
   }

   return infos;
}

function resolveOne(name: string, source: Source): ReferenceInfo | null {
   if (source.type === "local") {
      return {
         name,
         path: source.path,
         description: source.description,
         hidden: source.hidden,
         source,
      };
   }

   // Git: compute cache path immediately, clone async
   const cachePath = ensureRepo(source.repository, source.branch);
   if (!cachePath) return null;

   return {
      name,
      path: cachePath,
      description: source.description,
      hidden: source.hidden,
      source,
   };
}

/** Check if a reference path exists on disk. */
export function referenceExists(info: ReferenceInfo): boolean {
   return existsSync(info.path);
}
