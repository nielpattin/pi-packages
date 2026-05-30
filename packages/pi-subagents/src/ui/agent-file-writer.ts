/**
 * agent-file-writer.ts — Shared overwrite-guard + write + reload + notify helper.
 *
 * Extracted from AgentConfigEditor.ejectAgent and AgentCreationWizard.showManualWizard
 * to eliminate the duplicated 20-line pattern. Uses narrow interfaces (ISP) so callers
 * are not forced to depend on the full AgentFileOps or MenuUI shapes.
 */

// ---- Narrow interfaces ----

/** Minimal file operations needed by the overwrite-guard-and-write pattern. */
export interface FileWriter {
   exists(filePath: string): boolean;
   write(filePath: string, content: string): void;
}

/** Minimal UI needed by the overwrite-guard-and-write pattern. */
export interface WriterUI {
   confirm(title: string, message: string): Promise<boolean>;
   notify(message: string, level: "info" | "warning" | "error"): void;
}

/** Registry that can be reloaded after file changes. */
export interface Reloadable {
   reload(): void;
}

// ---- Function ----

/**
 * Write an agent `.md` file with an overwrite guard.
 *
 * If `targetPath` already exists, prompts the user for confirmation before writing.
 * On write: reloads the registry and notifies the user as `"${label} ${targetPath}"`.
 *
 * Returns `true` if the file was written, `false` if the user declined to overwrite.
 */
export async function writeAgentFile(
   fileOps: FileWriter,
   ui: WriterUI,
   registry: Reloadable,
   targetPath: string,
   content: string,
   label: string,
): Promise<boolean> {
   if (fileOps.exists(targetPath)) {
      const overwrite = await ui.confirm("Overwrite", `${targetPath} already exists. Overwrite?`);
      if (!overwrite) return false;
   }

   fileOps.write(targetPath, content);
   registry.reload();
   ui.notify(`${label} ${targetPath}`, "info");
   return true;
}
