import type { ReferenceInfo } from "./types.js";

/**
 * Build the XML guidance block for the system prompt.
 * Only references WITH a description are included.
 * Returns empty string if no references have descriptions.
 */
export function buildReferenceGuidance(references: ReferenceInfo[]): string {
   const visible = references.filter((r) => r.description && !r.hidden);
   if (visible.length === 0) return "";

   const entries = visible
      .map(
         (r) =>
            `  <reference>\n` +
            `    <name>${escapeXml(r.name)}</name>\n` +
            `    <path>${escapeXml(r.path)}</path>\n` +
            `    <description>${escapeXml(r.description!)}</description>\n` +
            `  </reference>`,
      )
      .join("\n");

   return (
      `<project_references>\n` +
      `The following project references provide additional directories accessible when relevant.\n` +
      `${entries}\n` +
      `</project_references>`
   );
}

function escapeXml(s: string): string {
   return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
}
