import {
   type EmbeddingFeatures,
   registerProjectEmbeddingAndMaybeWipe
} from "#core/features/magic-context/memory/embedding";
import { resolveProjectIdentity } from "#core/features/magic-context/memory/project-identity";
import type { ContextDatabase } from "#core/features/magic-context/storage";
import { handleUntrustedLoad, isConfigLoadUntrusted } from "#core/plugin/embedding-bootstrap-helpers";
import { loadPiConfigDetailed } from "./config";

export async function ensureProjectRegisteredFromPiDirectory(directory: string, db: ContextDatabase): Promise<void> {
   const projectIdentity = resolveProjectIdentity(directory);

   const detailed = loadPiConfigDetailed({ cwd: directory });
   if (isConfigLoadUntrusted(detailed)) {
      handleUntrustedLoad(db, projectIdentity, directory, detailed);
      return;
   }

   const features: EmbeddingFeatures = {
      memoryEnabled: detailed.config.memory.enabled,
      gitCommitEnabled: detailed.config.experimental.git_commit_indexing.enabled
   };
   registerProjectEmbeddingAndMaybeWipe(db, projectIdentity, detailed.config.embedding, features, directory);
}
